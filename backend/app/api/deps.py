"""Dipendenze condivise: store dei profili, registro, motore, regole, assistant.

Store in-memory: il documento è esplicito nel NON persistere mesh; in questa fase
non serve un DB. La persistenza dei *profili* (lista di Component Instance) potrà
essere aggiunta dietro questa stessa interfaccia.
"""
from __future__ import annotations

from ..ai.assistant import DesignAssistant
from ..blender_jobs.headless_engine import StubHeadlessEngine
from ..config import settings
from ..kernel.model import BuildingModel
from ..kernel.registry import DefinitionRegistry, default_registry
from ..rules.engine import RuleEngine, RuleSet


class ProfileStore:
    def __init__(self) -> None:
        self._profiles: dict[str, BuildingModel] = {}

    def save(self, model: BuildingModel) -> None:
        self._profiles[model.profile_id] = model

    def get(self, profile_id: str) -> BuildingModel | None:
        return self._profiles.get(profile_id)

    def ids(self) -> list[str]:
        return sorted(self._profiles)


# Singletons di processo (monolite con confini interni puliti, sezione 5).
_store = ProfileStore()
_registry = default_registry()
_engine = StubHeadlessEngine()
_assistant = DesignAssistant()


def get_store() -> ProfileStore:
    return _store


def get_registry() -> DefinitionRegistry:
    return _registry


def get_engine() -> StubHeadlessEngine:
    return _engine


def get_assistant() -> DesignAssistant:
    return _assistant


def get_rule_engine() -> RuleEngine:
    return RuleEngine(RuleSet.from_file(settings.default_ruleset_path))
