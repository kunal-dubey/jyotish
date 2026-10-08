"use client";
import { useRef, useState } from "react";
import type { StageName, Status } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/types";
import { api, runStage, type LoadedReading } from "./api";
import Markdown from "./Markdown";

/** Status to reset to before regenerating a stage, and the status the stage produces. */
const SHAPE: Record<StageName, { resetTo: Status; produces: Status }> = {
  past: { resetTo: "confirmed", produces: "past_check" },
  reports: { resetTo: "scored", produces: "reports" },
  guidance: { resetTo: "reports", produces: "guidance" },
  protocol: { resetTo: "guidance", produces: "protocol" },
};

// Opus 5.5 list prices per million tokens; input here includes cache writes, so this is approximate.
function cost(u?: { input: number; output: number; cacheRead: number }) {
  if (!u) return null;
  return (u.input * 4 + u.output * 20 + u.cacheRead * 0.2) / 1e6;
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
  const pending = useRef({ thinking: "", text: "" });
  const frame = useRef<number>(0);

  const busyElsewhere = !!r.generating && !running;
  const has = !!output;
  const downstream = STATUS_ORDER.indexOf(r.status) > STATUS_ORDER.indexOf(SHAPE[stage].produces);

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
    // Always clear this stage (and anything after) before a fresh Claude call so the server does not reuse stored output.
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
      onDone: (next) => onReading(next),
      onError: (m) => setErr(m),
    });
    setRunning(false);
  }

  const usage = r.usage?.[stage];
  const usd = cost(usage);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button className={has ? "btn" : "btn btn-primary"} onClick={go} disabled={running || busyElsewhere}>
          {running ? "Writing…" : has ? "Regenerate" : label}
        </button>
        {busyElsewhere && <span className="muted text-[13px]">Another stage is generating ({r.generating}).</span>}
        {has && usage && !running && (
          <span className="muted text-[12.5px]">
            {usage.output.toLocaleString()} tokens out · about ${usd?.toFixed(2)}
          </span>
        )}
      </div>

      {err && <p className="note note-bad">{err}</p>}

      {running && (
        <div className="grid gap-4">
          <div className="flex items-center gap-2 text-[13px] muted">
            <span className="pulse" aria-hidden /> {text ? "Writing" : "Thinking through the chart"}
          </div>
          {!text && thinking && <p className="thinking" aria-live="off">{thinking}</p>}
          {text && stage !== "protocol" && <Markdown text={text} />}
          {text && stage === "protocol" && (
            <p className="muted text-[13px]">Composing the protocol content ({text.length.toLocaleString()} characters so far).</p>
          )}
        </div>
      )}

      {!running && has && showOutput && <Markdown text={output!} />}
    </div>
  );
}
