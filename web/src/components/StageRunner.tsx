"use client";
import { useEffect, useRef, useState } from "react";
import type { StageName, Status } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/types";
import { api, runStage, type LoadedReading } from "./api";
import Markdown from "./Markdown";

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
};

function cost(u?: { input: number; output: number; cacheRead: number }) {
  if (!u) return null;
  return (u.input * 4 + u.output * 20 + u.cacheRead * 0.2) / 1e6;
}

function quietStepIndex(stage: StageName, thinkingLen: number, textLen: number, tick: number): number {
  const steps = QUIET_STREAM[stage]?.steps ?? [];
  if (!steps.length) return 0;
  const last = steps.length - 1;
  if (textLen > 12000) return last;
  if (textLen > 6000) return Math.min(last, 4);
  if (textLen > 1500) return Math.min(last, 3);
  if (textLen > 0) return Math.min(last, 2);
  if (thinkingLen > 0) return Math.min(last, 1);
  // Soft advance while still thinking so it never feels frozen
  return Math.min(1, Math.floor(tick / 4));
}

export default function StageRunner({
  r,
  stage,
  output,
  showOutput = true,
  label,
  onReading,
  collapsedPreview = false,
}: {
  r: LoadedReading;
  stage: StageName;
  output?: string;
  showOutput?: boolean;
  label: string;
  onReading: (r: LoadedReading) => void;
  /** When true and output exists, show a short preview with expand instead of the full report. */
  collapsedPreview?: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [thinking, setThinking] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!collapsedPreview);
  const [tick, setTick] = useState(0);
  const pending = useRef({ thinking: "", text: "" });
  const frame = useRef<number>(0);

  const busyElsewhere = !!r.generating && r.generating !== stage && !running;
  const generatingHere = running || r.generating === stage;
  const has = !!output;
  const downstream = STATUS_ORDER.indexOf(r.status) > STATUS_ORDER.indexOf(SHAPE[stage].produces);
  const quiet = QUIET_STREAM[stage];

  useEffect(() => {
    if (!generatingHere || !quiet) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 2800);
    return () => clearInterval(id);
  }, [generatingHere, quiet]);

  function flush() {
    frame.current = 0;
    setThinking(pending.current.thinking.slice(-600));
    setText(pending.current.text);
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
    setTick(0);
    setRunning(true);
    setExpanded(true);
    await runStage(r.id, stage, {
      onThinking: (t) => {
        pending.current.thinking += t;
        schedule();
      },
      onText: (t) => {
        pending.current.text += t;
        schedule();
      },
      onDone: (next) => onReading(next),
      onError: (m) => setErr(m),
    });
    setRunning(false);
  }

  const usage = r.usage?.[stage];
  const usd = cost(usage);
  const preview =
    has && output && stage !== "protocol"
      ? output.replace(/\s+/g, " ").trim().slice(0, 280) + (output.length > 280 ? "…" : "")
      : "";

  const stepIdx = quiet ? quietStepIndex(stage, thinking.length, text.length, tick) : 0;
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
          {has && usage && (
            <span className="muted text-[12.5px]">
              {usage.output.toLocaleString()} tokens out · about ${usd?.toFixed(2)}
            </span>
          )}
          {has && showOutput && collapsedPreview && (
            <button type="button" className="see-more sm:ml-auto" onClick={() => setExpanded((e) => !e)}>
              {expanded ? "Show less" : "Read full report"}
            </button>
          )}
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
            This usually takes a few minutes. You will not see the draft — only the claims to score when it is ready.
          </p>
          <ol className="stage-wait-steps mt-6">
            {steps.map((labelText, i) => {
              const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
              return (
                <li key={labelText} data-state={state}>
                  <span className="stage-wait-mark" aria-hidden>
                    {state === "done" ? "✓" : state === "active" ? "" : ""}
                  </span>
                  <span>{labelText}</span>
                </li>
              );
            })}
          </ol>
          <div className="stage-wait-bar mt-5" aria-hidden>
            <div
              className="stage-wait-bar-fill"
              style={{ width: `${Math.min(92, 12 + stepIdx * (80 / Math.max(1, steps.length - 1)) + (tick % 3) * 2)}%` }}
            />
          </div>
          <p className="muted text-[12.5px] mt-3">Still working — safe to leave this tab open.</p>
        </div>
      )}

      {generatingHere && !quiet && (
        <div className="grid gap-4 panel-soft">
          <div className="flex items-center gap-2 text-[13px] muted">
            <span className="pulse" aria-hidden /> {text ? "Writing" : "Reading the chart"}
          </div>
          {!text && thinking && (
            <p className="thinking" aria-live="off">
              {thinking}
            </p>
          )}
          {text && stage !== "protocol" && <Markdown text={text} />}
          {text && stage === "protocol" && (
            <p className="muted text-[13px]">Composing the protocol ({text.length.toLocaleString()} characters so far).</p>
          )}
        </div>
      )}

      {!generatingHere && has && showOutput && expanded && <Markdown text={output!} />}
      {!generatingHere && has && showOutput && collapsedPreview && !expanded && (
        <p className="serif text-[17px] muted italic leading-relaxed max-w-[40rem]">{preview}</p>
      )}
    </div>
  );
}
