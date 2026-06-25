"""Endpoint dei profili: creazione, lettura, modifica parametri, validazione, IFC."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..kernel.component_definition import ParameterError
from ..kernel.model import BuildingModel, HierarchyError
from ..rules.engine import RuleEngine
from .deps import (
    ProfileStore,
    get_engine,
    get_registry,
    get_rule_engine,
    get_store,
)
from .schemas import ParameterChangeDTO, ProfileDTO

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.post("", status_code=201)
def create_profile(
    profile: ProfileDTO,
    store: ProfileStore = Depends(get_store),
    registry=Depends(get_registry),
    engine=Depends(get_engine),
) -> dict:
    try:
        model = BuildingModel.from_dict(
            profile.model_dump(), engine=engine, registry=registry,
            validate_hierarchy=False,
        )
    except (HierarchyError, ParameterError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    canvas_data = {c["id"]: c.get("canvasData") for c in profile.model_dump()["components"] if c.get("canvasData")}
    return store.save(model, canvas_data=canvas_data)


@router.get("")
def list_profiles(store: ProfileStore = Depends(get_store)) -> dict:
    return {"profiles": store.ids()}


@router.get("/{profile_id}")
def get_profile(profile_id: str, store: ProfileStore = Depends(get_store)) -> dict:
    data = store.get_raw(profile_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Profilo non trovato")
    return data


@router.patch("/{profile_id}/components/{component_id}/parameters/{name}")
def set_parameter(
    profile_id: str,
    component_id: str,
    name: str,
    change: ParameterChangeDTO,
    store: ProfileStore = Depends(get_store),
) -> dict:
    model = _require(store, profile_id)
    try:
        regenerated = model.set_parameter(component_id, name, change.value)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"regenerated": regenerated, "profile": model.to_dict()}


@router.post("/{profile_id}/validate")
def validate_profile(
    profile_id: str,
    store: ProfileStore = Depends(get_store),
    rule_engine: RuleEngine = Depends(get_rule_engine),
) -> dict:
    model = _require(store, profile_id)
    violations = rule_engine.evaluate(model)
    return {
        "ruleset": rule_engine.ruleset.name,
        "violations": [
            {
                "rule": v.rule_id,
                "component": v.component_id,
                "severity": v.severity,
                "message": v.message,
            }
            for v in violations
        ],
    }


@router.post("/{profile_id}/export/ifc")
def export_ifc(profile_id: str, store: ProfileStore = Depends(get_store)) -> dict:
    model = _require(store, profile_id)
    return model.export_ifc()


@router.delete("/{profile_id}", status_code=200)
def delete_profile(profile_id: str, store: ProfileStore = Depends(get_store)) -> dict:
    if not store.delete(profile_id):
        raise HTTPException(status_code=404, detail="Profilo non trovato")
    return {"deleted": profile_id}


def _require(store: ProfileStore, profile_id: str) -> BuildingModel:
    model = store.get(profile_id)
    if model is None:
        raise HTTPException(status_code=404, detail="Profilo non trovato")
    return model
