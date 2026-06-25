"""Endpoint di autenticazione: registrazione e login."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..db import db_create_user, db_get_user_by_username

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterDTO(BaseModel):
    username: str
    password: str


class LoginDTO(BaseModel):
    username: str
    password: str


def _make_token(user_id: int, username: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


@router.post("/register", status_code=201)
def register(body: RegisterDTO) -> dict:
    if len(body.username.strip()) < 3:
        raise HTTPException(status_code=422, detail="Username troppo corto (min 3 caratteri)")
    if len(body.password) < 6:
        raise HTTPException(status_code=422, detail="Password troppo corta (min 6 caratteri)")
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user = db_create_user(body.username.strip(), hashed)
    if user is None:
        raise HTTPException(status_code=409, detail="Username già in uso")
    return {"message": "Registrazione completata", "username": user["username"]}


@router.post("/login")
def login(body: LoginDTO) -> dict:
    user = db_get_user_by_username(body.username.strip())
    if user is None or not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    token = _make_token(user["id"], user["username"])
    return {"access_token": token, "token_type": "bearer", "username": user["username"]}
