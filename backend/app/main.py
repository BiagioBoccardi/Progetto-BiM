"""Applicazione FastAPI del backend BIM AI.

Monolite con confini interni puliti (sezione 5): l'app espone il kernel via API,
ma kernel, motore geometrico (`blender_jobs`), regole e AI restano moduli isolati.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import ai_router, profiles_router
from .config import settings

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profiles_router)
app.include_router(ai_router)


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "app": settings.app_name}


@app.get("/", tags=["meta"])
def root() -> dict:
    return {
        "name": settings.app_name,
        "docs": "/docs",
        "endpoints": ["/api/profiles", "/api/profiles/{id}/ai"],
    }
