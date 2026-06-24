"""Intent Interpreter (RF-5.1): linguaggio naturale → operazioni strutturate.

In produzione questo modulo invocherebbe un LLM con function-calling (SDK
Python-first, sezione 5) per tradurre il comando dell'utente in un `Plan`. Qui
forniamo un interprete a regole, deterministico e testabile, con la **stessa
interfaccia**: `interpret(command, model) -> Plan`. Sostituirlo con un backend LLM
non cambia il resto del sistema.

Nota: l'interprete produce solo un *piano*; non tocca il modello. L'esecuzione (o
meno) dipende dalla modalità di autonomia, gestita da `DesignAssistant`.
"""
from __future__ import annotations

import re
from typing import Mapping

from ..kernel.component_definition import ARCHITECTURE, COMPONENT
from ..kernel.model import BuildingModel
from .plan import Operation, OperationType, Plan

# Mappa keyword → tipo di componente. Estendibile via configurazione (RNF-5.1).
_KEYWORD_TO_TYPE: Mapping[str, str] = {
    "balcone": "BalconyTypeA",
    "balcony": "BalconyTypeA",
    "finestra": "WindowTypeA",
    "window": "WindowTypeA",
    "porta": "DoorTypeA",
    "door": "DoorTypeA",
}


class IntentInterpreter:
    def interpret(self, command: str, model: BuildingModel) -> Plan:
        text = command.lower().strip()

        component_type = self._match_component_type(text)
        if component_type is not None:
            return self._plan_add_component(command, text, component_type, model)

        resize = self._match_resize(text)
        if resize is not None:
            return self._plan_resize(command, text, resize, model)

        return Plan(command=command, operations=(), rationale="Comando non riconosciuto.")

    # --- creazione componente ----------------------------------------------
    @staticmethod
    def _match_component_type(text: str) -> str | None:
        for keyword, type_name in _KEYWORD_TO_TYPE.items():
            if keyword in text:
                return type_name
        return None

    def _plan_add_component(
        self, command: str, text: str, component_type: str, model: BuildingModel
    ) -> Plan:
        host = self._pick_host(model)
        if host is None:
            return Plan(
                command=command,
                operations=(),
                rationale=(
                    "Nessun muro (Architecture) disponibile a cui agganciare il "
                    "componente: disegnare prima struttura e muri."
                ),
            )
        count = 1 + sum(1 for c in model.components.values() if c.type == component_type)
        new_id = f"{component_type.replace('TypeA', '')}_{count:03d}"
        op = Operation(
            type=OperationType.CREATE_COMPONENT,
            args={
                "id": new_id,
                "type": component_type,
                "parent": host.id,
                "connector": "hostWall",
                "connector_target": f"{host.id}:lateral_face_center",
            },
            rationale=f"Interpreto '{command}' come aggiunta di {component_type} su {host.id}.",
        )
        return Plan(command=command, operations=(op,), rationale=op.rationale)

    @staticmethod
    def _pick_host(model: BuildingModel) -> "object | None":
        # Interpretazione semantica minima (RF-5.5): aggancia i componenti ai muri.
        for component in model.components.values():
            if component.category == ARCHITECTURE:
                return component
        return None

    # --- modifica parametro -------------------------------------------------
    @staticmethod
    def _match_resize(text: str) -> tuple[str, float] | None:
        # Esempi: "rendi il balcone più profondo a 2.0", "set depth 2.0"
        match = re.search(r"(width|depth|height|length|thickness)\D+([0-9]+(?:\.[0-9]+)?)", text)
        if match:
            return match.group(1), float(match.group(2))
        return None

    def _plan_resize(
        self, command: str, text: str, resize: tuple[str, float], model: BuildingModel
    ) -> Plan:
        param, value = resize
        target = next(
            (c for c in model.components.values() if param in c.parameters),
            None,
        )
        if target is None:
            return Plan(command=command, operations=(), rationale="Nessun target con quel parametro.")
        op = Operation(
            type=OperationType.SET_PARAMETER,
            args={"id": target.id, "parameter": param, "value": value},
            rationale=f"Imposto {param}={value} su {target.id}.",
        )
        return Plan(command=command, operations=(op,), rationale=op.rationale)
