"""HTTP surface for the chart service. Run: uv run uvicorn chart_service.api:app --port 8765"""

from __future__ import annotations

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .compute import compute_chart

app = FastAPI(title="Jyotish chart service")

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"


class ChartRequest(BaseModel):
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    time: str = Field(pattern=r"^\d{1,2}:\d{2}(:\d{2})?$")
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    tz: str | None = None
    utc_offset_override: float | None = Field(default=None, ge=-14, le=14)
    today: str | None = None
    place_label: str | None = None


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.get("/geocode")
async def geocode(q: str) -> dict:
    """Town search via Open-Meteo. 'Indore, India' searches 'Indore' and prefers Indian results."""
    parts = [p.strip() for p in q.split(",") if p.strip()]
    if not parts:
        raise HTTPException(400, "empty query")
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(GEOCODE_URL, params={"name": parts[0], "count": 10,
                                                  "language": "en", "format": "json"})
    r.raise_for_status()
    results = r.json().get("results") or []
    hints = [h.lower() for h in parts[1:]]

    def matches(x: dict) -> bool:
        hay = " ".join(str(x.get(k, "")) for k in ("country", "country_code", "admin1", "admin2")).lower()
        return all(h in hay for h in hints)

    if hints:
        results = [x for x in results if matches(x)] or results
    return {"results": [{
        "label": ", ".join(str(x[k]) for k in ("name", "admin1", "country") if x.get(k)),
        "lat": x["latitude"], "lon": x["longitude"], "tz": x.get("timezone"),
        "country": x.get("country"), "population": x.get("population"),
    } for x in results]}


@app.post("/chart")
def chart(req: ChartRequest) -> dict:
    try:
        return compute_chart(**req.model_dump())
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
