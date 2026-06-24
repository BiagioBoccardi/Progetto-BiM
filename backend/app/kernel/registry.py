"""Registro delle Component Definition.

La libreria di tipi cresce da ~10 a ~1000+ senza refactoring del kernel (RNF-5.1):
nuovi tipi si registrano (o si caricano da configurazione), non si codificano nel
kernel. Il registro sa anche *sintetizzare* una definition da un Component Instance
serializzato, per accettare profili con tipi non ancora pre-registrati.
"""
from __future__ import annotations

from typing import Any, Mapping

from .component_definition import (
    ARCHITECTURE,
    COMPONENT,
    STRUCTURE,
    ComponentDefinition,
    ParameterSpec,
)
from .constraints import ATTACHED_TO_PARENT, HORIZONTAL, Constraint
from .value_objects import BimMapping, GeometryRef, Semantic


class DefinitionRegistry:
    def __init__(self) -> None:
        self._definitions: dict[str, ComponentDefinition] = {}

    def register(self, definition: ComponentDefinition) -> None:
        self._definitions[definition.type] = definition

    def get(self, type_name: str) -> ComponentDefinition | None:
        return self._definitions.get(type_name)

    def types(self) -> list[str]:
        return sorted(self._definitions)

    def resolve(self, data: Mapping[str, Any]) -> ComponentDefinition:
        """Definition per un Component Instance serializzato.

        Se il tipo è registrato, lo usa; altrimenti sintetizza una definition dai
        campi presenti nel JSON (generator, ifcClass, category, parametri). Così un
        profilo dal disegno entra anche con tipi nuovi (sezione 9), pur restando
        un'entità tipizzata e non un dict anonimo.
        """
        type_name = data["type"]
        existing = self._definitions.get(type_name)
        if existing is not None:
            return existing
        return self._synthesize(data)

    @staticmethod
    def _synthesize(data: Mapping[str, Any]) -> ComponentDefinition:
        params = data.get("parameters", {}) or {}
        specs = tuple(
            ParameterSpec(name=name, default=float(value))
            for name, value in params.items()
        )
        geometry = GeometryRef.from_dict(data["geometry"])
        bim = BimMapping.from_dict(data["bim"])
        semantic = Semantic.from_dict(data.get("semantic", {}))
        category = data["category"]
        allowed = () if category == STRUCTURE else (STRUCTURE, ARCHITECTURE)
        return ComponentDefinition(
            type=data["type"],
            category=category,
            geometry=geometry,
            bim=bim,
            parameters=specs,
            allowed_parent_categories=allowed,
            default_semantic=semantic,
        )


def default_registry() -> DefinitionRegistry:
    """Registro seed con i tipi citati nel documento (struttura, muri, componenti)."""
    registry = DefinitionRegistry()

    registry.register(
        ComponentDefinition(
            type="PillarTypeA",
            category=STRUCTURE,
            geometry=GeometryRef("PillarGenerator", "1.0"),
            bim=BimMapping("IfcColumn"),
            parameters=(
                ParameterSpec("width", 0.3, 0.1, 2.0),
                ParameterSpec("depth", 0.3, 0.1, 2.0),
                ParameterSpec("height", 3.0, 2.0, 12.0),
            ),
            default_semantic=Semantic(("structure", "pillar")),
        )
    )
    registry.register(
        ComponentDefinition(
            type="BeamTypeA",
            category=STRUCTURE,
            geometry=GeometryRef("BeamGenerator", "1.0"),
            bim=BimMapping("IfcBeam"),
            parameters=(
                ParameterSpec("length", 5.0, 0.5, 20.0),
                ParameterSpec("width", 0.3, 0.1, 2.0),
                ParameterSpec("height", 0.5, 0.1, 2.0),
                ParameterSpec("beamY", 3.0, 0.0, 50.0),
            ),
            default_constraints=(Constraint(HORIZONTAL),),
            default_semantic=Semantic(("structure", "beam")),
        )
    )
    registry.register(
        ComponentDefinition(
            type="SlabTypeA",
            category=STRUCTURE,
            geometry=GeometryRef("SlabGenerator", "1.0"),
            bim=BimMapping("IfcSlab"),
            parameters=(
                ParameterSpec("length", 5.0, 0.5, 30.0),
                ParameterSpec("width", 5.0, 0.5, 30.0),
                ParameterSpec("height", 0.25, 0.1, 1.0),
            ),
            default_semantic=Semantic(("structure", "slab")),
        )
    )
    registry.register(
        ComponentDefinition(
            type="WallTypeA",
            category=ARCHITECTURE,
            geometry=GeometryRef("WallGenerator", "1.0"),
            bim=BimMapping("IfcWall"),
            parameters=(
                ParameterSpec("length", 5.0, 0.2, 30.0),
                ParameterSpec("thickness", 0.25, 0.05, 1.0),
                ParameterSpec("height", 3.0, 1.0, 12.0),
            ),
            allowed_parent_categories=(STRUCTURE,),
            default_constraints=(Constraint(ATTACHED_TO_PARENT),),
            default_semantic=Semantic(("wall",)),
        )
    )
    registry.register(
        ComponentDefinition(
            type="WindowTypeA",
            category=COMPONENT,
            geometry=GeometryRef("WindowGenerator", "1.0"),
            bim=BimMapping("IfcWindow"),
            parameters=(
                ParameterSpec("width", 1.2, 0.3, 4.0),
                ParameterSpec("height", 1.4, 0.3, 4.0),
                ParameterSpec("sill_height", 0.9, 0.0, 2.0),
            ),
            allowed_parent_categories=(ARCHITECTURE,),
            default_constraints=(Constraint(ATTACHED_TO_PARENT),),
            default_semantic=Semantic(("window",)),
        )
    )
    registry.register(
        ComponentDefinition(
            type="DoorTypeA",
            category=COMPONENT,
            geometry=GeometryRef("DoorGenerator", "1.0"),
            bim=BimMapping("IfcDoor"),
            parameters=(
                ParameterSpec("width", 0.9, 0.6, 3.0),
                ParameterSpec("height", 2.1, 1.8, 4.0),
            ),
            allowed_parent_categories=(ARCHITECTURE,),
            default_constraints=(Constraint(ATTACHED_TO_PARENT),),
            default_semantic=Semantic(("door",)),
        )
    )
    registry.register(
        ComponentDefinition(
            type="BalconyTypeA",
            category=COMPONENT,
            geometry=GeometryRef("BalconyGenerator", "1.0"),
            bim=BimMapping("IfcRailing"),
            parameters=(
                ParameterSpec("width", 3.0, 0.5, 10.0),
                ParameterSpec("depth", 1.5, 0.5, 5.0),
                ParameterSpec("railing_height", 1.1, 0.9, 1.5),
            ),
            allowed_parent_categories=(ARCHITECTURE,),
            default_constraints=(Constraint(ATTACHED_TO_PARENT),),
            default_semantic=Semantic(("balcony",)),
        )
    )
    return registry
