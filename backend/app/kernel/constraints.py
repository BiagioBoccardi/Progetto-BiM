"""Vincoli tipizzati minimali.

I `constraints` di un Component sono una lista di oggetti tipizzati semplici
(``{ "type": "attached_to_parent" }``), eventualmente con parametri specifici del
tipo — mai logica condizionale annidata (vincolo di schema del documento).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping


@dataclass(frozen=True)
class Constraint:
    type: str
    params: Mapping[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        # Serializzazione coerente con la sezione 9: { "type": ..., <params> }
        return {"type": self.type, **dict(self.params)}

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "Constraint":
        rest = {k: v for k, v in data.items() if k != "type"}
        return cls(type=data["type"], params=rest)


# Tipi di vincolo noti al kernel. Non è un enum chiuso: il campo `type` resta una
# stringa libera per non bloccare l'estensione della libreria (RNF-5.1).
ATTACHED_TO_PARENT = "attached_to_parent"
HORIZONTAL = "horizontal"
VERTICAL = "vertical"
INSIDE_FACADE = "inside_facade"
