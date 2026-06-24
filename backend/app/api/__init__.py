"""Router FastAPI."""
from .routes_ai import router as ai_router
from .routes_profiles import router as profiles_router

__all__ = ["ai_router", "profiles_router"]
