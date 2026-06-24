from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import sample_profile


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def created(client) -> dict:
    response = client.post("/api/profiles", json=sample_profile())
    assert response.status_code == 201
    return response.json()


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_create_and_get_profile(client, created):
    profile_id = created["profileId"]
    got = client.get(f"/api/profiles/{profile_id}")
    assert got.status_code == 200
    assert got.json()["profileId"] == profile_id


def test_create_profile_rejects_broken_hierarchy(client):
    bad = sample_profile()
    bad["components"][2]["parent"] = None
    bad["components"][1]["children"] = []
    assert client.post("/api/profiles", json=bad).status_code == 422


def test_set_parameter_triggers_cascade(client, created):
    pid = created["profileId"]
    resp = client.patch(
        f"/api/profiles/{pid}/components/Beam_001/parameters/length",
        json={"value": 8.0},
    )
    assert resp.status_code == 200
    assert "Wall_001" in resp.json()["regenerated"]


def test_validate_endpoint(client, created):
    pid = created["profileId"]
    resp = client.post(f"/api/profiles/{pid}/validate")
    assert resp.status_code == 200
    assert resp.json()["ruleset"]


def test_export_ifc_mapping(client, created):
    pid = created["profileId"]
    resp = client.post(f"/api/profiles/{pid}/export/ifc")
    body = resp.json()
    assert body["schema"] == "IFC4"
    classes = {e["ifcClass"] for e in body["elements"]}
    assert {"IfcColumn", "IfcBeam", "IfcWall"} <= classes


def test_ai_plan_mode_endpoint_does_not_apply(client, created):
    pid = created["profileId"]
    resp = client.post(
        f"/api/profiles/{pid}/ai", json={"command": "aggiungi un balcone", "mode": "plan"}
    )
    body = resp.json()
    assert body["applied"] is False
    assert body["plan"]["operations"]
    # Il profilo non è cambiato.
    assert "profile" not in body


def test_ai_automatic_mode_endpoint_applies(client, created):
    pid = created["profileId"]
    resp = client.post(
        f"/api/profiles/{pid}/ai",
        json={"command": "aggiungi un balcone", "mode": "automatic"},
    )
    body = resp.json()
    assert body["applied"] is True
    assert any(
        c["type"] == "BalconyTypeA" for c in body["profile"]["components"]
    )
