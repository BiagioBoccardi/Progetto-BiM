"""Kernel BIM — entità vive del modello (Component, Definition, Model).

Il kernel non conosce Blender né FastAPI: dipende solo dal confine
`blender_jobs` (motore geometrico) tramite interfaccia astratta.
"""
from .component import Component
from .component_definition import ComponentDefinition, ParameterError, ParameterSpec
from .constraints import Constraint
from .events import Event, EventBus
from .model import BuildingModel, HierarchyError
from .registry import DefinitionRegistry, default_registry
from .value_objects import BimMapping, Connector, GeometryRef, Semantic

__all__ = [
    "Component",
    "ComponentDefinition",
    "ParameterSpec",
    "ParameterError",
    "Constraint",
    "Connector",
    "GeometryRef",
    "BimMapping",
    "Semantic",
    "Event",
    "EventBus",
    "BuildingModel",
    "HierarchyError",
    "DefinitionRegistry",
    "default_registry",
]
