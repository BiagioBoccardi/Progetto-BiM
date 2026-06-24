from __future__ import annotations

from app.ai.assistant import DesignAssistant
from app.ai.autonomy import AutonomyMode


def test_plan_mode_does_not_mutate_model(model):
    before = len(model.components)
    result = DesignAssistant().handle("aggiungi un balcone", model, AutonomyMode.PLAN)
    assert result.applied is False
    assert len(result.plan.operations) == 1
    assert len(model.components) == before  # nessuna creazione finché non si approva


def test_automatic_mode_applies_immediately(model):
    before = len(model.components)
    result = DesignAssistant().handle(
        "aggiungi un balcone", model, AutonomyMode.AUTOMATIC
    )
    assert result.applied is True
    assert len(model.components) == before + 1
    new_balcony = next(c for c in model.components.values() if c.type == "BalconyTypeA")
    # Il nuovo componente è agganciato al muro (RF-3.2/RF-3.3) e validato.
    assert new_balcony.parent == "Wall_001"
    model.validate_hierarchy()


def test_assisted_mode_returns_plan_without_applying(model):
    before = len(model.components)
    result = DesignAssistant().handle(
        "aggiungi una finestra", model, AutonomyMode.ASSISTED
    )
    assert result.applied is False
    assert len(model.components) == before


def test_plan_then_apply_executes_approved_plan(model):
    assistant = DesignAssistant()
    planned = assistant.handle("aggiungi un balcone", model, AutonomyMode.PLAN)
    before = len(model.components)
    affected = assistant.apply(planned.plan, model)
    assert len(model.components) == before + 1
    assert affected  # ha rigenerato il nuovo componente
