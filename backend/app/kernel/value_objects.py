"""Value objects immutabili del Component Schema.

Questi oggetti modellano i campi del Component Instance descritti in RF-2.4 e
nella sezione 9 del documento requisiti. Sono volutamente *frozen*: un value
object non ha identità propria, lo si sostituisce, non lo si muta.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping


@dataclass(frozen=True)
class GeometryRef:
    """Riferimento al generatore — MAI la mesh (principio non negoziabile #3, RNF-1.1).

    Il kernel conosce solo *quale* Generator usare e con *quale* versione; come
    quel generatore produca la geometria (Blender/Geometry Nodes o altro) resta
    fuori dal kernel, dietro il confine `blender_jobs/`.
    """

    generator: str
    generator_version: str = "1.0"

    def to_dict(self) -> dict[str, str]:
        return {"generator": self.generator, "generatorVersion": self.generator_version}

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "GeometryRef":
        return cls(
            generator=data["generator"],
            generator_version=str(data.get("generatorVersion", "1.0")),
        )


@dataclass(frozen=True)
class BimMapping:
    """Mapping esplicito verso una classe IFC (RF-7.1, es. ``IfcWall``)."""

    ifc_class: str

    def to_dict(self) -> dict[str, str]:
        return {"ifcClass": self.ifc_class}

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "BimMapping":
        return cls(ifc_class=data["ifcClass"])


@dataclass(frozen=True)
class Semantic:
    """Metadata semantico usato dall'AI per interpretare lo spazio (RF-5.5)."""

    tags: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, list[str]]:
        return {"tags": list(self.tags)}

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "Semantic":
        return cls(tags=tuple(data.get("tags", ())))


@dataclass(frozen=True)
class Connector:
    """Aggancio **relazionale** verso un'altra entità (RF-4.2).

    Il `target` è un riferimento simbolico, non una coordinata assoluta:
    ``"Wall_001"`` oppure ``"Wall_001:lateral_face_center"``. Alla rigenerazione
    il riferimento viene ri-risolto contro la geometria aggiornata del target,
    così il vincolo resta valido a cascata (RF-4.1 / RF-4.3).
    """

    name: str
    target: str

    @property
    def target_id(self) -> str:
        """Id del componente referenziato, senza l'eventuale anchor."""
        return self.target.split(":", 1)[0]

    @property
    def target_anchor(self) -> str | None:
        """Nome dell'anchor referenziato, se specificato (``...:anchor``)."""
        return self.target.split(":", 1)[1] if ":" in self.target else None
