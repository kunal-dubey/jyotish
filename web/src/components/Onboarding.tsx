"use client";
import { useEffect, useRef, useState } from "react";
import type { Intake, TimeSource } from "@/lib/types";
import { api, type AuthUser, type LoadedReading } from "./api";

const SOURCES: { v: TimeSource; label: string; hint: string }[] = [
  { v: "certificate", label: "Birth certificate", hint: "Printed or official record" },
  { v: "hospital_record", label: "Hospital record", hint: "Discharge slip, nurse notes" },
  { v: "parent_memory", label: "A parent's memory", hint: "Told, not written down" },
  { v: "rounded", label: "Rounded figure", hint: "Often ends in :00 or :30" },
  { v: "guess", label: "A guess", hint: "Approximate only" },
  { v: "other", label: "Other", hint: "Tell us in a note" },
];

type Place = Intake["place"];
type Step = "welcome" | "name" | "when" | "time" | "source" | "place" | "optional" | "account" | "compute";

const STEPS: Step[] = ["welcome", "name", "when", "time", "source", "place", "optional", "account", "compute"];

function progressIndex(step: Step, signedIn: boolean) {
  const list = signedIn ? STEPS.filter((s) => s !== "account") : STEPS;
  return list.indexOf(step);
}

export default function Onboarding({
  user,
  onAuthed,
  onCreated,
}: {
  user: AuthUser | null;
  onAuthed: (u: AuthUser) => void;
  onCreated: (r: LoadedReading) => void;
}) {
  const [step, setStep] = useState<Step>("welcome");
  const [f, setF] = useState<Partial<Intake>>({ name: "", callName: "", date: "", time: "" });
  const [placeQuery, setPlaceQuery] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualOffset, setManualOffset] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const set = <K extends keyof Intake>(k: K, v: Intake[K]) => setF((x) => ({ ...x, [k]: v }));
  const signedIn = !!user;
  const visibleSteps = signedIn ? STEPS.filter((s) => s !== "account") : STEPS;
  const idx = progressIndex(step, signedIn);
  const pct = Math.round(((idx + 1) / visibleSteps.length) * 100);

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

  function after(current: Step): Step {
    const i = visibleSteps.indexOf(current);
    return visibleSteps[Math.min(i + 1, visibleSteps.length - 1)];
  }

  function back() {
    setErr(null);
    const i = visibleSteps.indexOf(step);
    if (i <= 0) {
      window.location.hash = "#/";
      return;
    }
    setStep(visibleSteps[i - 1]);
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

  const roundTime = /:(00|30)$/.test(f.time ?? "");
  const weakSource = f.timeSource === "parent_memory" || f.timeSource === "rounded" || f.timeSource === "guess";

  return (
    <main className="sky min-h-[calc(100dvh-3.5rem)] relative">
      <div className="orb orb-b drift" aria-hidden />
      <div className="mx-auto max-w-[34rem] px-5 md:px-8 py-10 md:py-16">
        <div className="mb-10">
          <div className="flex items-center justify-between gap-4 mb-3">
            <button type="button" className="btn-quiet text-[13px]" onClick={back}>
              ← Back
            </button>
            <span className="eyebrow">
              {idx + 1} / {visibleSteps.length}
            </span>
          </div>
          <div className="progress-track" aria-hidden>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div key={step} className="enter">
          {step === "welcome" && (
            <StepShell
              kicker="A quiet beginning"
              title="We'll gather a few facts — one at a time."
              body="Name, birth moment, and place. Optional context waits until after the blind check, so it cannot color the score."
            >
              <button type="button" className="btn btn-primary" onClick={() => go("name")}>
                I'm ready
              </button>
              {!signedIn && (
                <p className="mt-6 text-[13px] muted">
                  Already registered?{" "}
                  <a href="#/auth" className="underline underline-offset-2">
                    Sign in first
                  </a>
                  , then start a reading from home.
                </p>
              )}
            </StepShell>
          )}

          {step === "name" && (
            <StepShell kicker="Who is this for" title="What should we call them?" body="Full name for the record. A shorter name for how the reading speaks.">
              <label className="field mb-6">
                <span className="muted text-[13px]">Full name</span>
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  className="flow-input"
                  placeholder="As on the record"
                  value={f.name ?? ""}
                  onChange={(e) => set("name", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && f.name?.trim() && go("when")}
                />
              </label>
              <label className="field mb-8">
                <span className="muted text-[13px]">Call them</span>
                <input
                  className="flow-input flow-input-sm"
                  placeholder="A familiar name"
                  value={f.callName ?? ""}
                  onChange={(e) => set("callName", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && f.name?.trim() && go("when")}
                />
              </label>
              <button type="button" className="btn btn-primary" disabled={!f.name?.trim()} onClick={() => go("when")}>
                Continue
              </button>
            </StepShell>
          )}

          {step === "when" && (
            <StepShell kicker="The day" title="When were they born?" body="The calendar date in the place of birth.">
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                className="flow-input flow-input-sm mb-8"
                type="date"
                value={f.date ?? ""}
                onChange={(e) => set("date", e.target.value)}
              />
              <button type="button" className="btn btn-primary" disabled={!f.date} onClick={() => go("time")}>
                Continue
              </button>
            </StepShell>
          )}

          {step === "time" && (
            <StepShell
              kicker="The clock"
              title="What time, on the local clock?"
              body="Minutes matter. The rising sign can turn in a short window — we'll show you how wide that window is."
            >
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                className="flow-input flow-input-sm mb-6"
                type="time"
                value={f.time ?? ""}
                onChange={(e) => set("time", e.target.value)}
              />
              {roundTime && (
                <p className="note note-warn mb-6">
                  Times ending in :00 or :30 are often rounded. The next step asks how the time is known.
                </p>
              )}
              <button type="button" className="btn btn-primary" disabled={!f.time} onClick={() => go("source")}>
                Continue
              </button>
            </StepShell>
          )}

          {step === "source" && (
            <StepShell kicker="Certainty" title="How is that time known?" body="This sets the error bar the analysis will carry.">
              <div className="choice mb-4" role="radiogroup">
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
                  The analysis will treat this time as approximate. On the next screen you'll see how many minutes the
                  rising sign survives in each direction.
                </p>
              )}
              <button type="button" className="btn btn-primary" disabled={!f.timeSource} onClick={() => go("place")}>
                Continue
              </button>
            </StepShell>
          )}

          {step === "place" && (
            <StepShell kicker="Where" title="Where were they born?" body="Pick a place from the list so we can resolve coordinates and the historical time zone.">
              <div className="relative mb-4">
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
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
                {searching && <p className="muted text-[12.5px] mt-2">Searching…</p>}
                {results.length > 0 && (
                  <ul className="border hair rounded-[10px] mt-2 max-h-56 overflow-auto bg-[var(--paper)]" role="listbox" id="place-results">
                    {results.map((r, k) => (
                      <li key={k}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-[var(--paper-2)]"
                          onClick={() => {
                            setPlace(r);
                            setPlaceQuery(r.label);
                            setResults([]);
                          }}
                        >
                          {r.label}
                          <span className="muted text-[12.5px] ml-2">
                            {r.lat.toFixed(3)}, {r.lon.toFixed(3)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {place && (
                <p className="muted text-[13px] mb-4">
                  {place.lat.toFixed(4)}, {place.lon.toFixed(4)} · {place.tz ?? "no time zone found"}
                </p>
              )}
              <label className="flex items-center gap-2 mb-6 text-[13.5px]">
                <input type="checkbox" checked={manualOffset} onChange={(e) => setManualOffset(e.target.checked)} />
                Override UTC offset by hand
              </label>
              {manualOffset && (
                <input
                  className="input max-w-[12rem] mb-6"
                  type="number"
                  step="0.25"
                  placeholder="e.g. 5.5"
                  value={f.utcOffsetOverride ?? ""}
                  onChange={(e) => set("utcOffsetOverride", e.target.value === "" ? null : Number(e.target.value))}
                />
              )}
              <button type="button" className="btn btn-primary" disabled={!place} onClick={() => go("optional")}>
                Continue
              </button>
            </StepShell>
          )}

          {step === "optional" && (
            <StepShell
              kicker="Optional — can skip"
              title="Anything that should shape the later reports?"
              body="Held back from the model until you score the past-check. Skip if you'd rather keep the reading lean."
            >
              <label className="field mb-4">
                <span>Work or vocation</span>
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  className="input"
                  value={f.occupation ?? ""}
                  onChange={(e) => set("occupation", e.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label className="field mb-4">
                <span>A practice they already follow</span>
                <input className="input" value={f.practice ?? ""} onChange={(e) => set("practice", e.target.value)} placeholder="Optional" />
              </label>
              <label className="field mb-8">
                <span>A question behind the request</span>
                <textarea className="input" rows={2} value={f.question ?? ""} onChange={(e) => set("question", e.target.value)} placeholder="Optional" />
              </label>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn btn-primary" onClick={() => go(signedIn ? "compute" : "account")}>
                  Continue
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setF((x) => {
                      const next = { ...x };
                      delete next.occupation;
                      delete next.practice;
                      delete next.question;
                      return next;
                    });
                    go(signedIn ? "compute" : "account");
                  }}
                >
                  Skip for now
                </button>
              </div>
            </StepShell>
          )}

          {step === "account" && (
            <StepShell
              kicker="Save the reading"
              title="Create a quiet account so nothing is lost."
              body="Charts and scores live with you. No newsletter — just a place to return."
            >
              <label className="field mb-4">
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
              <label className="field mb-8">
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
              <button
                type="button"
                className="btn btn-primary"
                disabled={!email.trim() || password.length < 8}
                onClick={() => go("compute")}
              >
                Continue
              </button>
              <p className="mt-5 text-[13px] muted">
                Already have an account?{" "}
                <a href="#/auth" className="underline underline-offset-2">
                  Sign in
                </a>{" "}
                — your draft answers stay in this tab until you leave.
              </p>
            </StepShell>
          )}

          {step === "compute" && (
            <StepShell
              kicker="Ready"
              title={`Cast the chart for ${f.callName || f.name || "them"}.`}
              body={`${f.date} · ${f.time} · ${place?.label ?? "—"}. Next you'll confirm the rising sign before any model writing begins.`}
            >
              <dl className="panel-soft text-[14px] grid gap-2 mb-8">
                <div className="flex justify-between gap-4">
                  <dt className="muted">Name</dt>
                  <dd>{f.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="muted">Moment</dt>
                  <dd>
                    {f.date} {f.time}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="muted">Place</dt>
                  <dd className="text-right">{place?.label}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="muted">Time source</dt>
                  <dd>{SOURCES.find((s) => s.v === f.timeSource)?.label}</dd>
                </div>
              </dl>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={compute}>
                {busy ? "Computing the chart…" : "Compute the chart"}
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
  kicker,
  title,
  body,
  children,
}: {
  kicker: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="eyebrow text-[var(--gold)]">{kicker}</p>
      <h1 className="serif text-[clamp(1.85rem,4vw,2.45rem)] leading-[1.12] tracking-tight mt-2">{title}</h1>
      <p className="muted mt-4 mb-8 leading-relaxed">{body}</p>
      {children}
    </div>
  );
}
