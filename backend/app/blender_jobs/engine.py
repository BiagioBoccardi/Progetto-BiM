"""Confine del motore geometrico (RNF-1.1, principio non negoziabile #2).

Questo modulo è l'UNICO punto in cui il kernel parla con il motore geometrico.
Il kernel passa "quale generatore + quali parametri + handle del parent"; riceve
un `GeometryHandle` — un *riferimento* con metadati (dimensioni, anchor relazionali),
**mai una mesh**. Sostituire Blender con un altro motore significa fornire un'altra
implementazione di `GeometryEngine`, senza toccare il kernel.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Mapping

Vec3 = tuple[float, float, float]


@dataclass(frozen=True)
class GeometryHandle:
    """Risultato opaco di una generazione: riferimento + metadati, mai mesh.

    `anchors` espone punti relazionali nominati (es. ``lateral_face_center``) a cui
    i componenti a valle possono agganciarsi (RF-4.2). Sono questi anchor a
    cambiare quando un parametro a monte cambia, abilitando la cascata (RF-4.3).
    """

    component_id: str
    generator: str
    generator_version: str
    origin: Vec3
    dimensions: Mapping[str, float]
    anchors: Mapping[str, Vec3] = field(default_factory=dict)


@dataclass(frozen=True)
class GenerationRequest:
    component_id: str
    generator: str
    generator_version: str
    parameters: Mapping[str, float]
    connectors: Mapping[str, str]
    parent_handle: GeometryHandle | None = None


class GeometryEngine(ABC):
    """Interfaccia stabile verso il motore geometrico."""

    @abstractmethod
    def supports(self, generator: str) -> bool:
        """True se il motore sa eseguire il generatore richiesto."""

    @abstractmethod
    def generate(self, request: GenerationRequest) -> GeometryHandle:
        """Esegue (o accoda) la generazione e restituisce un handle."""

    def export_ifc(self, handles: Mapping[str, GeometryHandle]) -> dict:
        """Hook di export IFC (RF-7.1). Default: nessun dettaglio geometrico.

        Il mapping Component→classe IFC vive nel kernel (`bim.ifcClass`); qui il
        motore aggiunge eventuali dati geometrici. La base restituisce vuoto.
        """
        return {}
