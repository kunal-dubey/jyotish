import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  getLlmClient,
  hasLlmCredentials,
  isFreeOpenRouterModel,
  llmAuthErrorHint,
  llmModelForStage,
  llmOpenRouterFallbacks,
  llmRateLimitHint,
  modelSupportsAnthropicExtras,
  usingOpenRouter,
} from "./llm";
import { ProtocolSchema } from "./protocolSchema";
import {
  GUIDANCE_STAGE,
  PAST_STAGE,
  REPORTS_STAGE,
  SYSTEM_PROMPT,
  chartBlock,
  forwardBriefBlock,
  optionalContext,
  parseClaims,
  pastBriefBlock,
  protocolStage,
  scoreBlock,
} from "./prompts";
import { recordLlmUsage } from "./llmUsage";
import { saveReading } from "./store";
import type { Reading, StageName, Status } from "./types";
import { STATUS_ORDER } from "./types";

let client: Anthropic | null = null;

/** Status each stage requires before it may run, and the status it produces. */
const GATES: Record<StageName, { requires: Status[]; produces: Status }> = {
  past: { requires: ["confirmed", "past_check"], produces: "past_check" },
  reports: { requires: ["scored", "reports"], produces: "reports" },
  guidance: { requires: ["reports", "guidance"], produces: "guidance" },
  protocol: { requires: ["guidance", "protocol"], produces: "protocol" },
};

const STAGE_OUTPUT: Record<StageName, keyof Reading["outputs"]> = {
  past: "past",
  reports: "reports",
  guidance: "guidance",
  protocol: "protocol",
};

/**
 * Per-stage generation knobs.
 * Adaptive thinking (Anthropic only) counts against max_tokens — keep headroom so
 * Report 2 claims are not truncated. Free/open models skip Anthropic thinking but
 * may still emit provider reasoning. Keep freeMaxTokens modest so a slow free
 * provider can finish under Vercel's 300s wall; cheap paid defaults use maxTokens.
 */
const STAGE_LLM: Record<
  StageName,
  { effort: "low" | "medium" | "high"; maxTokens: number; freeMaxTokens: number }
> = {
  // Claims-first past; reports need room for four sections under Sonnet without thinking.
  past: { effort: "medium", maxTokens: 32000, freeMaxTokens: 12000 },
  reports: { effort: "medium", maxTokens: 36000, freeMaxTokens: 16000 },
  guidance: { effort: "high", maxTokens: 28000, freeMaxTokens: 12000 },
  protocol: { effort: "high", maxTokens: 32000, freeMaxTokens: 16000 },
};

/** True when truncated reports still have enough structure to show in the UI. */
function reportsOutputUsable(text: string): boolean {
  const t = text.trim();
  if (t.length < 600) return false;
  const has3 = /^##\s+Report 3\b/im.test(t) || /^##\s+.*\btimeline\b/im.test(t);
  const has4 = /^##\s+Report 4\b/im.test(t) || /^##\s+.*\bvocation\b/im.test(t);
  // Prefer at least two report sections; accept one long Report 3+ if very substantial.
  if (has3 && has4) return true;
  if (has3 && t.length >= 2500) return true;
  return t.length >= 4000 && /^##\s+/m.test(t);
}

/** Pull a JSON object out of model text (fenced or raw) for free-model protocol. */
function extractJsonObject(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Protocol JSON not found in the model reply.");
  return JSON.parse(raw.slice(start, end + 1));
}

/** True when this stage already has a stored output (reuse; do not call Claude). */
export function stageAlreadyDone(r: Reading, stage: StageName): boolean {
  return r.outputs[STAGE_OUTPUT[stage]] != null;
}

export function gateError(r: Reading, stage: StageName): string | null {
  const g = GATES[stage];
  if (g.requires.includes(r.status)) return null;
  // Allow regenerating an earlier stage only if nothing downstream depends on it yet.
  return {
    past: "Confirm the birth data first (Hard Stop 1).",
    reports: "Score every past-check claim first (Hard Stop 2).",
    guidance: "Generate Reports 3 to 6 first.",
    protocol: "Generate the plain-language guidance first.",
  }[stage] + (STATUS_ORDER.indexOf(r.status) > STATUS_ORDER.indexOf(g.produces) ? " Later stages already exist; reset them to regenerate this one." : "");
}

/** Antardashas from the current one through roughly ten years ahead. */
export function seasonPeriods(r: Reading) {
  const today = r.chart.input.today;
  const horizon = `${Number(today.slice(0, 4)) + 10}${today.slice(4)}`;
  const out: { key: string; md: string; ad: string; start: string; end: string }[] = [];
  for (const md of r.chart.vimshottari.mahadashas) {
    for (const ad of md.antardashas) {
      if (ad.end > today && ad.start < horizon) {
        out.push({ key: `${md.lord}-${ad.lord}`, md: md.lord, ad: ad.lord, start: ad.start, end: ad.end });
      }
    }
  }
  return out;
}

function stageContent(
  r: Reading,
  stage: StageName,
  opts?: { includeProtocolJsonSchema?: boolean },
): Anthropic.Beta.BetaContentBlockParam[] {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  const add = (text: string, cache = false) =>
    blocks.push(
      cache
        ? { type: "text", text, cache_control: { type: "ephemeral" } }
        : { type: "text", text },
    );
  const o = r.outputs;

  if (stage === "past") {
    add(pastBriefBlock(r), true);
    add(PAST_STAGE);
    return blocks;
  }

  if (stage === "reports") {
    add(forwardBriefBlock(r), true);
    add(scoreBlock(o.claims ?? [], r.scores, r.scoreNotes));
    add(optionalContext(r));
    add(REPORTS_STAGE);
    return blocks;
  }

  // guidance / protocol: natal + prior outputs (prefer forward brief when present)
  add(r.chart.briefForward ? forwardBriefBlock(r) : chartBlock(r), true);
  add(`# Reports 1 and 2 summary\n\nPast-check was scored. Claims and scores follow for calibration context.\n`);
  add(scoreBlock(o.claims ?? [], r.scores, r.scoreNotes));
  add(optionalContext(r));
  if (stage === "guidance") {
    add(`# Reports 3 to 6, as delivered\n\n${o.reports}`);
    add(GUIDANCE_STAGE);
    return blocks;
  }
  // Protocol: guidance is authoritative. Cap reports so the JSON schema + seasons still fit.
  const reportsForProtocol = (o.reports ?? "").trim();
  const reportsCap = 5000;
  add(
    `# Reports 3 to 6 (excerpt for calibration)\n\n${
      reportsForProtocol.length > reportsCap
        ? `${reportsForProtocol.slice(0, reportsCap)}\n\n…[truncated; prefer the guidance below for substance]`
        : reportsForProtocol
    }`,
  );
  add(`# Plain-language guidance, as delivered\n\n${o.guidance}`);
  add(protocolStage(seasonPeriods(r).map((s) => `${s.key} (${s.start} to ${s.end})`)));
  if (opts?.includeProtocolJsonSchema) {
    add(
      `# JSON schema\n\nReply with a single JSON object only (no markdown fencing if you can avoid it). Match this schema:\n\n\`\`\`json\n${JSON.stringify(z.toJSONSchema(ProtocolSchema), null, 2)}\n\`\`\``,
    );
  }
  return blocks;
}

function plainTextBlocks(blocks: Anthropic.Beta.BetaContentBlockParam[]): Anthropic.TextBlockParam[] {
  return blocks
    .filter((b): b is Anthropic.Beta.BetaTextBlockParam => b.type === "text")
    .map((b) => ({ type: "text", text: b.text }));
}

export type StageEvent =
  | { type: "status"; text: string }
  | { type: "thinking"; text: string }
  | { type: "text"; text: string }
  | { type: "done"; reading: Reading }
  | { type: "error"; message: string };

const running = new Map<string, StageName>();
export const isRunning = (id: string) => running.get(id) ?? null;

/**
 * Run one stage and persist the result. Keeps consuming the model stream even if
 * the browser disconnects, so a refresh mid-generation does not waste the work.
 */
export async function runStage(r: Reading, stage: StageName, emit: (e: StageEvent) => void): Promise<void> {
  if (running.has(r.id)) throw new Error(`Already generating ${running.get(r.id)} for this reading.`);
  running.set(r.id, stage);
  try {
    if (!hasLlmCredentials())
      throw new Error(
        "No LLM key. Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY in web/.env.local and restart the dev server.",
      );
    client ??= getLlmClient();
    const isProtocol = stage === "protocol";
    const knobs = STAGE_LLM[stage];
    const model = llmModelForStage(stage);
    const anthropicExtras = modelSupportsAnthropicExtras(model);
    // Free endpoints: tighter cap so generation can finish before Vercel kills at 300s.
    // Cheap paid (Gemini Flash Lite, etc.): use maxTokens — still far below Opus budgets.
    const maxTokens = isFreeOpenRouterModel(model) ? knobs.freeMaxTokens : knobs.maxTokens;
    console.info(`[stage] start reading=${r.id} stage=${stage} model=${model} maxTokens=${maxTokens}`);
    // Anthropic accepts fallbacks: "default"; OpenRouter only accepts an array of { model }.
    // Omit Anthropic server-side fallback when routing via OpenRouter (provider failover still applies).
    // Direct Anthropic: server-side refusal fallback. OpenRouter: model list fallbacks (free → cheap paid).
    const routingExtras = usingOpenRouter()
      ? ({ fallbacks: llmOpenRouterFallbacks(model) } as { fallbacks: { model: string }[] })
      : anthropicExtras
        ? { betas: ["server-side-fallback-2026-07-01" as const], fallbacks: "default" as const }
        : {};

    const fallbackIds = usingOpenRouter() ? llmOpenRouterFallbacks(model).map((f) => f.model) : [];
    emit({
      type: "status",
      text:
        isFreeOpenRouterModel(model) || fallbackIds.some(isFreeOpenRouterModel)
          ? `Reading the chart (${[model, ...fallbackIds].slice(0, 2).join(" → ")}…)`
          : "Reading the chart",
    });

    const content = stageContent(r, stage, { includeProtocolJsonSchema: isProtocol && !anthropicExtras });

    // Free / non-Anthropic OpenRouter models: no adaptive thinking (that was burning the 300s budget).
    const stream = anthropicExtras
      ? client.beta.messages.stream({
          model,
          max_tokens: maxTokens,
          ...routingExtras,
          thinking: { type: "adaptive", display: "summarized" },
          output_config: {
            effort: knobs.effort,
            ...(isProtocol ? { format: zodOutputFormat(ProtocolSchema) } : {}),
          },
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content }],
        })
      : client.messages.stream({
          model,
          max_tokens: maxTokens,
          ...routingExtras,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: plainTextBlocks(content) }],
        });

    for await (const ev of stream) {
      if (ev.type !== "content_block_delta") continue;
      const d = ev.delta;
      if (d.type === "thinking_delta") emit({ type: "thinking", text: d.thinking });
      else if (d.type === "text_delta") emit({ type: "text", text: d.text });
    }
    const msg = await stream.finalMessage();

    if (msg.stop_reason === "refusal") throw new Error("The model declined this request.");

    const text = Array.from(msg.content as Iterable<{ type: string; text?: string }>)
      .flatMap((b) => (b.type === "text" && b.text ? [b.text] : []))
      .join("");
    const truncated = msg.stop_reason === "max_tokens";
    const usageRaw = msg.usage as {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number | null;
      cache_read_input_tokens?: number | null;
    };
    const usage = {
      input: usageRaw.input_tokens + (usageRaw.cache_creation_input_tokens ?? 0),
      output: usageRaw.output_tokens,
      cacheRead: usageRaw.cache_read_input_tokens ?? 0,
    };

    if (stage === "past") {
      const claims = parseClaims(text);
      console.info(
        `[stage] past done reading=${r.id} stop=${msg.stop_reason} outTokens=${usage.output} textLen=${text.length} claims=${claims.length}`,
      );
      if (claims.length === 0) {
        throw new Error(
          truncated
            ? "The past-check hit the length limit before any scorable claims arrived. Regenerate."
            : text.trim()
              ? "Report 2 came back without numbered claims to score (C1, C2, …). Regenerate."
              : "The model returned no text for the past-check (likely truncated while thinking). Regenerate.",
        );
      }
      // Usable claims: keep them even if the prose was cut mid-draft.
      r.outputs = { past: text, claims };
      r.scores = {};
      r.scoreNotes = {};
      r.scoredAt = undefined;
    } else if (stage === "reports") {
      console.info(
        `[stage] reports done reading=${r.id} stop=${msg.stop_reason} outTokens=${usage.output} textLen=${text.length}`,
      );
      if (!text.trim() || (truncated && !reportsOutputUsable(text))) {
        throw new Error(
          truncated
            ? "Reports 3–6 hit the length limit and were cut off too early. Regenerate."
            : "The model returned no text for Reports 3–6. Regenerate.",
        );
      }
      r.outputs = { past: r.outputs.past, claims: r.outputs.claims, reports: text };
    } else if (stage === "guidance") {
      console.info(
        `[stage] guidance done reading=${r.id} stop=${msg.stop_reason} outTokens=${usage.output} textLen=${text.length}`,
      );
      if (!text.trim() || (truncated && text.trim().length < 600)) {
        throw new Error(
          truncated
            ? "Guidance hit the length limit and was cut off too early. Regenerate."
            : "The model returned no text for guidance. Regenerate.",
        );
      }
      r.outputs = { ...r.outputs, guidance: text, protocol: undefined };
    } else {
      console.info(
        `[stage] protocol raw reading=${r.id} stop=${msg.stop_reason} outTokens=${usage.output} textLen=${text.length} extras=${anthropicExtras}`,
      );
      try {
        const parsed =
          anthropicExtras && "parsed_output" in msg && msg.parsed_output
            ? msg.parsed_output
            : ProtocolSchema.parse(extractJsonObject(text));
        r.outputs = { ...r.outputs, protocol: parsed as Reading["outputs"]["protocol"] };
        console.info(`[stage] protocol done reading=${r.id} stop=${msg.stop_reason} outTokens=${usage.output}`);
      } catch (parseErr) {
        throw new Error(
          truncated
            ? "The protocol JSON hit the length limit and was cut off. Regenerate."
            : parseErr instanceof Error
              ? parseErr.message
              : String(parseErr),
        );
      }
    }
    r.status = GATES[stage].produces;
    r.usage = { ...r.usage, [stage]: usage };
    try {
      await recordLlmUsage({
        userId: r.userId,
        readingId: r.id,
        stage,
        model,
        provider: usingOpenRouter() ? "openrouter" : "anthropic",
        ok: true,
        inputTokens: usage.input,
        outputTokens: usage.output,
        cacheReadTokens: usage.cacheRead,
        stopReason: msg.stop_reason,
      });
    } catch (logErr) {
      console.warn("[llm_usage] failed to persist success event", logErr);
    }
    emit({ type: "done", reading: await saveReading(r) });
  } catch (err) {
    const model = llmModelForStage(stage);
    const message =
      err instanceof Anthropic.AuthenticationError
        ? llmAuthErrorHint()
        : err instanceof Anthropic.RateLimitError
          ? llmRateLimitHint(model)
          : err instanceof Anthropic.APIError
            ? `API error ${err.status}: ${err.message}`
            : err instanceof Error
              ? err.message
              : String(err);
    try {
      await recordLlmUsage({
        userId: r.userId,
        readingId: r.id,
        stage,
        model,
        provider: usingOpenRouter() ? "openrouter" : "anthropic",
        ok: false,
        error: message.slice(0, 500),
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
      });
    } catch (logErr) {
      console.warn("[llm_usage] failed to persist error event", logErr);
    }
    emit({ type: "error", message });
  } finally {
    running.delete(r.id);
  }
}
