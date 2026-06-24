"""BuildingModel — il profilo come grafo vivo di Component.

Tiene insieme le istanze, fa rispettare la gerarchia struttura→muri→componenti
(RF-3.3, principio #5), orchestra la rigenerazione a cascata via il motore
geometrico (RF-4.3) e produce la serializzazione di sezione 9 e l'export IFC.
"""
from __future__ import annotations

from typing import Any, Mapping

from ..blender_jobs.engine import GenerationRequest, GeometryEngine, GeometryHandle
from .component import Component
from .events import Event, EventBus
from .registry import DefinitionRegistry


class HierarchyError(ValueError):
    """Violazione della gerarchia dei vincoli (RF-3.2 / RF-3.3)."""


class BuildingModel:
    def __init__(
        self,
        profile_id: str,
        engine: GeometryEngine,
        registry: DefinitionRegistry,
        event_bus: EventBus | None = None,
    ) -> None:
        self.profile_id = profile_id
        self.engine = engine
        self.registry = registry
        self.event_bus = event_bus or EventBus()
        self.components: dict[str, Component] = {}
        self._handles: dict[str, GeometryHandle] = {}

    # --- composizione del grafo --------------------------------------------
    def add(self, component: Component) -> Component:
        component.bind_event_bus(self.event_bus)
        self.components[component.id] = component
        # Mantiene coerenti i children del parent (la relazione è bidirezionale).
        if component.parent and component.parent in self.components:
            parent = self.components[component.parent]
            if component.id not in parent.children:
                parent.children.append(component.id)
        # Aggancia eventuali figli già presenti che puntano a questo componente.
        for other in self.components.values():
            if other.parent == component.id and other.id not in component.children:
                component.children.append(other.id)
        return component

    def get(self, component_id: str) -> Component:
        if component_id not in self.components:
            raise KeyError(f"Componente '{component_id}' non presente nel modello")
        return self.components[component_id]

    def handle(self, component_id: str) -> GeometryHandle | None:
        return self._handles.get(component_id)

    # --- validazione gerarchica --------------------------------------------
    def validate_hierarchy(self) -> None:
        """Ogni componente non-struttura deve risalire alla struttura portante.

        - La struttura (`parent is None`) è la radice ammessa.
        - Muri e componenti devono avere un parent che, di catena in catena,
          arriva a un componente di categoria Structure (principio #5).
        """
        for component in self.components.values():
            if component.definition.is_structure:
                if component.parent is not None:
                    raise HierarchyError(
                        f"La struttura '{component.id}' non deve avere parent"
                    )
                continue
            self._assert_roots_in_structure(component)

    def _assert_roots_in_structure(self, component: Component) -> None:
        seen: set[str] = set()
        current = component
        while True:
            if current.parent is None:
                raise HierarchyError(
                    f"'{current.id}' ({current.category}) non è agganciato alla "
                    f"struttura portante (parent mancante)"
                )
            if current.parent in seen:
                raise HierarchyError(f"Ciclo nei parent a partire da '{component.id}'")
            seen.add(current.parent)
            if current.parent not in self.components:
                raise HierarchyError(
                    f"'{current.id}' referenzia un parent inesistente "
                    f"'{current.parent}'"
                )
            parent = self.components[current.parent]
            if parent.definition.is_structure:
                return
            current = parent

    # --- ordinamento / discendenza -----------------------------------------
    def topological_order(self) -> list[str]:
        """Ids ordinati: ogni parent precede i propri figli."""
        order: list[str] = []
        visiting: set[str] = set()

        def visit(cid: str) -> None:
            if cid in order:
                return
            if cid in visiting:
                raise HierarchyError(f"Ciclo nella gerarchia a '{cid}'")
            visiting.add(cid)
            parent = self.components[cid].parent
            if parent and parent in self.components:
                visit(parent)
            visiting.discard(cid)
            if cid not in order:
                order.append(cid)

        for cid in self.components:
            visit(cid)
        return order

    def descendants(self, component_id: str) -> list[str]:
        result: list[str] = []
        stack = list(self.components[component_id].children)
        while stack:
            cid = stack.pop()
            if cid in result:
                continue
            result.append(cid)
            stack.extend(self.components[cid].children)
        return result

    # --- rigenerazione a cascata -------------------------------------------
    def regenerate(self, changed_id: str | None = None) -> list[str]:
        """Rigenera i componenti via il motore geometrico.

        Se `changed_id` è dato, rigenera solo quel componente e i suoi discendenti
        vincolati, in ordine topologico, così i Connector relazionali si
        ri-risolvono contro gli handle aggiornati a monte (RF-4.1 / RF-4.3).
        """
        order = self.topological_order()
        if changed_id is not None:
            affected = {changed_id, *self.descendants(changed_id)}
            order = [cid for cid in order if cid in affected]

        regenerated: list[str] = []
        for cid in order:
            component = self.components[cid]
            parent_handle = (
                self._handles.get(component.parent) if component.parent else None
            )
            request = GenerationRequest(
                component_id=cid,
                generator=component.geometry.generator,
                generator_version=component.geometry.generator_version,
                parameters=component.parameters,
                connectors=component.connectors,
                parent_handle=parent_handle,
            )
            handle = self.engine.generate(request)
            self._handles[cid] = handle
            component.mark_clean()
            regenerated.append(cid)
            self.event_bus.emit(
                Event("regenerated", cid, {"generator": component.geometry.generator})
            )
        return regenerated

    def set_parameter(self, component_id: str, name: str, value: float) -> list[str]:
        """Modifica un parametro e propaga la rigenerazione a valle (RF-4.3)."""
        self.get(component_id).set_parameter(name, value)
        return self.regenerate(changed_id=component_id)

    # --- export -------------------------------------------------------------
    def export_ifc(self) -> dict[str, Any]:
        """Export IFC come mapping esplicito Component → classe IFC (RF-7.1).

        Il mapping vive nel kernel (`bim.ifcClass`); il motore può arricchire con
        dati geometrici, ma il kernel non dipende dal formato di mesh.
        """
        engine_data = self.engine.export_ifc(self._handles)
        return {
            "profileId": self.profile_id,
            "schema": "IFC4",
            "elements": [
                {
                    "id": c.id,
                    "ifcClass": c.bim.ifc_class,
                    "parent": c.parent,
                    "geometry": engine_data.get(c.id, {}),
                }
                for c in self.components.values()
            ],
        }

    # --- serializzazione (sezione 9) ---------------------------------------
    def to_dict(self) -> dict[str, Any]:
        ordered = self.topological_order()
        return {
            "profileId": self.profile_id,
            "components": [self.components[cid].to_dict() for cid in ordered],
        }

    @classmethod
    def from_dict(
        cls,
        data: Mapping[str, Any],
        engine: GeometryEngine,
        registry: DefinitionRegistry,
        event_bus: EventBus | None = None,
        regenerate: bool = True,
    ) -> "BuildingModel":
        model = cls(
            profile_id=data.get("profileId", "profile"),
            engine=engine,
            registry=registry,
            event_bus=event_bus,
        )
        for raw in data.get("components", ()):
            definition = registry.resolve(raw)
            component = Component.from_dict(raw, definition, model.event_bus)
            model.add(component)
        model.validate_hierarchy()
        if regenerate:
            model.regenerate()
        return model
