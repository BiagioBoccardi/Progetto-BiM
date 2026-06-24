"""Endpoint AI: piano/preview (separato) ed esecuzione del piano approvato."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..ai.assistant import DesignAssistant
from ..ai.plan import Operation, OperationType, Plan
from .deps import ProfileStore, get_assistant, get_store
from .schemas import AICommandDTO, PlanApplyDTO

router = APIRouter(prefix="/api/profiles/{profile_id}/ai", tags=["ai"])


@router.post("")
def handle_command(
    profile_id: str,
    body: AICommandDTO,
    store: ProfileStore = Depends(get_store),
    assistant: DesignAssistant = Depends(get_assistant),
) -> dict:
    """Interpreta un comando secondo la modalità di autonomia (RF-5.6).

    - PLAN/ASSISTED: restituisce il piano SENZA applicarlo (serve approvazione).
    - AUTOMATIC: applica subito e restituisce gli id rigenerati.
    """
    model = _require(store, profile_id)
    result = assistant.handle(body.command, model, body.mode)
    payload = result.to_dict()
    if result.applied:
        payload["profile"] = model.to_dict()
    return payload


@router.post("/apply")
def apply_plan(
    profile_id: str,
    body: PlanApplyDTO,
    store: ProfileStore = Depends(get_store),
    assistant: DesignAssistant = Depends(get_assistant),
) -> dict:
    """Applica un piano approvato (Plan Mode: esecuzione dopo approvazione)."""
    model = _require(store, profile_id)
    try:
        operations = tuple(
            Operation(type=OperationType(op["type"]), args=op.get("args", {}))
            for op in body.operations
        )
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"Piano non valido: {exc}") from exc
    affected = assistant.apply(Plan(command=body.command, operations=operations), model)
    return {"applied": True, "affected": affected, "profile": model.to_dict()}


def _require(store: ProfileStore, profile_id: str):
    model = store.get(profile_id)
    if model is None:
        raise HTTPException(status_code=404, detail="Profilo non trovato")
    return model
