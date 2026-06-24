from __future__ import annotations

import pytest

from app.blender_jobs.headless_engine import StubHeadlessEngine
from app.kernel.model import BuildingModel, HierarchyError
from app.kernel.registry import default_registry


def _engine_and_registry():
    return StubHeadlessEngine(), default_registry()


def test_structure_walls_components_hierarchy_is_valid(model):
    # Non solleva: Wall_001 risale alla struttura via Beam_001.
    model.validate_hierarchy()


def test_component_detached_from_structure_is_rejected(profile_data):
    # Un muro senza parent viola la gerarchia (principio #5).
    profile_data["components"][2]["parent"] = None
    profile_data["components"][1]["children"] = []
    engine, registry = _engine_and_registry()
    with pytest.raises(HierarchyError):
        BuildingModel.from_dict(profile_data, engine=engine, registry=registry)


def test_cascade_regeneration_propagates_to_descendants(model):
    """Cambiare un parametro a monte riposiziona i discendenti (RF-4.3/RF-4.1)."""
    model.regenerate()
    wall_origin_before = model.handle("Wall_001").origin

    # Il muro è agganciato a Beam_001:lateral_face_center; cambiando la lunghezza
    # della trave, l'anchor si sposta e il muro deve seguirlo.
    regenerated = model.set_parameter("Beam_001", "length", 8.0)

    assert "Wall_001" in regenerated  # il figlio è stato rigenerato a cascata
    wall_origin_after = model.handle("Wall_001").origin
    assert wall_origin_after != wall_origin_before
    assert wall_origin_after[0] == pytest.approx(8.0 / 2.0)  # segue l'anchor del parent


def test_topological_order_lists_parents_before_children(model):
    order = model.topological_order()
    assert order.index("Beam_001") < order.index("Wall_001")
