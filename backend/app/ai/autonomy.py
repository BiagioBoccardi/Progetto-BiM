"""Modalità di autonomia dell'AI (RF-5.6, sezione 7)."""
from __future__ import annotations

from enum import Enum


class AutonomyMode(str, Enum):
    #: Esegue l'intero piano senza conferme passo-passo.
    AUTOMATIC = "automatic"
    #: Propone un'operazione alla volta, in attesa di conferma esplicita.
    ASSISTED = "assisted"
    #: Presenta il piano completo; esegue SOLO dopo approvazione in blocco.
    PLAN = "plan"
