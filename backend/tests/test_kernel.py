from __future__ import annotations

import pytest

from app.kernel.component_definition import ParameterError
from app.kernel.value_objects import Connector


def test_serialization_roundtrip_preserves_schema(model, profile_data):
    """to_dict() produce esattamente lo schema di sezione 9 (campi camelCase)."""
    dumped = model.to_dict()
    assert dumped["profileId"] == profile_data["profileId"]
    wall = next(c for c in dumped["components"] if c["id"] == "Wall_001")
    assert wall["geometry"] == {"generator": "WallGenerator", "generatorVersion": "1.0"}
    assert wall["bim"] == {"ifcClass": "IfcWall"}
    assert wall["parent"] == "Beam_001"
    assert {"type": "attached_to_parent"} in wall["constraints"]


def test_geometry_holds_only_generator_reference(model):
    """Il Component espone solo il riferimento al generatore, mai una mesh."""
    wall = model.get("Wall_001")
    assert wall.geometry.generator == "WallGenerator"
    assert not hasattr(wall.geometry, "mesh")
    assert "mesh" not in wall.to_dict()["geometry"]


def test_set_parameter_validates_against_definition(model):
    wall = model.get("Wall_001")
    wall.set_parameter("thickness", 0.4)
    assert wall.get_parameter("thickness") == 0.4
    with pytest.raises(ParameterError):
        wall.set_parameter("thickness", 99.0)  # oltre il massimo
    with pytest.raises(ParameterError):
        wall.set_parameter("inesistente", 1.0)


def test_set_parameter_marks_dirty_and_emits_event(model):
    wall = model.get("Wall_001")
    model.regenerate()
    assert wall.is_dirty is False
    model.event_bus.clear_history()
    wall.set_parameter("height", 3.5)
    assert wall.is_dirty is True
    assert any(e.name == "parameter_changed" for e in model.event_bus.history)


def test_connector_is_relational_not_absolute(model):
    wall = model.get("Wall_001")
    connector = Connector("hostStructure", wall.connectors["hostStructure"])
    assert connector.target_id == "Beam_001"
    assert connector.target_anchor == "lateral_face_center"
