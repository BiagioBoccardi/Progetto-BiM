"""Component Definition — il *tipo* (RF-2.3).

Distinzione esplicita richiesta dal documento: una `ComponentDefinition` (es.
``WallTypeA``) descrive cosa può essere un componente — categoria, schema dei
parametri, generatore, classe IFC, vincoli di default — mentre una
`Component` (instance) è una sua istanza concreta nel modello (es. ``Wall_001``).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping

from .constraints import Constraint
from .value_objects import BimMapping, GeometryRef, Semantic


class ParameterError(ValueError):
    """Parametro non valido rispetto alla sua specifica."""


@dataclass(frozen=True)
class ParameterSpec:
    """Specifica di un singolo parametro modificabile (RF-2.2)."""

    name: str
    default: float
    minimum: float | None = None
    maximum: float | None = None
    unit: str = "m"

    def validate(self, value: float) -> float:
        if not isinstance(value, (int, float)):
            raise ParameterError(f"Il parametro '{self.name}' deve essere numerico")
        value = float(value)
        if self.minimum is not None and value < self.minimum:
            raise ParameterError(
                f"Il parametro '{self.name}'={value} è sotto il minimo {self.minimum}"
            )
        if self.maximum is not None and value > self.maximum:
            raise ParameterError(
                f"Il parametro '{self.name}'={value} è sopra il massimo {self.maximum}"
            )
        return value


# Categorie note. La gerarchia dei vincoli (RF-3.3) è espressa dall'ordinamento:
# Structure → Architecture → Component.
STRUCTURE = "Structure"
ARCHITECTURE = "Architecture"
COMPONENT = "Component"


@dataclass(frozen=True)
class ComponentDefinition:
    type: str
    category: str
    geometry: GeometryRef
    bim: BimMapping
    parameters: tuple[ParameterSpec, ...] = ()
    allowed_parent_categories: tuple[str, ...] = ()
    default_constraints: tuple[Constraint, ...] = ()
    default_semantic: Semantic = field(default_factory=Semantic)
    actions: tuple[str, ...] = ("set_parameter", "attach", "delete")

    @property
    def is_structure(self) -> bool:
        return self.category == STRUCTURE

    def parameter_spec(self, name: str) -> ParameterSpec:
        for spec in self.parameters:
            if spec.name == name:
                return spec
        raise ParameterError(f"Parametro '{name}' non definito per il tipo '{self.type}'")

    def default_parameters(self) -> dict[str, float]:
        return {spec.name: spec.default for spec in self.parameters}

    def validate_parameters(self, params: Mapping[str, float]) -> dict[str, float]:
        """Valida e completa i parametri rispetto allo schema del tipo.

        I parametri mancanti vengono riempiti col default; i parametri ignoti
        vengono rifiutati (lo schema del tipo è la fonte di verità — RNF-5.1).
        """
        known = {spec.name for spec in self.parameters}
        unknown = set(params) - known
        if unknown:
            raise ParameterError(
                f"Parametri sconosciuti per '{self.type}': {sorted(unknown)}"
            )
        result = self.default_parameters()
        for spec in self.parameters:
            if spec.name in params:
                result[spec.name] = spec.validate(params[spec.name])
        return result

    def can_have_parent_category(self, parent_category: str | None) -> bool:
        if self.is_structure:
            # La struttura portante è la radice: parent None ammesso (principio #5).
            return parent_category is None
        if not self.allowed_parent_categories:
            return parent_category is not None
        return parent_category in self.allowed_parent_categories
