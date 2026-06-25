"""Dipendenze condivise: store dei profili, registro, motore, regole, assistant."""
from __future__ import annotations

from ..ai.assistant import DesignAssistant
from ..blender_jobs.headless_engine import StubHeadlessEngine
from ..config import settings
from ..db import db_delete_profile, db_get_profile, db_list_profiles, db_save_profile
from ..kernel.model import BuildingModel
from ..kernel.registry import DefinitionRegistry, default_registry
from ..rules.engine import RuleEngine, RuleSet


class ProfileStore:
    def save(self, model: BuildingModel, canvas_data: dict | None = None) -> dict:
        data = model.to_dict()
        if canvas_data:
            by_id = canvas_data
            for comp in data.get("components", []):
                cv = by_id.get(comp["id"])
                if cv:
                    comp["canvasData"] = cv
        db_save_profile(model.profile_id, data)
        return data

    def get(self, profile_id: str) -> BuildingModel | None:
        data = db_get_profile(profile_id)
        if data is None:
            return None
        registry = default_registry()
        engine = StubHeadlessEngine()
        return BuildingModel.from_dict(data, engine=engine, registry=registry, validate_hierarchy=False)

    def get_raw(self, profile_id: str) -> dict | None:
        return db_get_profile(profile_id)

    def ids(self) -> list[str]:
        return db_list_profiles()

    def delete(self, profile_id: str) -> bool:
        return db_delete_profile(profile_id)


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
