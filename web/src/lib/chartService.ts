import "server-only";
import type { Chart, Intake } from "./types";

const BASE = process.env.CHART_SERVICE_URL ?? "http://127.0.0.1:8765";

async function call<T>(p: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + p, { ...init, cache: "no-store" });
  } catch {
    throw new Error(`Chart service unreachable at ${BASE}. Start it with: npm run chart`);
  }
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try {
      detail = JSON.parse(body).detail ?? body;
    } catch {}
    throw new Error(`Chart service: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  }
  return res.json() as Promise<T>;
}

export function geocode(q: string) {
  return call<{ results: { label: string; lat: number; lon: number; tz: string | null; country?: string }[] }>(
    `/geocode?q=${encodeURIComponent(q)}`,
  );
}

export function computeChart(intake: Intake, today?: string) {
  return call<Chart>("/chart", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      date: intake.date,
      time: intake.time,
      lat: intake.place.lat,
      lon: intake.place.lon,
      tz: intake.place.tz,
      utc_offset_override: intake.utcOffsetOverride ?? null,
      place_label: intake.place.label,
      today,
    }),
  });
}
