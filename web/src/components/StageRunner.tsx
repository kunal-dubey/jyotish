"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { StageName, Status } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/types";
import { api, runStage, type LoadedReading } from "./api";
import CosmicLoader from "./CosmicLoader";
import ReportDigest from "./ReportDigest";

export type StageRunnerHandle = { run: () => void };

const SHAPE: Record<StageName, { resetTo: Status; produces: Status }> = {
  past: { resetTo: "confirmed", produces: "past_check" },
  reports: { resetTo: "scored", produces: "reports" },
  guidance: { resetTo: "reports", produces: "guidance" },
  protocol: { resetTo: "guidance", produces: "protocol" },
};

/** Stages where streaming prose is hidden — calm status UI instead. */
const QUIET_STREAM: Partial<Record<StageName, { title: string; steps: string[] }>> = {
  past: {
    title: "Preparing the past check",
    steps: [
      "Opening the birth chart",
      "Tracing periods already lived",
      "Drafting the foundation",
      "Forming concrete claims",
      "Separating control claims",
      "Almost ready",
    ],
  },
  reports: {
    title: "Writing the reports",
    steps: [
      "Reading your past score",
      "Mapping the current timeline",
      "Drafting vocation and direction",
      "Drafting the inner life",
      "Sorting solid from soft",
      "Almost ready",
    ],
  },
  guidance: {
    title: "Writing guidance",
    steps: [
      "Carrying the confidence forward",
      "Naming the decade’s pressure",
      "Ordering priorities",
      "Decoding practices",
      "Almost ready",
    ],
  },
  protocol: {
    title: "Building the living page",
    steps: [
      "Shaping the week’s rhythm",
      "Writing the decade’s seasons",
      "Packing counsel",
      "Choosing palette and type",
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

const StageRunner = forwardRef<
  StageRunnerHandle,
  {
    r: LoadedReading;
    stage: StageName;
    output?: string;
    showOutput?: boolean;
    /** When false, hide the idle Generate/Regenerate button (caller can trigger via ref). */
    showIdleButton?: boolean;
    label: string;
    onReading: (r: LoadedReading) => void;
    onBusyChange?: (busy: boolean) => void;
  }
>(function StageRunner(
  { r, stage, output, showOutput = true, showIdleButton = true, label, onReading, onBusyChange },
  ref,
) {
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
  const abortRef = useRef<AbortController | null>(null);
  const recoveredRef = useRef(false);

  const busyElsewhere = !!r.generating && r.generating !== stage && !running;
  const generatingHere = running || r.generating === stage;
  const has = !!output;
  const downstream = STATUS_ORDER.indexOf(r.status) > STATUS_ORDER.indexOf(SHAPE[stage].produces);
  const quiet = QUIET_STREAM[stage];

  useEffect(() => {
    onBusyChange?.(generatingHere);
  }, [generatingHere, onBusyChange]);

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

  // Stream can stall after the server already saved (common on long Vercel responses).
  // Poll the reading and finish the UI once this stage's output is present.
  useEffect(() => {
    if (!running) return;
    recoveredRef.current = false;
    const poll = window.setInterval(() => {
      api.get(r.id).then((x) => {
        if (recoveredRef.current || x.generating) return;
        const saved =
          (stage === "past" && !!(x.outputs.claims && x.outputs.claims.length > 0)) ||
          (stage === "reports" && !!x.outputs.reports) ||
          (stage === "guidance" && !!x.outputs.guidance) ||
          (stage === "protocol" && !!x.outputs.protocol);
        if (!saved) return;
        recoveredRef.current = true;
        abortRef.current?.abort();
        maxBar.current = 100;
        setBarPct(100);
        setRunning(false);
        startedAt.current = 0;
        onReading(x);
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(poll);
  }, [running, r.id, stage, onReading]);

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
    recoveredRef.current = false;
    setRunning(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await runStage(
        r.id,
        stage,
        {
          onThinking: (t) => {
            pending.current.thinking += t;
            schedule();
          },
          onText: (t) => {
            pending.current.text += t;
            schedule();
          },
          onDone: (next) => {
            if (recoveredRef.current) return;
            recoveredRef.current = true;
            maxBar.current = 100;
            setBarPct(100);
            setRunning(false);
            startedAt.current = 0;
            onReading(next);
          },
          onError: (m) => {
            if (recoveredRef.current || ac.signal.aborted) return;
            setErr(m);
            setRunning(false);
            startedAt.current = 0;
          },
        },
        ac.signal,
      );
    } catch (e) {
      if (!ac.signal.aborted && !recoveredRef.current) setErr((e as Error).message);
    } finally {
      setRunning(false);
      startedAt.current = 0;
    }
  }

  useImperativeHandle(ref, () => ({ run: go }));

  const stepIdx = quiet
    ? quietStepIndex(pending.current.thinking.length || thinking.length, text.length, elapsedSec)
    : 0;
  const steps = quiet?.steps ?? [];
  const showDigest = !generatingHere && has && showOutput && stage !== "protocol";
  const showIdle = !generatingHere && showIdleButton;
  const silent = !showIdle && !generatingHere && !showDigest && !err;

  return (
    <div className={`grid gap-5 sm:gap-6 min-w-0${silent ? " stage-runner--silent" : ""}`} hidden={silent || undefined}>
      {showIdle && (
        <div className="btn-row">
          <button
            type="button"
            className={`${has ? "btn" : "btn btn--primary"} w-full sm:w-auto`}
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
        <div className="stage-wait enter" role="status" aria-live="polite" aria-busy="true">
          <header className="stage-wait__head">
            <span className="stage-wait-ring" aria-hidden />
            <h3 className="stage-wait__title">{quiet.title}</h3>
          </header>
          <p className="stage-wait__lede">Usually a few minutes. Safe to leave this tab open.</p>
          <ol className="stage-wait-steps">
            {steps.map((labelText, i) => {
              const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
              return (
                <li key={labelText} data-state={state}>
                  <span className="stage-wait-mark" aria-hidden>
                    {state === "done" ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2.5 6.2 5 8.7 9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : state === "active" ? (
                      <span className="stage-wait-mark__dot" />
                    ) : null}
                  </span>
                  <span className="stage-wait-step__label">{labelText}</span>
                </li>
              );
            })}
          </ol>
          <div className="stage-wait-bar" aria-hidden>
            <div className="stage-wait-bar-fill" style={{ width: `${barPct}%` }} />
          </div>
        </div>
      )}

      {generatingHere && !quiet && (
        <div className="grid gap-3 panel-soft">
          <div className="flex items-center gap-2 text-[13px] muted">
            <CosmicLoader size="sm" /> {text ? "Writing" : "Reading the chart"}
          </div>
          {stage === "protocol" && text && (
            <p className="muted text-[13px]">Composing the protocol ({Math.round(text.length / 100) * 100}+ characters).</p>
          )}
        </div>
      )}

      {showDigest && <ReportDigest markdown={output!} />}
    </div>
  );
});

export default StageRunner;
