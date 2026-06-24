"""Orchestrazione del motore geometrico — confine isolato (RNF-1.1).

Estraibile in microservizio in futuro senza impattare il kernel.
"""
from .engine import GenerationRequest, GeometryEngine, GeometryHandle
from .headless_engine import StubHeadlessEngine

__all__ = [
    "GenerationRequest",
    "GeometryEngine",
    "GeometryHandle",
    "StubHeadlessEngine",
]
