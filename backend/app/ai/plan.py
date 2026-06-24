"""Piano AI come azione separata dalla creazione diretta (principio #7).

Il kernel espone "preview/plan" distinto dall'esecuzione: un `Plan` è una lista di
`Operation` proposte, ispezionabili prima di toccare il modello. È ciò che rende
possibile la Plan Mode (RF-5.6) — e, per riuso, anche la modalità Assistita
(esecuzione un'operazione alla volta).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class OperationType(str, Enum):
    CREATE_COMPONENT = "create_component"
    SET_PARAMETER = "set_parameter"
    ATTACH = "attach"
    DELETE = "delete"


@dataclass(frozen=True)
class Operation:
    type: OperationType
    args: dict[str, Any] = field(default_factory=dict)
    rationale: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {"type": self.type.value, "args": self.args, "rationale": self.rationale}


@dataclass(frozen=True)
class Plan:
    command: str
    operations: tuple[Operation, ...] = ()
    rationale: str = ""

    def is_empty(self) -> bool:
        return not self.operations

    def to_dict(self) -> dict[str, Any]:
        return {
            "command": self.command,
            "rationale": self.rationale,
            "operations": [op.to_dict() for op in self.operations],
        }
