"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Score } from "@/lib/types";
import { api, type LoadedReading } from "./api";

const OPTIONS: { v: Score; label: string; hint: string; mark: string }[] = [
  { v: "right", label: "Right", hint: "This happened, in substance", mark: "R" },
  { v: "wrong", label: "Wrong", hint: "It did not happen that way", mark: "W" },
  { v: "unclear", label: "Unclear", hint: "Too fuzzy to call", mark: "?" },
];

export default function ScorePanel({ r, onReading }: { r: LoadedReading; onReading: (r: LoadedReading) => void }) {
  const claims = r.outputs.claims ?? [];
  const locked = !(r.status === "past_check" || r.status === "scored");
  const [scores, setScores] = useState<Record<string, Score>>(r.scores);
  const [notes, setNotes] = useState<Record<string, string>>(r.scoreNotes);
  const [index, setIndex] = useState(() => {
    const firstOpen = claims.findIndex((c) => !r.scores[c.id]);
    return firstOpen >= 0 ? firstOpen : 0;
  });
  const [showNote, setShowNote] = useState(false);
  const [mode, setMode] = useState<"card" | "review">(() =>
    r.status === "scored" || locked ? "review" : "card",
  );
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastSaved = useRef(JSON.stringify([r.scores, r.scoreNotes]));

  useEffect(() => {
    const snap = JSON.stringify([scores, notes]);
    if (locked || snap === lastSaved.current) return;
    lastSaved.current = snap;
    clearTimeout(timer.current);
    setSaving("saving");
    timer.current = setTimeout(async () => {
      try {
        onReading(await api.patch(r.id, { action: "score", scores, notes, final: false }));
        setSaving("saved");
      } catch (e) {
        setErr((e as Error).message);
        setSaving("idle");
      }
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, notes]);

  const tally = useMemo(() => {
    const t = { right: 0, wrong: 0, unclear: 0 };
    for (const c of claims) if (scores[c.id]) t[scores[c.id]]++;
    return t;
  }, [claims, scores]);

  const done = claims.every((c) => scores[c.id]);
  const decidable = tally.right + tally.wrong;
  const claim = claims[index];
  const answered = claims.filter((c) => scores[c.id]).length;
  const pct = claims.length ? Math.round((answered / claims.length) * 100) : 0;

  function mark(v: Score) {
    if (!claim || locked) return;
    const next = { ...scores, [claim.id]: v };
    setScores(next);
    const allDone = claims.every((c) => next[c.id]);
    if (allDone) {
      window.setTimeout(() => setMode("review"), 280);
      return;
    }
    if (index < claims.length - 1) {
      window.setTimeout(() => {
        setIndex((i) => i + 1);
        setShowNote(false);
      }, 220);
    }
  }

  async function submit() {
    setErr(null);
    clearTimeout(timer.current);
    try {
      onReading(await api.patch(r.id, { action: "score", scores, notes, final: true }));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  if (!claims.length) return null;

  if (mode === "review") {
    return (
      <section className="grid gap-8 enter" aria-labelledby="score-h">
        <header className="max-w-[36rem]">
          <p className="eyebrow text-[var(--gold)]">Blind past-check</p>
          <h2 id="score-h" className="serif text-[clamp(1.8rem,3.5vw,2.4rem)] leading-tight mt-1">
            Your score
          </h2>
          <p className="mt-3 muted">
            <span className="text-[var(--ok)] font-semibold">{tally.right}</span> right ·{" "}
            <span className="text-[var(--bad)] font-semibold">{tally.wrong}</span> wrong ·{" "}
            <span className="font-semibold">{tally.unclear}</span> unclear
            {decidable > 0 && (
              <span> · {Math.round((100 * tally.right) / decidable)}% of decidable claims</span>
            )}
          </p>
        </header>

        <ol className="grid gap-2">
          {claims.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                className="panel w-full text-left grid md:grid-cols-[3rem_minmax(0,1fr)_auto] gap-3 items-start"
                onClick={() => {
                  if (locked && r.status !== "scored") return;
                  setMode("card");
                  setIndex(i);
                  setShowNote(!!notes[c.id]);
                }}
              >
                <span className="serif muted">{c.id}</span>
                <span>
                  <span className="block text-[12px] muted">{c.period}</span>
                  <span className="serif text-[16px] leading-snug">{c.text}</span>
                </span>
                <span className="text-[12.5px] uppercase tracking-wide font-medium">{scores[c.id] ?? "—"}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-3">
          {!locked && r.status === "past_check" && (
            <>
              <button type="button" className="btn" onClick={() => setMode("card")}>
                Adjust marks
              </button>
              <button type="button" className="btn btn-primary" disabled={!done} onClick={submit}>
                Lock the score & continue
              </button>
            </>
          )}
          {r.status === "scored" && (
            <span className="muted text-[13px]">Score submitted. Tap a claim to revise before later reports are written.</span>
          )}
          {locked && r.status !== "scored" && (
            <span className="muted text-[13px]">Locked: later reports were written against this score.</span>
          )}
          <span className="muted text-[12.5px] ml-auto">
            {saving === "saving" ? "Saving…" : saving === "saved" ? "Draft saved" : ""}
          </span>
        </div>
        {err && <p className="note note-bad">{err}</p>}
      </section>
    );
  }

  if (!claim) return null;

  return (
    <section className="grid gap-6 enter" aria-labelledby="score-h">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow text-[var(--gold)]">Hard stop · Blind past-check</p>
          <h2 id="score-h" className="serif text-[clamp(1.7rem,3.2vw,2.2rem)] leading-tight mt-1">
            Did this happen?
          </h2>
        </div>
        <div className="text-right min-w-[8rem]">
          <p className="text-[12.5px] muted mb-1">
            {answered} of {claims.length}
          </p>
          <div className="progress-track w-36 ml-auto">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <p className="muted text-[14px] max-w-[36rem]">
        Score from what actually occurred — before reading anything forward. Notes are optional; the model sees them with
        your marks.
      </p>

      <div key={claim.id} className="panel-soft fade-claim grid gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="serif text-[20px] muted">{claim.id}</span>
          {claim.control && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--accent-wash)] text-[11px] uppercase tracking-wider">
              control
            </span>
          )}
          <span className="text-[12.5px] muted ml-auto">{claim.period}</span>
        </div>
        <p className="serif text-[clamp(1.25rem,2.8vw,1.55rem)] leading-snug">{claim.text}</p>

        <div className="score-choice" role="group" aria-label={`Score for ${claim.id}`}>
          {OPTIONS.map((o) => (
            <button
              key={o.v}
              type="button"
              data-v={o.v}
              aria-pressed={scores[claim.id] === o.v}
              disabled={locked}
              onClick={() => mark(o.v)}
            >
              <span className="score-mark">{o.mark}</span>
              <span>
                <span className="block font-medium">{o.label}</span>
                <span className="block text-[12.5px] muted">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>

        {(showNote || notes[claim.id]) && (
          <input
            className="input"
            placeholder="What actually happened (optional)"
            value={notes[claim.id] ?? ""}
            disabled={locked}
            onChange={(e) => setNotes((n) => ({ ...n, [claim.id]: e.target.value }))}
          />
        )}
        {!showNote && !notes[claim.id] && !locked && (
          <button type="button" className="see-more justify-self-start" onClick={() => setShowNote(true)}>
            Add a private note
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-quiet"
          disabled={index === 0}
          onClick={() => {
            setIndex((i) => i - 1);
            setShowNote(false);
          }}
        >
          ← Previous
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          disabled={index >= claims.length - 1}
          onClick={() => {
            setIndex((i) => i + 1);
            setShowNote(false);
          }}
        >
          Skip ahead →
        </button>
        {done && (
          <button type="button" className="btn btn-primary ml-auto" onClick={() => setMode("review")}>
            Review & submit
          </button>
        )}
        {!done && (
          <span className="muted text-[12.5px] ml-auto">
            {saving === "saving" ? "Saving…" : saving === "saved" ? "Draft saved" : ""}
          </span>
        )}
      </div>
      {err && <p className="note note-bad">{err}</p>}
    </section>
  );
}
