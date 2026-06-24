"""DTO Pydantic — la *serializzazione* del Component Schema (RNF-1.2).

Questi modelli definiscono il contratto HTTP/OpenAPI e validano l'input; non sono
il dominio. Il dominio sono le entità del kernel: questi DTO vi si traducono.
I campi seguono la sezione 9 (camelCase per `generatorVersion`, `ifcClass`).
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from ..ai.autonomy import AutonomyMode


class GeometryRefDTO(BaseModel):
    generator: str
    generatorVersion: str = "1.0"


class BimDTO(BaseModel):
    ifcClass: str


class SemanticDTO(BaseModel):
    tags: list[str] = Field(default_factory=list)


class ComponentInstanceDTO(BaseModel):
    id: str
    type: str
    category: str
    parameters: dict[str, float] = Field(default_factory=dict)
    connectors: dict[str, str] = Field(default_factory=dict)
    parent: str | None = None
    children: list[str] = Field(default_factory=list)
    constraints: list[dict[str, Any]] = Field(default_factory=list)
    geometry: GeometryRefDTO
    bim: BimDTO
    semantic: SemanticDTO = Field(default_factory=SemanticDTO)


class ProfileDTO(BaseModel):
    profileId: str
    components: list[ComponentInstanceDTO] = Field(default_factory=list)


class ParameterChangeDTO(BaseModel):
    value: float


class AICommandDTO(BaseModel):
    command: str
    mode: AutonomyMode = AutonomyMode.PLAN


class PlanApplyDTO(BaseModel):
    """Applicazione di un piano approvato (Plan Mode)."""

    command: str
    operations: list[dict[str, Any]] = Field(default_factory=list)
