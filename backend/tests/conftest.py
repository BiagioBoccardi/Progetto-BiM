from __future__ import annotations

import pytest

from app.blender_jobs.headless_engine import StubHeadlessEngine
from app.kernel.model import BuildingModel
from app.kernel.registry import default_registry


def sample_profile() -> dict:
    """Profilo della sezione 9: pilastro → trave → muro."""
    return {
        "profileId": "profile_test_001",
        "components": [
            {
                "id": "Pillar_001",
                "type": "PillarTypeA",
                "category": "Structure",
                "parameters": {"width": 0.3, "depth": 0.3, "height": 3.0},
                "connectors": {},
                "parent": None,
                "children": ["Beam_001"],
                "constraints": [],
                "geometry": {"generator": "PillarGenerator", "generatorVersion": "1.0"},
                "bim": {"ifcClass": "IfcColumn"},
                "semantic": {"tags": ["structure", "pillar"]},
            },
            {
                "id": "Beam_001",
                "type": "BeamTypeA",
                "category": "Structure",
                "parameters": {"length": 5.0, "width": 0.3, "height": 0.5},
                "connectors": {},
                "parent": None,
                "children": ["Wall_001"],
                "constraints": [{"type": "horizontal"}],
                "geometry": {"generator": "BeamGenerator", "generatorVersion": "1.0"},
                "bim": {"ifcClass": "IfcBeam"},
                "semantic": {"tags": ["structure", "beam"]},
            },
            {
                "id": "Wall_001",
                "type": "WallTypeA",
                "category": "Architecture",
                "parameters": {"length": 5.0, "thickness": 0.25, "height": 3.0},
                "connectors": {"hostStructure": "Beam_001:lateral_face_center"},
                "parent": "Beam_001",
                "children": [],
                "constraints": [{"type": "attached_to_parent"}],
                "geometry": {"generator": "WallGenerator", "generatorVersion": "1.0"},
                "bim": {"ifcClass": "IfcWall"},
                "semantic": {"tags": ["wall"]},
            },
        ],
    }


@pytest.fixture
def profile_data() -> dict:
    return sample_profile()


@pytest.fixture
def model(profile_data) -> BuildingModel:
    return BuildingModel.from_dict(
        profile_data, engine=StubHeadlessEngine(), registry=default_registry()
    )
