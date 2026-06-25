"""Accesso PostgreSQL per la persistenza dei profili BIM."""
from __future__ import annotations

import json
from contextlib import contextmanager
from typing import Any

import psycopg2
import psycopg2.extras

from .config import settings

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS profiles (
    id   TEXT PRIMARY KEY,
    data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);
"""


def get_connection():
    return psycopg2.connect(settings.database_url)


def init_db() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(_CREATE_TABLE)
        conn.commit()


def db_save_profile(profile_id: str, data: dict[str, Any]) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO profiles (id, data) VALUES (%s, %s)
                ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
                """,
                (profile_id, json.dumps(data)),
            )
        conn.commit()


def db_get_profile(profile_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT data FROM profiles WHERE id = %s", (profile_id,))
            row = cur.fetchone()
    return dict(row["data"]) if row else None


def db_list_profiles() -> list[str]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM profiles ORDER BY id")
            return [r[0] for r in cur.fetchall()]


def db_create_user(username: str, password_hash: str) -> dict | None:
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "INSERT INTO users (username, password_hash) VALUES (%s, %s) RETURNING id, username",
                    (username, password_hash),
                )
                row = cur.fetchone()
            conn.commit()
        return dict(row) if row else None
    except psycopg2.errors.UniqueViolation:
        return None


def db_get_user_by_username(username: str) -> dict | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id, username, password_hash FROM users WHERE username = %s", (username,))
            row = cur.fetchone()
    return dict(row) if row else None


def db_delete_profile(profile_id: str) -> bool:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM profiles WHERE id = %s RETURNING id", (profile_id,))
            deleted = cur.fetchone() is not None
        conn.commit()
    return deleted
