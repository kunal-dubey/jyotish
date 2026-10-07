import type { Intake } from "./types";

export function validIntake(i: Partial<Intake>): string | null {
  if (!i.name?.trim()) return "Name is required.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.date ?? "")) return "Date of birth is required.";
  if (!/^\d{1,2}:\d{2}$/.test(i.time ?? "")) return "Time of birth, to the minute, is required.";
  if (!i.timeSource) return "Say how the birth time is known.";
  if (!i.place || typeof i.place.lat !== "number" || typeof i.place.lon !== "number") return "Choose a birth place.";
  if (!i.place.tz && (i.utcOffsetOverride == null || Number.isNaN(i.utcOffsetOverride)))
    return "No time zone found for that place; enter the UTC offset manually.";
  return null;
}
