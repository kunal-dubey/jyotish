import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getLlmClient, hasLlmCredentials, llmAuthErrorHint, llmModel, usingOpenRouter } from "./llm";
import { ProtocolSchema } from "./protocolSchema";
import {
  GUIDANCE_STAGE,
  PAST_STAGE,
  REPORTS_STAGE,
  SYSTEM_PROMPT,
  chartBlock,
  optionalContext,
  parseClaims,
  protocolStage,
  scoreBlock,
} from "./prompts";
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

function stageContent(r: Reading, stage: StageName): Anthropic.Beta.BetaContentBlockParam[] {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: "text", text: chartBlock(r), cache_control: { type: "ephemeral" } },
  ];
  const add = (text: string) => blocks.push({ type: "text", text });
  const o = r.outputs;

  if (stage === "past") {
    add(PAST_STAGE);
    return blocks;
  }
  add(`# Reports 1 and 2, as delivered\n\n${o.past}`);
  add(scoreBlock(o.claims ?? [], r.scores, r.scoreNotes));
  add(optionalContext(r));
  if (stage === "reports") {
    add(REPORTS_STAGE);
    return blocks;
  }
  add(`# Reports 3 to 6, as delivered\n\n${o.reports}`);
  if (stage === "guidance") {
    add(GUIDANCE_STAGE);
    return blocks;
  }
  add(`# Plain-language guidance, as delivered\n\n${o.guidance}`);
  add(protocolStage(seasonPeriods(r).map((s) => `${s.key} (${s.start} to ${s.end})`)));
  return blocks;
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
    // Anthropic accepts fallbacks: "default"; OpenRouter only accepts an array of { model }.
    // Omit Anthropic server-side fallback when routing via OpenRouter (provider failover still applies).
    const anthropicFallback = usingOpenRouter()
      ? {}
      : { betas: ["server-side-fallback-2026-07-01" as const], fallbacks: "default" as const };
    const stream = client.beta.messages.stream({
      model: llmModel(),
      max_tokens: 64000,
      ...anthropicFallback,
      thinking: { type: "adaptive", display: "summarized" },
      output_config: {
        effort: "high",
        ...(isProtocol ? { format: zodOutputFormat(ProtocolSchema) } : {}),
      },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: stageContent(r, stage) }],
    });

    emit({ type: "status", text: "Reading the chart" });
    for await (const ev of stream) {
      if (ev.type === "content_block_delta") {
        if (ev.delta.type === "thinking_delta") emit({ type: "thinking", text: ev.delta.thinking });
        else if (ev.delta.type === "text_delta") emit({ type: "text", text: ev.delta.text });
      }
    }
    const msg = await stream.finalMessage();

    if (msg.stop_reason === "refusal") throw new Error("The model declined this request.");
    if (msg.stop_reason === "max_tokens") throw new Error("The output hit the length limit and was cut off. Try regenerating.");

    const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const usage = {
      input: msg.usage.input_tokens + (msg.usage.cache_creation_input_tokens ?? 0),
      output: msg.usage.output_tokens,
      cacheRead: msg.usage.cache_read_input_tokens ?? 0,
    };

    if (stage === "past") {
      const claims = parseClaims(text);
      if (claims.length === 0) throw new Error("Report 2 came back without numbered claims to score. Regenerate.");
      r.outputs = { past: text, claims };
      r.scores = {};
      r.scoreNotes = {};
      r.scoredAt = undefined;
    } else if (stage === "reports") {
      r.outputs = { past: r.outputs.past, claims: r.outputs.claims, reports: text };
    } else if (stage === "guidance") {
      r.outputs = { ...r.outputs, guidance: text, protocol: undefined };
    } else {
      const parsed = msg.parsed_output ?? ProtocolSchema.parse(JSON.parse(text));
      r.outputs = { ...r.outputs, protocol: parsed };
    }
    r.status = GATES[stage].produces;
    r.usage = { ...r.usage, [stage]: usage };
    emit({ type: "done", reading: await saveReading(r) });
  } catch (err) {
    const message =
      err instanceof Anthropic.AuthenticationError
        ? llmAuthErrorHint()
        : err instanceof Anthropic.RateLimitError
          ? "Rate limited by the API. Wait a minute and retry."
          : err instanceof Anthropic.APIError
            ? `API error ${err.status}: ${err.message}`
            : err instanceof Error
              ? err.message
              : String(err);
    emit({ type: "error", message });
  } finally {
    running.delete(r.id);
  }
}
