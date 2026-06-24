from __future__ import annotations

from app.rules.engine import RuleEngine, RuleSet


def _ruleset() -> RuleSet:
    return RuleSet.from_dict(
        {
            "ruleset": "test",
            "rules": [
                {
                    "id": "wall-min-thickness",
                    "selector": {"tag": "wall"},
                    "assert": {"parameter": "thickness", "op": ">=", "value": 0.1},
                    "severity": "error",
                    "message": "muro troppo sottile",
                }
            ],
        }
    )


def test_rules_are_loaded_from_config_not_hardcoded(model):
    engine = RuleEngine(_ruleset())
    assert engine.evaluate(model) == []  # spessore 0.25 >= 0.10 → nessuna violazione


def test_violation_detected_when_assertion_fails(model):
    model.get("Wall_001").set_parameter("thickness", 0.05)
    engine = RuleEngine(_ruleset())
    violations = engine.evaluate(model)
    assert len(violations) == 1
    assert violations[0].rule_id == "wall-min-thickness"
    assert violations[0].component_id == "Wall_001"


def test_relation_based_rule(model):
    ruleset = RuleSet.from_dict(
        {
            "ruleset": "rel",
            "rules": [
                {
                    "id": "wall-on-structure",
                    "selector": {"tag": "wall"},
                    "assert": {
                        "relation": "parent_category",
                        "op": "==",
                        "value": "Structure",
                    },
                }
            ],
        }
    )
    assert RuleEngine(ruleset).evaluate(model) == []
