"""Rule Assistant — motore di regole generico e configurabile (RF-5.4, sezione 10).

Principio non negoziabile #6: NESSUNA normativa hardcoded. Le regole sono
configurazione esterna dichiarativa (JSON). Il motore conosce solo come:
1. *selezionare* i componenti a cui una regola si applica (per categoria/tag/classe IFC);
2. *valutare* un'asserzione su "fatti" esposti dal kernel (parametri, relazioni).

Cambiare normativa = cambiare il file di configurazione, non il codice (RNF-1.1).
"""
from __future__ import annotations

import json
import operator
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Mapping

from ..kernel.model import BuildingModel

_OPERATORS: dict[str, Callable[[Any, Any], bool]] = {
    "==": operator.eq,
    "!=": operator.ne,
    ">": operator.gt,
    ">=": operator.ge,
    "<": operator.lt,
    "<=": operator.le,
    "in": lambda a, b: a in b,
    "not_in": lambda a, b: a not in b,
}


@dataclass(frozen=True)
class Violation:
    rule_id: str
    component_id: str
    severity: str
    message: str


@dataclass(frozen=True)
class Rule:
    id: str
    selector: Mapping[str, Any]
    assertion: Mapping[str, Any]
    severity: str = "error"
    message: str = ""
    description: str = ""

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "Rule":
        return cls(
            id=data["id"],
            selector=data.get("selector", {}),
            assertion=data["assert"],
            severity=data.get("severity", "error"),
            message=data.get("message", ""),
            description=data.get("description", ""),
        )


@dataclass(frozen=True)
class RuleSet:
    name: str
    rules: tuple[Rule, ...]

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "RuleSet":
        return cls(
            name=data.get("ruleset", "unnamed"),
            rules=tuple(Rule.from_dict(r) for r in data.get("rules", ())),
        )

    @classmethod
    def from_file(cls, path: str | Path) -> "RuleSet":
        return cls.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))


class RuleEngine:
    """Valuta un RuleSet contro un BuildingModel, restituendo le violazioni."""

    def __init__(self, ruleset: RuleSet) -> None:
        self.ruleset = ruleset

    def evaluate(self, model: BuildingModel) -> list[Violation]:
        violations: list[Violation] = []
        for component in model.components.values():
            facts = self._facts_for(model, component.id)
            for rule in self.ruleset.rules:
                if not self._selects(rule.selector, facts):
                    continue
                if not self._holds(rule.assertion, facts):
                    violations.append(
                        Violation(
                            rule_id=rule.id,
                            component_id=component.id,
                            severity=rule.severity,
                            message=rule.message
                            or f"Regola '{rule.id}' non soddisfatta",
                        )
                    )
        return violations

    # --- estrazione dei fatti dal kernel -----------------------------------
    @staticmethod
    def _facts_for(model: BuildingModel, component_id: str) -> dict[str, Any]:
        component = model.components[component_id]
        parent = (
            model.components.get(component.parent) if component.parent else None
        )
        return {
            "id": component.id,
            "type": component.type,
            "category": component.category,
            "ifc_class": component.bim.ifc_class,
            "tags": list(component.semantic.tags),
            "parameters": component.parameters,
            "parent_category": parent.category if parent else None,
            "parent_ifc_class": parent.bim.ifc_class if parent else None,
            "child_count": len(component.children),
            "connector_count": len(component.connectors),
        }

    # --- selezione ----------------------------------------------------------
    @staticmethod
    def _selects(selector: Mapping[str, Any], facts: Mapping[str, Any]) -> bool:
        for key, expected in selector.items():
            if key == "tag":
                if expected not in facts["tags"]:
                    return False
            elif key == "category":
                if facts["category"] != expected:
                    return False
            elif key == "ifc_class":
                if facts["ifc_class"] != expected:
                    return False
            elif key == "type":
                if facts["type"] != expected:
                    return False
            else:
                return False
        return True

    # --- valutazione asserzioni --------------------------------------------
    def _holds(self, assertion: Mapping[str, Any], facts: Mapping[str, Any]) -> bool:
        op_name = assertion.get("op", "==")
        op = _OPERATORS.get(op_name)
        if op is None:
            raise ValueError(f"Operatore di regola non supportato: '{op_name}'")
        actual = self._resolve_fact(assertion, facts)
        expected = assertion.get("value")
        return bool(op(actual, expected))

    @staticmethod
    def _resolve_fact(assertion: Mapping[str, Any], facts: Mapping[str, Any]) -> Any:
        if "parameter" in assertion:
            return facts["parameters"].get(assertion["parameter"])
        if "relation" in assertion:
            return facts.get(assertion["relation"])
        if "fact" in assertion:
            return facts.get(assertion["fact"])
        raise ValueError(
            "Asserzione priva di 'parameter', 'relation' o 'fact': "
            f"{dict(assertion)}"
        )
