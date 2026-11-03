"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Score } from "@/lib/types";
import { api, type LoadedReading } from "./api";
import ReportDigest, { splitReportSections } from "./ReportDigest";

const OPTIONS: { v: Score; label: string }[] = [
  { v: "right", label: "Fits" },
  { v: "unclear", label: "Partly" },
  { v: "wrong", label: "No" },
];

/** Age only — drop dasha names and calendar dates from the period label. */
function claimAge(raw: string | undefined, index: number): string {
  const text = (raw || "").trim();
  if (!text) return `Claim ${index + 1}`;

  const ageMatch = text.match(/\bages?\s+([^,;|·•]+)/i);
  if (ageMatch) {
    return `Age ${ageMatch[1].trim().replace(/\s+to\s+/gi, "–").replace(/\s+[–—]\s+/g, "–")}`;
  }
  return `Claim ${index + 1}`;
}

/** Practitioner view: foundation / disclosure — not the scorable claim list. */
function practitionerPastMarkdown(past: string | undefined): string {
  const text = (past || "").trim();
  if (!text) return "";
  const sections = splitReportSections(text);
  const kept = sections.filter((s) => !/past-check|report\s*2|^claims$/i.test(s.title));
  const use = kept.length ? kept : sections;
  return use
    .map((s) => (s.id.endsWith("-intro") || s.title === "Overview" ? s.body : `## ${s.title}\n\n${s.body}`))
    .join("\n\n")
    .trim();
}

export default function ScorePanel({ r, onReading }: { r: LoadedReading; onReading: (r: LoadedReading) => void }) {
  const claims = r.outputs.claims ?? [];
  const locked = !(r.status === "past_check" || r.status === "scored");
  const submitted = r.status === "scored" || (locked && r.status !== "past_check");
  const canEdit = !locked && !submitted;
  const [scores, setScores] = useState<Record<string, Score>>(r.scores);
  const [notes, setNotes] = useState<Record<string, string>>(r.scoreNotes);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [claimIndex, setClaimIndex] = useState(0);
  const [showJump, setShowJump] = useState(false);
  const [showFoundation, setShowFoundation] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [advanceTick, setAdvanceTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastSaved = useRef(JSON.stringify([r.scores, r.scoreNotes]));
  const jumpRef = useRef<HTMLElement>(null);
  const foundationRef = useRef<HTMLDialogElement>(null);

  const foundationMd = useMemo(() => practitionerPastMarkdown(r.outputs.past), [r.outputs.past]);

  function cancelAdvance() {
    clearTimeout(advanceTimer.current);
    advanceTimer.current = undefined;
    setAdvancing(false);
  }

  function scheduleAdvance(fromId: string, nextScores: Record<string, Score>) {
    cancelAdvance();
    const idx = claims.findIndex((c) => c.id === fromId);
    if (idx < 0) return;
    const nextOpen = claims.findIndex((c, i) => i > idx && !nextScores[c.id]);
    if (nextOpen < 0) return;
    setAdvancing(true);
    setAdvanceTick((t) => t + 1);
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = undefined;
      setAdvancing(false);
      setClaimIndex(nextOpen);
    }, 2000);
  }

  useEffect(() => () => {
    clearTimeout(advanceTimer.current);
  }, []);

  useEffect(() => {
    const snap = JSON.stringify([scores, notes]);
    if (!canEdit || snap === lastSaved.current) return;
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

  useEffect(() => {
    if (!claims.length) return;
    setClaimIndex((i) => Math.min(Math.max(0, i), claims.length - 1));
  }, [claims.length]);

  useEffect(() => {
    if (!showJump || !jumpRef.current) return;
    const current = jumpRef.current.querySelector<HTMLElement>(".linkbtn.is-on");
    current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [claimIndex, showJump]);

  useEffect(() => {
    const el = foundationRef.current;
    if (!el) return;
    if (showFoundation && !el.open) el.showModal();
    if (!showFoundation && el.open) el.close();
  }, [showFoundation]);

  const answered = claims.filter((c) => scores[c.id]).length;
  const done = claims.every((c) => scores[c.id]);
  const claim = claims[claimIndex];
  const chosen = claim ? scores[claim.id] : undefined;
  const age = claim ? claimAge(claim.period, claimIndex) : "";
  const note = claim ? (notes[claim.id] ?? "") : "";

  function mark(id: string, v: Score) {
    if (!canEdit) return;
    const prev = scores;
    if (prev[id] === v) {
      cancelAdvance();
      const next = { ...prev };
      delete next[id];
      setScores(next);
      return;
    }
    const next = { ...prev, [id]: v };
    setScores(next);
    scheduleAdvance(id, next);
  }

  function clearScore(id: string) {
    if (!canEdit) return;
    cancelAdvance();
    setScores((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function setNote(id: string, value: string) {
    if (!canEdit) return;
    setNotes((prev) => {
      const trimmed = value;
      if (!trimmed.trim()) {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: trimmed };
    });
  }

  function stepClaim(delta: number) {
    if (!claims.length) return;
    cancelAdvance();
    setClaimIndex((i) => (i + delta + claims.length) % claims.length);
    setShowJump(false);
  }

  function selectClaim(i: number) {
    cancelAdvance();
    setClaimIndex(i);
    setShowJump(false);
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

  async function resetPast() {
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
  }

  if (!claims.length || !claim) return null;

  const progressLabel =
    canEdit && saving === "saving" ? "Saving…" : `${answered} of ${claims.length} scored`;
  const scoreLocked = locked && r.status !== "scored";

  return (
    <div className="past-shell enter" data-ui>
      <article
        className="atlas-reader past-reader fade-claim"
        key={claim.id}
        aria-labelledby={`claim-label-${claim.id}`}
      >
        <div className="past-top">
          <nav className="atlas-crumb" aria-label="Location">
            <button
              type="button"
              className={`atlas-crumb__link${showJump ? " is-on" : ""}`}
              aria-expanded={showJump}
              aria-haspopup="listbox"
              onClick={() => setShowJump((v) => !v)}
            >
              Claims
            </button>
            <span className="atlas-crumb__sep" aria-hidden>
              ›
            </span>
            <span className="atlas-crumb__here">{age}</span>
            <span className="atlas-crumb__hint">Click the trail to switch sections</span>
          </nav>
          <p className="past-progress" aria-live="polite">
            {progressLabel}
          </p>
        </div>

        {showJump ? (
          <nav ref={jumpRef} className="atlas-more atlas-crumb-menu" aria-label="All claims">
            {claims.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className={`linkbtn${i === claimIndex ? " is-on" : ""}`}
                aria-current={i === claimIndex ? "true" : undefined}
                onClick={() => selectClaim(i)}
              >
                {c.control ? "C · " : ""}
                {claimAge(c.period, i)}
                {scores[c.id] ? " · scored" : ""}
              </button>
            ))}
          </nav>
        ) : null}

        <header className="atlas-reader__head">
          <h3 className="atlas-reader__title">{age}</h3>
          {claim.control ? <p className="atlas-reader__practice">Control claim — score it the same way</p> : null}
        </header>

        <div className="atlas-reader__body">
          <p className="atlas-reader__watch" id={`claim-label-${claim.id}`}>
            {claim.text}
          </p>
        </div>

        <div className="past-score" role="group" aria-label={`Score claim ${claimIndex + 1}`}>
          <div className="past-score__head">
            <p className="past-score__label">How well does this fit?</p>
            {chosen && canEdit ? (
              <button type="button" className="linkbtn past-score__clear" onClick={() => clearScore(claim.id)}>
                Clear selection
              </button>
            ) : null}
          </div>
          <div className="seg seg--roomy past-score__seg">
            {OPTIONS.map((o) => (
              <label key={o.v}>
                <input
                  type="radio"
                  name={`claim-${claim.id}`}
                  value={o.v}
                  checked={chosen === o.v}
                  disabled={scoreLocked}
                  onClick={(e) => {
                    if (!canEdit) return;
                    if (chosen === o.v) {
                      e.preventDefault();
                      clearScore(claim.id);
                    }
                  }}
                  onChange={() => mark(claim.id, o.v)}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
          {advancing ? (
            <div className="past-advance" role="status" aria-live="polite" aria-label="Moving to the next claim">
              <div key={advanceTick} className="past-advance__fill" />
            </div>
          ) : null}
        </div>

        <div className="field past-note">
          <label htmlFor={`claim-note-${claim.id}`}>Additional note</label>
          <textarea
            id={`claim-note-${claim.id}`}
            className="input past-note__input"
            rows={2}
            value={note}
            disabled={!canEdit}
            placeholder="Optional — anything you want remembered with this score"
            onChange={(e) => setNote(claim.id, e.target.value)}
          />
        </div>

        <footer className="atlas-reader__foot">
          <div className="atlas-foot__primary">
            <div className="atlas-links" role="group" aria-label="Claim actions">
              <button
                type="button"
                className={`linkbtn${showFoundation ? " is-on" : ""}`}
                aria-haspopup="dialog"
                aria-expanded={showFoundation}
                onClick={() => setShowFoundation(true)}
                disabled={!foundationMd}
              >
                Foundation
              </button>
              {!submitted && done ? (
                <button type="button" className="btn btn--primary btn--sm" disabled={locked} onClick={submit}>
                  Save scores
                </button>
              ) : null}
              {locked ? (
                <button type="button" className="linkbtn" onClick={resetPast}>
                  Reset
                </button>
              ) : null}
            </div>

            <div className="atlas-nav" aria-label="Claim navigation">
              <button
                type="button"
                className="btn btn--ghost btn--sm atlas-nav__btn"
                aria-label="Previous claim"
                onClick={() => stepClaim(-1)}
              >
                ‹
              </button>
              <span className="atlas-nav__pos" aria-live="polite">
                {claimIndex + 1} / {claims.length}
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm atlas-nav__btn"
                aria-label="Next claim"
                onClick={() => stepClaim(1)}
              >
                ›
              </button>
            </div>
          </div>
        </footer>
      </article>

      <dialog
        ref={foundationRef}
        className="dialog dialog--wide dialog--foundation"
        aria-labelledby="foundation-dialog-title"
        onClose={() => setShowFoundation(false)}
        onCancel={() => setShowFoundation(false)}
      >
        <div className="dialog__in">
          <div className="dialog__head">
            <h2 id="foundation-dialog-title" className="dialog__title">
              Foundation
            </h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={() => setShowFoundation(false)}>
              ×
            </button>
          </div>
          <p className="dialog__lede">
            Disclosure, computation notes, and the foundation write-up for practitioners. Scoring stays on the claims.
          </p>
          <div className="dialog__section past-foundation-body">
            {foundationMd ? (
              <ReportDigest markdown={foundationMd} emptyHint="No foundation text yet." />
            ) : (
              <p className="note note-warn">No foundation document on this reading yet.</p>
            )}
          </div>
          <div className="dialog__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setShowFoundation(false)}>
              Close
            </button>
          </div>
        </div>
      </dialog>

      {err ? <p className="note note-bad">{err}</p> : null}
    </div>
  );
}
