"use client";
import { useEffect, useRef, useState } from "react";
import type { Score } from "@/lib/types";
import { api, type LoadedReading } from "./api";

const OPTIONS: { v: Score; label: string }[] = [
  { v: "right", label: "Right" },
  { v: "wrong", label: "Wrong" },
  { v: "unclear", label: "Unclear" },
];

export default function ScorePanel({ r, onReading }: { r: LoadedReading; onReading: (r: LoadedReading) => void }) {
  const claims = r.outputs.claims ?? [];
  const locked = !(r.status === "past_check" || r.status === "scored");
  const [scores, setScores] = useState<Record<string, Score>>(r.scores);
  const [notes, setNotes] = useState<Record<string, string>>(r.scoreNotes);
  const [openNote, setOpenNote] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastSaved = useRef(JSON.stringify([r.scores, r.scoreNotes]));

  // Draft autosave, without advancing the stage. Skips when nothing changed.
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

  const tally = { right: 0, wrong: 0, unclear: 0 };
  for (const c of claims) if (scores[c.id]) tally[scores[c.id]]++;
  const done = claims.every((c) => scores[c.id]);
  const decidable = tally.right + tally.wrong;

  async function submit() {
    setErr(null);
    clearTimeout(timer.current);
    try {
      onReading(await api.patch(r.id, { action: "score", scores, notes, final: true }));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <section aria-labelledby="score-h" className="grid gap-6 border-t hair pt-10">
      <div className="max-w-[40rem]">
        <p className="eyebrow text-[var(--gold)]">Hard stop 2</p>
        <h2 id="score-h" className="serif text-[30px] leading-tight mt-1">Score the past-check</h2>
        <p className="mt-3 muted">
          Mark each claim right, wrong or unclear, from what actually happened. Score before reading anything forward: the
          score is the only honest measure of how much weight the remaining reports deserve, and it is worthless once
          the forward material has been seen.
        </p>
      </div>

      <ol className="grid border-t hair">
        {claims.map((c) => (
          <li key={c.id} className="grid md:grid-cols-[3rem_minmax(0,1fr)_auto] gap-x-4 gap-y-2 py-4 border-b hair">
            <span className="serif text-[18px] muted">{c.id}</span>
            <div>
              <div className="text-[12.5px] muted">
                {c.period}
                {c.control && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-[3px] bg-[var(--accent-wash)] text-[var(--ink)] text-[11px] uppercase tracking-wider">
                    control
                  </span>
                )}
              </div>
              <p className="serif text-[17px] leading-snug mt-0.5">{c.text}</p>
              {(openNote[c.id] || notes[c.id]) && (
                <input
                  className="input mt-2 text-[14px]"
                  placeholder="What actually happened (optional; the model sees this)"
                  value={notes[c.id] ?? ""}
                  disabled={locked}
                  onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                />
              )}
            </div>
            <div className="flex md:flex-col items-start md:items-end gap-2">
              <div className="seg" role="group" aria-label={`Score for ${c.id}`}>
                {OPTIONS.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    data-v={o.v}
                    aria-pressed={scores[c.id] === o.v}
                    disabled={locked}
                    onClick={() => setScores((s) => ({ ...s, [c.id]: o.v }))}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {!openNote[c.id] && !notes[c.id] && !locked && (
                <button className="btn-quiet text-[12.5px] muted underline underline-offset-2" onClick={() => setOpenNote((n) => ({ ...n, [c.id]: true }))}>
                  add a note
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-4">
        <p className="text-[14px]">
          <span className="text-[var(--ok)] font-semibold">{tally.right}</span> right ·{" "}
          <span className="text-[var(--bad)] font-semibold">{tally.wrong}</span> wrong ·{" "}
          <span className="font-semibold">{tally.unclear}</span> unclear · {claims.length - tally.right - tally.wrong - tally.unclear} left
          {decidable > 0 && <span className="muted"> · {Math.round((100 * tally.right) / decidable)}% of decidable claims right</span>}
        </p>
        <span className="muted text-[12.5px]">{saving === "saving" ? "Saving draft…" : saving === "saved" ? "Draft saved" : ""}</span>
        {!locked && r.status === "past_check" && (
          <button className="btn btn-primary ml-auto" disabled={!done} onClick={submit}>
            Submit the score
          </button>
        )}
        {r.status === "scored" && <span className="ml-auto muted text-[13px]">Score submitted. Changing a mark reopens it.</span>}
        {locked && <span className="ml-auto muted text-[13px]">Locked: later reports were written against this score.</span>}
      </div>
      {err && <p className="note note-bad">{err}</p>}
    </section>
  );
}
