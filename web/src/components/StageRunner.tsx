"use client";
import { useEffect, useRef, useState } from "react";
import type { StageName, Status } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/types";
import { api, runStage, type LoadedReading } from "./api";
import ReportDigest from "./ReportDigest";

const SHAPE: Record<StageName, { resetTo: Status; produces: Status }> = {
  past: { resetTo: "confirmed", produces: "past_check" },
  reports: { resetTo: "scored", produces: "reports" },
  guidance: { resetTo: "reports", produces: "guidance" },
  protocol: { resetTo: "guidance", produces: "protocol" },
};

/** Stages where streaming prose is hidden — calm status UI instead. */
const QUIET_STREAM: Partial<Record<StageName, { title: string; steps: string[] }>> = {
  past: {
    title: "Preparing your blind past-check",
    steps: [
      "Opening the natal chart",
      "Tracing the periods you have already lived",
      "Drafting the foundation",
      "Forming concrete claims about the past",
      "Separating control claims from the rest",
      "Almost ready — claims arriving next",
    ],
  },
  reports: {
    title: "Writing Reports 3 to 6",
    steps: [
      "Reading your past-check score",
      "Mapping the current timeline",
      "Drafting vocation and direction",
      "Drafting the inner life",
      "Sorting what is solid from what is soft",
      "Almost ready",
    ],
  },
  guidance: {
    title: "Writing plain-language guidance",
    steps: [
      "Carrying the confidence ceiling forward",
      "Naming the decade's pressure",
      "Ordering priorities and practices",
      "Decoding remedies",
      "Almost ready",
    ],
  },
};

function quietStepIndex(thinkingLen: number, textLen: number, elapsedSec: number): number {
  if (textLen > 10000) return 5;
  if (textLen > 5000) return 4;
  if (textLen > 1200) return 3;
  if (textLen > 0) return 2;
  if (thinkingLen > 0) return 1;
  if (elapsedSec >= 25) return 1;
  return 0;
}

function quietProgressPct(thinkingLen: number, textLen: number, elapsedSec: number): number {
  const timePct = 72 * (1 - Math.exp(-elapsedSec / 90));
  let milestone = 8;
  if (thinkingLen > 0) milestone = Math.max(milestone, 22);
  if (textLen > 0) milestone = Math.max(milestone, 38);
  if (textLen > 1200) milestone = Math.max(milestone, 52);
  if (textLen > 4000) milestone = Math.max(milestone, 68);
  if (textLen > 8000) milestone = Math.max(milestone, 82);
  if (textLen > 14000) milestone = Math.max(milestone, 90);
  return Math.min(94, Math.max(timePct, milestone));
}

export default function StageRunner({
  r,
  stage,
  output,
  showOutput = true,
  label,
  onReading,
}: {
  r: LoadedReading;
  stage: StageName;
  output?: string;
  showOutput?: boolean;
  label: string;
  onReading: (r: LoadedReading) => void;
}) {
  const [running, setRunning] = useState(false);
  const [thinking, setThinking] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [barPct, setBarPct] = useState(8);
  const pending = useRef({ thinking: "", text: "" });
  const frame = useRef<number>(0);
  const startedAt = useRef<number>(0);
  const maxBar = useRef(8);

  const busyElsewhere = !!r.generating && r.generating !== stage && !running;
  const generatingHere = running || r.generating === stage;
  const has = !!output;
  const downstream = STATUS_ORDER.indexOf(r.status) > STATUS_ORDER.indexOf(SHAPE[stage].produces);
  const quiet = QUIET_STREAM[stage];

  useEffect(() => {
    if (!generatingHere || !quiet) return;
    startedAt.current = startedAt.current || Date.now();
    const id = window.setInterval(() => {
      const sec = (Date.now() - startedAt.current) / 1000;
      setElapsedSec(sec);
      const next = quietProgressPct(pending.current.thinking.length, pending.current.text.length, sec);
      if (next > maxBar.current) {
        maxBar.current = next;
        setBarPct(next);
      }
    }, 400);
    return () => clearInterval(id);
  }, [generatingHere, quiet]);

  function flush() {
    frame.current = 0;
    setThinking(pending.current.thinking.slice(-600));
    setText(pending.current.text);
    if (quiet && startedAt.current) {
      const sec = (Date.now() - startedAt.current) / 1000;
      const next = quietProgressPct(pending.current.thinking.length, pending.current.text.length, sec);
      if (next > maxBar.current) {
        maxBar.current = next;
        setBarPct(next);
      }
    }
  }
  function schedule() {
    if (!frame.current) frame.current = requestAnimationFrame(flush);
  }

  async function go() {
    setErr(null);
    if (has) {
      if (downstream && !confirm("Regenerating this discards every later stage. Continue?")) return;
      try {
        onReading(await api.patch(r.id, { action: "reset", to: SHAPE[stage].resetTo }));
      } catch (e) {
        return setErr((e as Error).message);
      }
    }
    pending.current = { thinking: "", text: "" };
    setThinking("");
    setText("");
    setElapsedSec(0);
    maxBar.current = 8;
    setBarPct(8);
    startedAt.current = Date.now();
    setRunning(true);
    await runStage(r.id, stage, {
      onThinking: (t) => {
        pending.current.thinking += t;
        schedule();
      },
      onText: (t) => {
        pending.current.text += t;
        schedule();
      },
      onDone: (next) => {
        maxBar.current = 100;
        setBarPct(100);
        onReading(next);
      },
      onError: (m) => setErr(m),
    });
    setRunning(false);
    startedAt.current = 0;
  }

  const stepIdx = quiet
    ? quietStepIndex(pending.current.thinking.length || thinking.length, text.length, elapsedSec)
    : 0;
  const steps = quiet?.steps ?? [];

  return (
    <div className="grid gap-5 sm:gap-6 min-w-0">
      {!generatingHere && (
        <div className="btn-row">
          <button
            type="button"
            className={`${has ? "btn" : "btn btn-primary"} w-full sm:w-auto`}
            onClick={go}
            disabled={busyElsewhere}
          >
            {has ? "Regenerate" : label}
          </button>
          {busyElsewhere && <span className="muted text-[13px]">Another stage is generating ({r.generating}).</span>}
        </div>
      )}

      {err && <p className="note note-bad">{err}</p>}

      {generatingHere && quiet && (
        <div className="stage-wait panel-soft enter" role="status" aria-live="polite" aria-busy="true">
          <div className="stage-wait-orb" aria-hidden />
          <div className="flex items-center gap-3">
            <span className="stage-wait-ring" aria-hidden />
            <div className="min-w-0">
              <p className="eyebrow text-[var(--gold)]">Working</p>
              <p className="serif text-[clamp(1.25rem,3.5vw,1.55rem)] leading-snug mt-1">{quiet.title}</p>
            </div>
          </div>
          <p className="muted text-[14px] mt-3 leading-relaxed max-w-[32rem]">
            This usually takes a few minutes. The long draft stays out of the way — you will get a short, sectioned
            reading when it is ready.
          </p>
          <ol className="stage-wait-steps mt-6">
            {steps.map((labelText, i) => {
              const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
              return (
                <li key={labelText} data-state={state}>
                  <span className="stage-wait-mark" aria-hidden>
                    {state === "done" ? "✓" : ""}
                  </span>
                  <span>{labelText}</span>
                </li>
              );
            })}
          </ol>
          <div className="stage-wait-bar mt-5" aria-hidden>
            <div className="stage-wait-bar-fill" style={{ width: `${barPct}%` }} />
          </div>
          <p className="muted text-[12.5px] mt-3">Still working — safe to leave this tab open.</p>
        </div>
      )}

      {generatingHere && !quiet && (
        <div className="grid gap-3 panel-soft">
          <div className="flex items-center gap-2 text-[13px] muted">
            <span className="pulse" aria-hidden /> {text ? "Writing" : "Reading the chart"}
          </div>
          {stage === "protocol" && text && (
            <p className="muted text-[13px]">Composing the protocol ({Math.round(text.length / 100) * 100}+ characters).</p>
          )}
        </div>
      )}

      {!generatingHere && has && showOutput && stage !== "protocol" && <ReportDigest markdown={output!} />}
    </div>
  );
}
