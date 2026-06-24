"""Design Assistant: orchestra interpretazione, piano ed esecuzione per modalità.

Mette in pratica RF-5.6 / principio #7 tenendo SEPARATE due azioni:
- `plan(command)`  → produce sempre un Plan, senza mai toccare il modello;
- `apply(plan)`    → esegue le operazioni sul modello.

La modalità di autonomia decide come si combinano:
- AUTOMATIC: si pianifica e si applica tutto subito;
- ASSISTED:  si pianifica; il chiamante applica un'operazione alla volta (conferme);
- PLAN:      si pianifica e basta; l'applicazione avviene solo dopo approvazione.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..kernel.component import Component
from ..kernel.model import BuildingModel
from .autonomy import AutonomyMode
from .intent import IntentInterpreter
from .plan import Operation, OperationType, Plan


@dataclass
class AssistantResult:
    mode: AutonomyMode
    plan: Plan
    applied: bool
    affected: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "mode": self.mode.value,
            "applied": self.applied,
            "affected": self.affected,
            "plan": self.plan.to_dict(),
        }


class UnknownOperationError(ValueError):
    pass


class DesignAssistant:
    def __init__(self, interpreter: IntentInterpreter | None = None) -> None:
        self.interpreter = interpreter or IntentInterpreter()

    def handle(
        self, command: str, model: BuildingModel, mode: AutonomyMode
    ) -> AssistantResult:
        plan = self.interpreter.interpret(command, model)
        # Plan Mode e Assistita NON eseguono qui: serve approvazione/conferma.
        if mode in (AutonomyMode.PLAN, AutonomyMode.ASSISTED) or plan.is_empty():
            return AssistantResult(mode=mode, plan=plan, applied=False)
        affected = self.apply(plan, model)
        return AssistantResult(mode=mode, plan=plan, applied=True, affected=affected)

    def apply(self, plan: Plan, model: BuildingModel) -> list[str]:
        """Esegue un piano approvato. Usato sia da AUTOMATIC sia dopo approvazione."""
        affected: list[str] = []
        for op in plan.operations:
            affected.extend(self._apply_operation(op, model))
        return affected

    # --- esecuzione singola operazione (riuso per modalità Assistita) -------
    def _apply_operation(self, op: Operation, model: BuildingModel) -> list[str]:
        if op.type is OperationType.CREATE_COMPONENT:
            return self._create_component(op, model)
        if op.type is OperationType.SET_PARAMETER:
            return model.set_parameter(
                op.args["id"], op.args["parameter"], op.args["value"]
            )
        if op.type is OperationType.ATTACH:
            child = model.get(op.args["id"])
            parent = model.get(op.args["parent"])
            child.attach_to(parent, op.args.get("connector", "hostStructure"))
            return model.regenerate(changed_id=child.id)
        if op.type is OperationType.DELETE:
            model.components.pop(op.args["id"], None)
            return []
        raise UnknownOperationError(f"Operazione non gestita: {op.type}")

    @staticmethod
    def _create_component(op: Operation, model: BuildingModel) -> list[str]:
        definition = model.registry.get(op.args["type"])
        if definition is None:
            raise UnknownOperationError(f"Tipo sconosciuto: {op.args['type']}")
        parent = model.get(op.args["parent"])
        component = Component(
            component_id=op.args["id"],
            definition=definition,
            event_bus=model.event_bus,
        )
        model.add(component)
        component.attach_to(parent, op.args.get("connector", "hostStructure"))
        # Connector relazionale verso un anchor del parent (RF-4.2).
        if "connector_target" in op.args:
            component.add_connector(
                op.args.get("connector", "hostStructure"), op.args["connector_target"]
            )
        model.validate_hierarchy()
        return model.regenerate(changed_id=component.id)
