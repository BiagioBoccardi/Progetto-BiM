"""Component Instance — l'entità viva del kernel.

Principio non negoziabile #3 / RNF-1.2: un Component NON è un JSON. È un'entità con
identità, stato, comportamento (metodi), comunicazione (eventi) e relazioni. Il
dict prodotto da `to_dict()` è soltanto la sua serializzazione (sezione 9).
"""
from __future__ import annotations

from typing import Any, Mapping

from .component_definition import ComponentDefinition
from .constraints import ATTACHED_TO_PARENT, Constraint
from .events import Event, EventBus
from .value_objects import BimMapping, Connector, GeometryRef, Semantic


class Component:
    def __init__(
        self,
        component_id: str,
        definition: ComponentDefinition,
        parameters: Mapping[str, float] | None = None,
        connectors: Mapping[str, str] | None = None,
        parent: str | None = None,
        constraints: tuple[Constraint, ...] | None = None,
        semantic: Semantic | None = None,
        event_bus: EventBus | None = None,
    ) -> None:
        self.id = component_id
        self.definition = definition
        self._parameters = definition.validate_parameters(dict(parameters or {}))
        self._connectors: dict[str, Connector] = {
            name: Connector(name, target) for name, target in (connectors or {}).items()
        }
        self.parent = parent
        self.children: list[str] = []
        self.constraints: list[Constraint] = list(
            constraints if constraints is not None else definition.default_constraints
        )
        self.semantic = semantic or definition.default_semantic
        self._event_bus = event_bus
        # Marcatore di rigenerazione: un componente appena creato o con un
        # parametro a monte modificato è "dirty" finché il motore non lo rigenera.
        self._dirty = True

    # --- identità / proiezioni di sola lettura ------------------------------
    @property
    def type(self) -> str:
        return self.definition.type

    @property
    def category(self) -> str:
        return self.definition.category

    @property
    def geometry(self) -> GeometryRef:
        # Solo il riferimento al generatore, mai la mesh.
        return self.definition.geometry

    @property
    def bim(self) -> BimMapping:
        return self.definition.bim

    @property
    def parameters(self) -> dict[str, float]:
        return dict(self._parameters)

    @property
    def connectors(self) -> dict[str, str]:
        return {name: c.target for name, c in self._connectors.items()}

    @property
    def is_dirty(self) -> bool:
        return self._dirty

    def connector_objects(self) -> list[Connector]:
        return list(self._connectors.values())

    def available_actions(self) -> tuple[str, ...]:
        return self.definition.actions

    # --- comportamento ------------------------------------------------------
    def set_parameter(self, name: str, value: float) -> float:
        """Modifica un parametro (RF-6.2). Valida, marca dirty, emette evento.

        Non rigenera da solo: la rigenerazione a cascata è responsabilità del
        `BuildingModel`, che conosce i discendenti vincolati (RF-4.3).
        """
        spec = self.definition.parameter_spec(name)
        old = self._parameters.get(name)
        new = spec.validate(value)
        self._parameters[name] = new
        self.mark_dirty()
        self.emit("parameter_changed", {"parameter": name, "old": old, "new": new})
        return new

    def get_parameter(self, name: str) -> float:
        return self._parameters[name]

    def add_connector(self, name: str, target: str) -> None:
        """Aggiunge un aggancio relazionale (RF-4.2)."""
        self._connectors[name] = Connector(name, target)
        self.mark_dirty()
        self.emit("connector_added", {"name": name, "target": target})

    def add_constraint(self, constraint: Constraint) -> None:
        self.constraints.append(constraint)
        self.mark_dirty()
        self.emit("constraint_added", {"type": constraint.type})

    def attach_to(self, parent: "Component", connector_name: str = "hostStructure") -> None:
        """Aggancia questo componente a un parent, a valle nella gerarchia.

        Stabilisce sia la relazione `parent` (RF-3.3) sia un Connector relazionale
        e il vincolo `attached_to_parent` (RF-3.2). La validazione gerarchica
        completa (risalita fino alla struttura) è del `BuildingModel`.
        """
        if not self.definition.can_have_parent_category(parent.category):
            raise ValueError(
                f"'{self.type}' ({self.category}) non può agganciarsi a "
                f"'{parent.type}' ({parent.category})"
            )
        self.parent = parent.id
        self.add_connector(connector_name, parent.id)
        if not any(c.type == ATTACHED_TO_PARENT for c in self.constraints):
            self.add_constraint(Constraint(ATTACHED_TO_PARENT))
        self.emit("attached", {"parent": parent.id})

    def mark_dirty(self) -> None:
        self._dirty = True

    def mark_clean(self) -> None:
        self._dirty = False

    def emit(self, name: str, payload: dict[str, Any] | None = None) -> None:
        if self._event_bus is not None:
            self._event_bus.emit(Event(name=name, source_id=self.id, payload=payload or {}))

    def bind_event_bus(self, event_bus: EventBus) -> None:
        self._event_bus = event_bus

    # --- serializzazione (il JSON è solo una proiezione) --------------------
    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "category": self.category,
            "parameters": self.parameters,
            "connectors": self.connectors,
            "parent": self.parent,
            "children": list(self.children),
            "constraints": [c.to_dict() for c in self.constraints],
            "geometry": self.geometry.to_dict(),
            "bim": self.bim.to_dict(),
            "semantic": self.semantic.to_dict(),
        }

    @classmethod
    def from_dict(
        cls,
        data: Mapping[str, Any],
        definition: ComponentDefinition,
        event_bus: EventBus | None = None,
    ) -> "Component":
        constraints = tuple(
            Constraint.from_dict(c) for c in data.get("constraints", ())
        )
        semantic = (
            Semantic.from_dict(data["semantic"]) if "semantic" in data else None
        )
        component = cls(
            component_id=data["id"],
            definition=definition,
            parameters=data.get("parameters"),
            connectors=data.get("connectors"),
            parent=data.get("parent"),
            constraints=constraints,
            semantic=semantic,
            event_bus=event_bus,
        )
        return component

    def __repr__(self) -> str:  # pragma: no cover - diagnostica
        return f"Component(id={self.id!r}, type={self.type!r}, parent={self.parent!r})"
