"""Implementazione headless di default del motore geometrico.

In produzione questa classe orchestrerebbe Blender headless via ``bpy`` (job
asincroni/queue, RNF-4.1), invocando i Geometry Node Group della libreria
`/blender/generators`. Qui forniamo uno **stub deterministico senza dipendenza da
bpy**, così che kernel, API e test girino ovunque (CI inclusa) e il confine
architetturale resti verificabile.

Lo stub calcola dimensioni e anchor dai parametri: è sufficiente a dimostrare la
propagazione relazionale dei vincoli (RF-4.2 / RF-4.3) senza alcuna mesh reale.
"""
from __future__ import annotations

from typing import Mapping

from .engine import GenerationRequest, GeometryEngine, GeometryHandle, Vec3


class StubHeadlessEngine(GeometryEngine):
    """Motore stub: nessun Blender, geometria solo come metadati/handle."""

    #: generatori la cui esistenza è "nota" (per metadati/diagnostica). La
    #: libreria cresce nel tempo (RNF-5.1): `supports` resta permissivo.
    KNOWN_GENERATORS = {
        "PillarGenerator",
        "BeamGenerator",
        "SlabGenerator",
        "WallGenerator",
        "WindowGenerator",
        "DoorGenerator",
        "BalconyGenerator",
    }

    def supports(self, generator: str) -> bool:
        return bool(generator)

    def generate(self, request: GenerationRequest) -> GeometryHandle:
        dimensions = self._derive_dimensions(request.parameters)
        origin = self._resolve_origin(request)
        anchors = self._derive_anchors(origin, dimensions)
        return GeometryHandle(
            component_id=request.component_id,
            generator=request.generator,
            generator_version=request.generator_version,
            origin=origin,
            dimensions=dimensions,
            anchors=anchors,
        )

    # --- helper deterministici ---------------------------------------------
    @staticmethod
    def _derive_dimensions(params: Mapping[str, float]) -> dict[str, float]:
        # I generatori reali userebbero i propri parametri; qui mappiamo i nomi
        # convenzionali del documento a un bounding box.
        return {
            "x": float(params.get("length", params.get("width", 0.0))),
            "y": float(params.get("depth", params.get("thickness", 0.0))),
            "z": float(params.get("height", 0.0)),
        }

    def _resolve_origin(self, request: GenerationRequest) -> Vec3:
        """Risolve l'origine in modo *relazionale* rispetto al parent (RF-4.2).

        Se un connector punta a un anchor del parent (``"Wall_001:lateral_face_center"``),
        l'origine del figlio segue quell'anchor: spostando/ridimensionando il
        parent, alla rigenerazione il figlio si riposiziona (RF-4.3).
        """
        parent = request.parent_handle
        if parent is None:
            return (0.0, 0.0, 0.0)
        for target in request.connectors.values():
            if ":" in target:
                _, anchor = target.split(":", 1)
                if anchor in parent.anchors:
                    return parent.anchors[anchor]
        # Default: agganciato all'origine del parent.
        return parent.origin

    @staticmethod
    def _derive_anchors(origin: Vec3, dims: Mapping[str, float]) -> dict[str, Vec3]:
        ox, oy, oz = origin
        return {
            "origin": origin,
            "base_center": (ox, oy, oz),
            "top_center": (ox, oy, oz + dims["z"]),
            "lateral_face_center": (ox + dims["x"] / 2.0, oy, oz + dims["z"] / 2.0),
        }
