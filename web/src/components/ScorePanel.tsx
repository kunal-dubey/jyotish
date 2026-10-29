"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Score } from "@/lib/types";
import { api, type LoadedReading } from "./api";

/** Fits=2, Partly=1, No=0. Pass line is just over half of n×2 (7/12 of max). */
const OPTIONS: { v: Score; label: string; points: number }[] = [
  { v: "right", label: "Fits", points: 2 },
  { v: "unclear", label: "Partly", points: 1 },
  { v: "wrong", label: "No", points: 0 },
];
const POINTS: Record<Score, number> = { right: 2, unclear: 1, wrong: 0 };

function scoreScale(claimCount: number) {
  const maxPoints = Math.max(0, claimCount * 2);
  const passLine = maxPoints === 0 ? 0 : Math.max(1, Math.round((maxPoints * 7) / 12));
  return { maxPoints, passLine };
}

export default function ScorePanel({ r, onReading }: { r: LoadedReading; onReading: (r: LoadedReading) => void }) {
  const claims = r.outputs.claims ?? [];
  const locked = !(r.status === "past_check" || r.status === "scored");
  const submitted = r.status === "scored" || (locked && r.status !== "past_check");
  const [scores, setScores] = useState<Record<string, Score>>(r.scores);
  const [notes] = useState<Record<string, string>>(r.scoreNotes);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastSaved = useRef(JSON.stringify([r.scores, r.scoreNotes]));

  useEffect(() => {
    const snap = JSON.stringify([scores, notes]);
    if (locked || submitted || snap === lastSaved.current) return;
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

  const answered = claims.filter((c) => scores[c.id]).length;
  const done = claims.every((c) => scores[c.id]);
  const points = claims.reduce((sum, c) => sum + (scores[c.id] ? POINTS[scores[c.id]] : 0), 0);
  const { maxPoints, passLine } = scoreScale(claims.length);
  const pass = points >= passLine;

  function mark(id: string, v: Score) {
    if (locked || submitted) return;
    setScores((prev) => ({ ...prev, [id]: v }));
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

  return (
    <div className="grid gap-4 enter" data-ui>
      {submitted ? (
        <div className={`result${pass ? "" : " result--warn"}`} id="score-result" tabIndex={-1}>
          <p className="result__score num">
            {points}
            <span>/{maxPoints}</span>
          </p>
          <h3 className="result__title">{pass ? "Above the Pass Line" : "Below the Pass Line"}</h3>
          <p className="body">
            {tally.right} of {claims.length} statements fit closely.{" "}
            {pass
              ? "The chart described enough of what already happened, so the reports are open."
              : `You are under the ${passLine}-point pass line. The reports still open, with a note to read them as suggestions rather than forecasts.`}
          </p>
          {!locked && r.status === "scored" && (
            <div className="result__actions">
              <p className="small">Score submitted. Change answers below before later reports are written.</p>
            </div>
          )}
          {locked && (
            <div className="result__actions" style={{ marginTop: 12 }}>
              <p className="small">
                Scores are locked because later reports already exist. Reset to the past-check if you need to change
                answers — that clears later stages so they can be rewritten.
              </p>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ marginTop: 8 }}
                onClick={async () => {
                  if (
                    !confirm(
                      "Reset to the past-check? Forward reports, guidance, and the living page will be cleared so you can rescore.",
                    )
                  ) {
                    return;
                  }
                  setErr(null);
                  try {
                    onReading(await api.patch(r.id, { action: "reset", to: "past_check" }));
                  } catch (e) {
                    setErr((e as Error).message);
                  }
                }}
              >
                Reset to past-check
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="why">
          <p className="small">
            Why this comes before the reports. If the chart cannot describe what already happened, its forecasts are
            decoration. Score each statement against what actually happened. The pass line is {passLine} of {maxPoints}.
          </p>
        </div>
      )}

      <ol className="claims">
        {claims.map((c) => {
          const chosen = scores[c.id];
          return (
            <li key={c.id} className={`claim${chosen ? " is-answered" : ""}`} role="group" aria-labelledby={`claim-label-${c.id}`}>
              <div>
                <div className="claim__chrome">
                  <span className="claim__id">{c.id}</span>
                  {c.control ? <span className="claim__tag claim__tag--control">Control</span> : null}
                  {c.period ? <span className="claim__tag" title="Period label from the past-check">
                    {c.period}
                  </span> : null}
                </div>
                <p className="claim__text" id={`claim-label-${c.id}`}>
                  {c.text}
                </p>
                {c.control ? (
                  <p className="small muted" style={{ marginTop: 6 }}>
                    Control claim — scores method quality, not only life fit.
                  </p>
                ) : null}
              </div>
              <div className="seg" role="radiogroup" aria-label={`Score ${c.id}`}>
                {OPTIONS.map((o) => (
                  <label key={o.v}>
                    <input
                      type="radio"
                      name={`claim-${c.id}`}
                      value={o.v}
                      checked={chosen === o.v}
                      disabled={locked && r.status !== "scored"}
                      onChange={() => mark(c.id, o.v)}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      {!submitted && (
        <div className="scorebar">
          <p aria-live="polite">
            <strong className="num">
              {answered} of {claims.length}
            </strong>{" "}
            scored
            {saving === "saving" ? " · Saving…" : saving === "saved" ? " · Draft saved" : ""}
          </p>
          <button type="button" className="btn btn--primary" disabled={!done || locked} onClick={submit}>
            Save Scores
          </button>
        </div>
      )}

      {err && <p className="note note-bad">{err}</p>}
    </div>
  );
}
