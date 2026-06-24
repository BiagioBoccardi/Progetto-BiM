"""Configurazione applicativa via pydantic-settings."""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_RULESET = (
    Path(__file__).resolve().parent / "rules" / "configs" / "example_rules.json"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="BIM_", env_file=".env", extra="ignore")

    app_name: str = "BIM AI Backend"
    allowed_origins: list[str] = ["http://localhost:5173"]
    default_ruleset_path: str = str(_DEFAULT_RULESET)


settings = Settings()
