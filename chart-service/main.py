"""Vercel / local ASGI entrypoint. Exports FastAPI `app`."""

from __future__ import annotations

import sys
from pathlib import Path

# Local package lives under src/ (uv / editable install layout).
_SRC = Path(__file__).resolve().parent / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from chart_service.api import app  # noqa: E402

__all__ = ["app"]
