"use client";
import { useState } from "react";
import type { Score } from "@/lib/types";

const DEMO = [
  {
    id: "A",
    period: "Ages 17–19",
    text: "A sudden move or long trip reshaped where home felt fixed.",
  },
  {
    id: "B",
    period: "Ages 24–26",
    text: "Work took a sharper turn — more responsibility, less room to drift.",
  },
  {
    id: "C",
    period: "Last three years",
    text: "Partnership or close friendship asked for a clearer yes or no.",
  },
] as const;

const OPTIONS: { v: Score; label: string; hint: string; mark: string }[] = [
  { v: "right", label: "Fits", hint: "This happened, in substance", mark: "F" },
  { v: "unclear", label: "Partly", hint: "Some of it, not all", mark: "P" },
  { v: "wrong", label: "No", hint: "It did not happen that way", mark: "N" },
];

/** Working fragment for the landing — real scoring interaction, sample claims only. */
export default function DemoScorecard() {
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<Partial<Record<string, Score>>>({});
  const claim = DEMO[index];
  const answered = DEMO.filter((c) => scores[c.id]).length;
  const done = answered === DEMO.length;

  function mark(v: Score) {
    const next = { ...scores, [claim.id]: v };
    setScores(next);
    if (index < DEMO.length - 1) {
      window.setTimeout(() => setIndex((i) => i + 1), 180);
    }
  }

  if (done) {
    const right = DEMO.filter((c) => scores[c.id] === "right").length;
    return (
      <div data-ui className="demo-score enter" role="status">
        <p className="demo-score-done">
          You marked <strong>{right}</strong> of {DEMO.length} as a close fit.
          In a real reading, that score opens forward counsel, only after the past is checked.
        </p>
        <button
          type="button"
          className="see-more mt-4"
          onClick={() => {
            setScores({});
            setIndex(0);
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div data-ui className="demo-score enter" aria-label="Sample past-check">
      <div className="demo-score-meta">
        <span>Sample claim {index + 1} of {DEMO.length}</span>
        <span>{answered} scored</span>
      </div>
      <p className="demo-score-period">{claim.period}</p>
      <p className="demo-score-claim">{claim.text}</p>
      <div className="score-choice" role="group" aria-label="Mark this claim">
        {OPTIONS.map((o) => (
          <button
            key={o.v}
            type="button"
            data-v={o.v}
            aria-pressed={scores[claim.id] === o.v}
            onClick={() => mark(o.v)}
          >
            <span className="score-mark">{o.mark}</span>
            <span className="min-w-0">
              <span className="block font-medium">{o.label}</span>
              <span className="block text-[13px] muted">{o.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
