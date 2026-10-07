"use client";
import { useEffect, useRef, useState } from "react";
import type { Intake, TimeSource } from "@/lib/types";
import { api, type LoadedReading } from "./api";

const SOURCES: { v: TimeSource; label: string }[] = [
  { v: "certificate", label: "Birth certificate" },
  { v: "hospital_record", label: "Hospital record" },
  { v: "parent_memory", label: "A parent's memory" },
  { v: "rounded", label: "Rounded figure" },
  { v: "guess", label: "A guess" },
  { v: "other", label: "Other" },
];

type Place = Intake["place"];

export default function IntakeForm({
  initial,
  onCreated,
  onSubmitEdit,
  onCancel,
}: {
  initial?: Intake;
  onCreated?: (r: LoadedReading) => void;
  onSubmitEdit?: (i: Intake) => Promise<void>;
  onCancel?: () => void;
}) {
  const [f, setF] = useState<Partial<Intake>>(
    initial ?? { name: "", callName: "", date: "", time: "", timeSource: undefined },
  );
  const [placeQuery, setPlaceQuery] = useState(initial?.place.label ?? "");
  const [place, setPlace] = useState<Place | null>(initial?.place ?? null);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualOffset, setManualOffset] = useState(initial?.utcOffsetOverride != null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const set = <K extends keyof Intake>(k: K, v: Intake[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    clearTimeout(timer.current);
    if (!placeQuery.trim() || place?.label === placeQuery) return;
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults((await api.geocode(placeQuery)).results);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [placeQuery, place]);

  const roundTime = /:(00|30)$/.test(f.time ?? "");
  const weakSource = f.timeSource === "parent_memory" || f.timeSource === "rounded" || f.timeSource === "guess";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!place) return setErr("Choose the birth place from the list.");
    const intake = {
      ...f,
      place,
      utcOffsetOverride: manualOffset ? Number(f.utcOffsetOverride) : null,
    } as Intake;
    setBusy(true);
    try {
      if (onSubmitEdit) await onSubmitEdit(intake);
      else onCreated?.(await api.create(intake));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={initial ? "" : "mx-auto max-w-[78rem] px-5 md:px-8 py-10 md:py-16"}>
      <form onSubmit={submit} className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] gap-10 lg:gap-20 enter">
        <div>
          <p className="eyebrow">Stage 0</p>
          <h1 className="serif text-[38px] leading-tight mt-2">{initial ? "Correct the birth data" : "Intake"}</h1>
          <p className="muted mt-4 max-w-[26rem]">
            Four things are required. The time matters most: the rising sign can change in a few minutes, and a wrong
            time zone offset looks exactly like a wrong birth time.
          </p>
        </div>

        <div className="grid gap-8 max-w-[40rem]">
          <fieldset className="grid sm:grid-cols-2 gap-4">
            <label className="field">
              <span>Full name</span>
              <input className="input" required value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label className="field">
              <span>Call them</span>
              <input
                className="input"
                placeholder="How they'd like to be addressed"
                value={f.callName ?? ""}
                onChange={(e) => set("callName", e.target.value)}
              />
            </label>
          </fieldset>

          <fieldset className="grid sm:grid-cols-2 gap-4">
            <label className="field">
              <span>Date of birth</span>
              <input className="input" type="date" required value={f.date ?? ""} onChange={(e) => set("date", e.target.value)} />
            </label>
            <label className="field">
              <span>Time of birth, local clock</span>
              <input className="input" type="time" required value={f.time ?? ""} onChange={(e) => set("time", e.target.value)} />
            </label>
          </fieldset>

          <fieldset className="field">
            <span>How is the time known?</span>
            <div className="choice" role="radiogroup">
              {SOURCES.map((s) => (
                <label key={s.v}>
                  <input
                    type="radio"
                    name="src"
                    value={s.v}
                    checked={f.timeSource === s.v}
                    onChange={() => set("timeSource", s.v)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
            <input
              className="input mt-2"
              placeholder="Anything else about where the time came from (optional)"
              value={f.timeSourceNote ?? ""}
              onChange={(e) => set("timeSourceNote", e.target.value)}
            />
            {(weakSource || (roundTime && f.timeSource !== "certificate" && f.timeSource !== "hospital_record")) && (
              <p className="note note-warn mt-2">
                {roundTime ? "A time ending in :00 or :30 is often rounded. " : ""}
                The analysis will carry an error bar. The next screen shows how many minutes the rising sign survives in
                each direction.
              </p>
            )}
          </fieldset>

          <div className="field relative">
            <span>Place of birth</span>
            <input
              className="input"
              placeholder="Town, country"
              value={placeQuery}
              onChange={(e) => {
                setPlaceQuery(e.target.value);
                setPlace(null);
                if (!e.target.value.trim()) setResults([]);
              }}
              role="combobox"
              aria-controls="place-results"
              aria-autocomplete="list"
              aria-expanded={results.length > 0}
            />
            {searching && <small>Searching…</small>}
            {results.length > 0 && (
              <ul className="border hair rounded-[4px] mt-1 max-h-64 overflow-auto bg-[var(--paper)]" role="listbox" id="place-results">
                {results.map((r, k) => (
                  <li key={k}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-[var(--paper-2)] focus-visible:bg-[var(--paper-2)]"
                      onClick={() => {
                        setPlace(r);
                        setPlaceQuery(r.label);
                        setResults([]);
                      }}
                    >
                      {r.label}
                      <span className="muted text-[12.5px] ml-2">
                        {r.lat.toFixed(3)}, {r.lon.toFixed(3)} · {r.tz ?? "no time zone"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {place && (
              <small>
                {place.lat.toFixed(4)}, {place.lon.toFixed(4)} · {place.tz ?? "no time zone found"}. The historical offset
                for the birth date is looked up from the time zone database, including war time and daylight saving.
              </small>
            )}
            <label className="flex items-center gap-2 mt-2 text-[13.5px]">
              <input type="checkbox" checked={manualOffset} onChange={(e) => setManualOffset(e.target.checked)} />
              Override the UTC offset by hand
            </label>
            {manualOffset && (
              <input
                className="input max-w-[12rem]"
                type="number"
                step="0.25"
                placeholder="e.g. 5.5"
                value={f.utcOffsetOverride ?? ""}
                onChange={(e) => set("utcOffsetOverride", e.target.value === "" ? null : Number(e.target.value))}
              />
            )}
          </div>

          <fieldset className="grid gap-4 border-t hair pt-6">
            <legend className="eyebrow mb-3">Optional</legend>
            <p className="text-[13.5px] muted -mt-2">
              These sharpen the later reports. The app holds them back from the model until the past-check has been
              scored, so they cannot leak into it.
            </p>
            <label className="field">
              <span>What they do for a living</span>
              <input className="input" value={f.occupation ?? ""} onChange={(e) => set("occupation", e.target.value)} />
            </label>
            <label className="field">
              <span>Any practice they already follow</span>
              <input className="input" value={f.practice ?? ""} onChange={(e) => set("practice", e.target.value)} />
            </label>
            <label className="field">
              <span>A specific question behind the request</span>
              <textarea className="input" rows={2} value={f.question ?? ""} onChange={(e) => set("question", e.target.value)} />
            </label>
          </fieldset>

          {err && <p className="note note-bad">{err}</p>}
          <div className="flex gap-3">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Computing…" : initial ? "Recompute the chart" : "Compute the chart"}
            </button>
            {onCancel && (
              <button type="button" className="btn" onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}
