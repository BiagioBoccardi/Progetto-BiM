"""Event bus del kernel.

Un Component non è un documento passivo: comunica i propri cambiamenti tramite
eventi (RNF-1.2). L'EventBus è il canale minimale con cui il kernel notifica
parametri cambiati, rigenerazioni e aggancio di vincoli, così che AI, viewer e
property panel possano restare sincronizzati (RNF-3.2).
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass(frozen=True)
class Event:
    """Un evento emesso da un'entità del kernel."""

    name: str
    source_id: str
    payload: dict[str, Any] = field(default_factory=dict)


Handler = Callable[[Event], None]


class EventBus:
    """Pub/sub sincrono e in-process.

    Volutamente semplice: in produzione potrà diventare una coda asincrona
    (RNF-4.1) senza che il kernel cambi, perché emette sempre via `emit`.
    """

    def __init__(self) -> None:
        self._handlers: dict[str, list[Handler]] = defaultdict(list)
        self.history: list[Event] = []

    def subscribe(self, event_name: str, handler: Handler) -> None:
        self._handlers[event_name].append(handler)

    def emit(self, event: Event) -> None:
        self.history.append(event)
        for handler in self._handlers.get(event.name, ()):
            handler(event)
        for handler in self._handlers.get("*", ()):
            handler(event)

    def clear_history(self) -> None:
        self.history.clear()
