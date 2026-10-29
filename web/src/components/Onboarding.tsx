"use client";
import { useEffect, useRef, useState } from "react";
import type { Intake, TimeSource } from "@/lib/types";
import { api, type AuthUser, type LoadedReading } from "./api";
import TimeField from "./TimeField";

const SOURCES: { v: TimeSource; label: string; hint: string }[] = [
  { v: "certificate", label: "Birth certificate", hint: "Printed or official record" },
  { v: "hospital_record", label: "Hospital record", hint: "Discharge slip, nurse notes" },
  { v: "parent_memory", label: "A parent's memory", hint: "Told, not written down" },
  { v: "rounded", label: "Rounded figure", hint: "Often ends in :00 or :30" },
  { v: "guess", label: "A guess", hint: "Approximate only" },
  { v: "other", label: "Other", hint: "Tell us in a note" },
];

type Place = Intake["place"];
/** Four plain beats: who → birth → certainty → create */
type Step = "who" | "birth" | "certainty" | "create";

const STEPS: Step[] = ["who", "birth", "certainty", "create"];

export default function Onboarding({
  user,
  onAuthed,
  onCreated,
}: {
  user: AuthUser | null;
  onAuthed: (u: AuthUser) => void;
  onCreated: (r: LoadedReading) => void;
}) {
  const [step, setStep] = useState<Step>("who");
  const [f, setF] = useState<Partial<Intake>>({ name: "", callName: "", date: "", time: "" });
  const [placeQuery, setPlaceQuery] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualOffset, setManualOffset] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const set = <K extends keyof Intake>(k: K, v: Intake[K]) => setF((x) => ({ ...x, [k]: v }));
  const signedIn = !!user;
  const idx = STEPS.indexOf(step);
  const pct = Math.round(((idx + 1) / STEPS.length) * 100);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

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

  function go(next: Step) {
    setErr(null);
    setStep(next);
  }

  function back() {
    setErr(null);
    if (idx <= 0) {
      window.location.hash = "#/";
      return;
    }
    setStep(STEPS[idx - 1]);
  }

  async function ensureAccount(): Promise<AuthUser> {
    if (user) return user;
    const created = await api.register(email, password, f.callName || f.name || undefined);
    onAuthed(created);
    return created;
  }

  async function compute() {
    setBusy(true);
    setErr(null);
    try {
      if (!place) throw new Error("Choose the birth place from the list.");
      if (!signedIn && (!email.trim() || password.length < 8)) {
        throw new Error("Add an email and password (at least 8 characters) to save the reading.");
      }
      await ensureAccount();
      const intake = {
        ...f,
        callName: (f.callName || f.name || "").trim(),
        place,
        utcOffsetOverride: manualOffset ? Number(f.utcOffsetOverride) : null,
      } as Intake;
      onCreated(await api.create(intake));
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const birthReady = !!(f.date && f.time && place);
  const roundTime = /:(00|30)$/.test(f.time ?? "");
  const weakSource = f.timeSource === "parent_memory" || f.timeSource === "rounded" || f.timeSource === "guess";

  return (
    <main className="sky">
      <div className="app-shell" style={{ maxWidth: "36rem" }}>
        <div className="mb-10">
          <div className="flex items-center justify-between gap-4 mb-3">
            <button type="button" className="btn btn-quiet text-[14px]" onClick={back}>
              ← Back
            </button>
            <span className="text-[13px] muted">
              {idx + 1} of {STEPS.length}
            </span>
          </div>
          <div className="progress-track" aria-hidden>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div key={step} className="enter">
          {step === "who" && (
            <StepShell
              title="Who is this reading for?"
              body="A full name for the record, and a shorter name for how the reading speaks."
            >
              <label className="field mb-6">
                <span className="muted text-[13px]">Full name</span>
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  className="flow-input"
                  placeholder="As on the record"
                  value={f.name ?? ""}
                  onChange={(e) => set("name", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && f.name?.trim() && go("birth")}
                />
              </label>
              <label className="field mb-8">
                <span className="muted text-[13px]">Call them</span>
                <input
                  className="flow-input flow-input-sm"
                  placeholder="A familiar name"
                  value={f.callName ?? ""}
                  onChange={(e) => set("callName", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && f.name?.trim() && go("birth")}
                />
              </label>
              <button type="button" className="btn btn-primary" disabled={!f.name?.trim()} onClick={() => go("birth")}>
                Continue
              </button>
              {!signedIn && (
                <p className="mt-6 text-[13px] muted">
                  Already registered?{" "}
                  <a href="#/auth" className="underline underline-offset-2">
                    Sign in first
                  </a>
                  .
                </p>
              )}
            </StepShell>
          )}

          {step === "birth" && (
            <StepShell
              title="When and where were they born?"
              body="Date and local clock time, then pick a place so the chart can be set."
            >
              <label className="field mb-6">
                <span className="muted text-[13px]">Date</span>
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  className="flow-input flow-input-sm"
                  type="date"
                  value={f.date ?? ""}
                  onChange={(e) => set("date", e.target.value)}
                />
              </label>
              <div className="mb-6">
                <p className="muted text-[13px] mb-2">Time (local clock)</p>
                <TimeField value={f.time ?? ""} onChange={(v) => set("time", v)} autoFocus={false} />
                {roundTime && (
                  <p className="note note-warn mt-3">
                    Times ending in :00 or :30 are often rounded. You’ll say how the time is known next.
                  </p>
                )}
              </div>
              <div className="relative mb-4">
                <label className="field">
                  <span className="muted text-[13px]">Place of birth</span>
                  <input
                    className="flow-input flow-input-sm"
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
                </label>
                {searching && <p className="muted text-[13px] mt-2">Searching…</p>}
                {results.length > 0 && (
                  <ul
                    className="mt-2 max-h-56 overflow-auto bg-[var(--paper-2)] rounded-[4px]"
                    role="listbox"
                    id="place-results"
                  >
                    {results.map((r, k) => (
                      <li key={k}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-[var(--paper)]"
                          onClick={() => {
                            setPlace(r);
                            setPlaceQuery(r.label);
                            setResults([]);
                          }}
                        >
                          {r.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {place && (
                <p className="muted text-[13px] mb-4">
                  {place.tz ?? "Time zone will be resolved"} · {place.lat.toFixed(2)}, {place.lon.toFixed(2)}
                </p>
              )}
              <button
                type="button"
                className="see-more mb-6 justify-self-start"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? "Hide advanced" : "Advanced: UTC offset"}
              </button>
              {showAdvanced && (
                <div className="mb-6">
                  <label className="flex items-center gap-2 mb-3 text-[14px]">
                    <input type="checkbox" checked={manualOffset} onChange={(e) => setManualOffset(e.target.checked)} />
                    Override UTC offset by hand
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
              )}
              <button type="button" className="btn btn-primary" disabled={!birthReady} onClick={() => go("certainty")}>
                Continue
              </button>
            </StepShell>
          )}

          {step === "certainty" && (
            <StepShell
              title="How sure is that time?"
              body="This sets how carefully we treat the birth moment. Optional notes can wait until after the past check."
            >
              <div className="choice mb-6" role="radiogroup" aria-label="Time source">
                {SOURCES.map((s) => (
                  <label key={s.v} title={s.hint}>
                    <input
                      type="radio"
                      name="src"
                      checked={f.timeSource === s.v}
                      onChange={() => set("timeSource", s.v)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
              <input
                className="input mb-4"
                placeholder="Anything else about the source (optional)"
                value={f.timeSourceNote ?? ""}
                onChange={(e) => set("timeSourceNote", e.target.value)}
              />
              {weakSource && (
                <p className="note note-warn mb-6">
                  We’ll treat this time as approximate and show how wide the rising window is.
                </p>
              )}
              <button
                type="button"
                className="btn btn-primary"
                disabled={!f.timeSource}
                onClick={() => go("create")}
              >
                Continue
              </button>
            </StepShell>
          )}

          {step === "create" && (
            <StepShell
              title={`Ready for ${f.callName || f.name || "them"}`}
              body="We’ll cast the chart next. You confirm the details before any forward writing."
            >
              <dl className="panel-soft meta-grid mb-8">
                <dt>Name</dt>
                <dd>{f.name}</dd>
                <dt>Moment</dt>
                <dd>
                  {f.date} · {f.time}
                </dd>
                <dt>Place</dt>
                <dd>{place?.label}</dd>
                <dt>Time known by</dt>
                <dd>{SOURCES.find((s) => s.v === f.timeSource)?.label}</dd>
              </dl>

              {!signedIn && (
                <div className="grid gap-4 mb-8">
                  <p className="text-[14px] muted">Save the reading with a quiet account.</p>
                  <label className="field">
                    <span>Email</span>
                    <input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      className="input"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Password</span>
                    <input
                      className="input"
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                  </label>
                  <p className="text-[13px] muted">
                    Already have an account?{" "}
                    <a href="#/auth" className="underline underline-offset-2">
                      Sign in
                    </a>
                    .
                  </p>
                </div>
              )}

              <button type="button" className="btn btn-primary" disabled={busy} onClick={compute}>
                {busy ? "Computing…" : "Compute the chart"}
              </button>
            </StepShell>
          )}
        </div>

        {err && <p className="note note-bad mt-8">{err}</p>}
      </div>
    </main>
  );
}

function StepShell({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h1 className="stage-title break-words" style={{ fontSize: "clamp(28px, 5vw, 40px)" }}>{title}</h1>
      <p className="muted mt-4 mb-8 leading-relaxed text-[15px]">{body}</p>
      {children}
    </div>
  );
}
