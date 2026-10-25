/**
 * Free-tier personalized counsel: one low-effort schema LLM call, cached on the reading.
 * Falls back to deterministic templates if the LLM is unavailable or fails.
 */

import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  FALLBACK_OPENROUTER_DEEPSEEK,
  FALLBACK_OPENROUTER_FREE,
  getLlmClient,
  hasLlmCredentials,
  isFreeOpenRouterModel,
  llmModelForFreeCounsel,
  llmOpenRouterFallbacks,
  modelSupportsAnthropicExtras,
  usingOpenRouter,
} from "./llm";
import { recordLlmUsage } from "./llmUsage";
import { buildFreeCounselPack, FREE_VARGA_KEYS, RIGHT_NOW_AREA_SPECS } from "./freeCounselPack";
import { FreeCounselLlmSchema, type CounselTriple, type FreeCounsel } from "./freeCounselSchema";
import { buildRightNow } from "./rightNow";
import { saveReading } from "./store";
import type { Reading } from "./types";
import { buildVargaReadings } from "./vargaReadings";

const USAGE_STAGE = "free_counsel" as const;

/** In-flight locks so concurrent GETs do not double-bill. */
const inflight = new Map<string, Promise<Reading>>();

function extractJsonObject(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Free counsel JSON not found in the model reply.");
  return JSON.parse(raw.slice(start, end + 1));
}

/** Template fallback — same shape as LLM output, from existing deterministic builders. */
export function templateFreeCounsel(r: Reading): FreeCounsel {
  const brief = buildRightNow(r.chart, r.intake);
  const vargas = buildVargaReadings(r.chart, r.intake);
  const vargaMap: Record<string, CounselTriple> = {};
  for (const key of FREE_VARGA_KEYS) {
    const card = vargas[`${key}_reading`];
    vargaMap[key] = {
      ledBy: card?.ledBy ?? `This area covers ${key}.`,
      today: card?.today ?? "Stay with the tone of your current chapter.",
      focus: card?.focus ?? "One clear act this week — small enough to finish.",
    };
  }
  return {
    source: "template",
    generatedAt: new Date().toISOString(),
    rightNow: {
      areas: brief.areas.map((a) => ({
        id: a.id,
        ledBy: a.ledBy,
        today: a.today,
        focus: a.focus,
      })),
    },
    vargas: vargaMap,
  };
}

function normalizeLlmCounsel(raw: unknown): FreeCounsel {
  const parsed = FreeCounselLlmSchema.parse(raw);
  const byId = Object.fromEntries(parsed.rightNow.areas.map((a) => [a.id, a]));
  const areas = RIGHT_NOW_AREA_SPECS.map((spec) => {
    const hit = byId[spec.id];
    if (!hit) throw new Error(`Missing rightNow area ${spec.id}`);
    return { id: hit.id, ledBy: hit.ledBy, today: hit.today, focus: hit.focus };
  });
  const vargas: Record<string, CounselTriple> = {};
  for (const key of FREE_VARGA_KEYS) {
    const hit = parsed.vargas[key];
    if (!hit) throw new Error(`Missing varga counsel ${key}`);
    vargas[key] = hit;
  }
  return {
    source: "llm",
    generatedAt: new Date().toISOString(),
    rightNow: { areas },
    vargas,
  };
}

async function callFreeCounselLlm(r: Reading): Promise<FreeCounsel> {
  if (!hasLlmCredentials()) throw new Error("No LLM credentials for free counsel.");

  const client = getLlmClient();
  const pack = buildFreeCounselPack(r.chart, r.intake);
  const model = llmModelForFreeCounsel();
  const anthropicExtras = modelSupportsAnthropicExtras(model);
  const maxTokens = isFreeOpenRouterModel(model) ? 4000 : 6000;

  const routingExtras = usingOpenRouter()
    ? ({
        fallbacks: llmOpenRouterFallbacks(model).length
          ? llmOpenRouterFallbacks(model)
          : [{ model: FALLBACK_OPENROUTER_DEEPSEEK }, { model: FALLBACK_OPENROUTER_FREE }],
      } as { fallbacks: { model: string }[] })
    : anthropicExtras
      ? { betas: ["server-side-fallback-2026-07-01" as const], fallbacks: "default" as const }
      : {};

  const system = `You write short, plain-language life-area counsel for a Vedic natal reading.
Rules:
- Use ONLY the facts JSON the user provides. Do not invent placements, dates, or planets.
- Surface strings must be understandable without astrology jargon (no house numbers, no dasha names in ledBy/today/focus).
- Each focus must be one concrete action for this week, personalized to that area's facts — never a vague slogan.
- Cover every rightNow area id and every varga key listed in the facts.
- No decade synthesis, no past-life claims, no medical advice.`;

  const userText = `Person: ${pack.person.callName}
Write counsel JSON for the free atlas (ledBy / today / focus).

Facts (authoritative — do not contradict):
\`\`\`json
${JSON.stringify(pack, null, 2)}
\`\`\`

Required shape: { "rightNow": { "areas": [ { "id", "ledBy", "today", "focus" } × 6 ] }, "vargas": { "d1"|…|"d30": { "ledBy", "today", "focus" } } }
Include every area id: ${RIGHT_NOW_AREA_SPECS.map((a) => a.id).join(", ")}.
Include every varga key: ${FREE_VARGA_KEYS.join(", ")}.`;

  console.info(`[free_counsel] start reading=${r.id} model=${model}`);

  let text = "";
  let usage = { input: 0, output: 0, cacheRead: 0 };
  let stopReason: string | null = null;
  let parsedOutput: unknown = null;

  if (anthropicExtras) {
    const msg = await client.beta.messages.create({
      model,
      max_tokens: maxTokens,
      ...routingExtras,
      thinking: { type: "adaptive", display: "summarized" },
      output_config: {
        effort: "low",
        format: zodOutputFormat(FreeCounselLlmSchema),
      },
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userText }],
    });
    stopReason = msg.stop_reason;
    text = Array.from(msg.content as Iterable<{ type: string; text?: string }>)
      .flatMap((b) => (b.type === "text" && b.text ? [b.text] : []))
      .join("");
    if ("parsed_output" in msg && msg.parsed_output) parsedOutput = msg.parsed_output;
    const usageRaw = msg.usage as {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number | null;
      cache_read_input_tokens?: number | null;
    };
    usage = {
      input: usageRaw.input_tokens + (usageRaw.cache_creation_input_tokens ?? 0),
      output: usageRaw.output_tokens,
      cacheRead: usageRaw.cache_read_input_tokens ?? 0,
    };
  } else {
    const msg = await client.messages.create({
      model,
      max_tokens: maxTokens,
      ...routingExtras,
      system,
      messages: [
        {
          role: "user",
          content: `${userText}\n\nReply with a single JSON object only, no markdown fencing if you can avoid it.`,
        },
      ],
    });
    stopReason = msg.stop_reason;
    text = Array.from(msg.content as Iterable<{ type: string; text?: string }>)
      .flatMap((b) => (b.type === "text" && b.text ? [b.text] : []))
      .join("");
    const usageRaw = msg.usage as {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number | null;
      cache_read_input_tokens?: number | null;
    };
    usage = {
      input: usageRaw.input_tokens + (usageRaw.cache_creation_input_tokens ?? 0),
      output: usageRaw.output_tokens,
      cacheRead: usageRaw.cache_read_input_tokens ?? 0,
    };
  }

  if (stopReason === "refusal") throw new Error("The model declined free counsel.");

  const counsel = normalizeLlmCounsel(parsedOutput ?? extractJsonObject(text));

  try {
    await recordLlmUsage({
      userId: r.userId,
      readingId: r.id,
      stage: USAGE_STAGE,
      model,
      provider: usingOpenRouter() ? "openrouter" : "anthropic",
      ok: true,
      inputTokens: usage.input,
      outputTokens: usage.output,
      cacheReadTokens: usage.cacheRead,
      stopReason,
    });
  } catch (logErr) {
    console.warn("[llm_usage] free_counsel success log failed", logErr);
  }

  console.info(`[free_counsel] done reading=${r.id} source=llm outTokens=${usage.output}`);
  return counsel;
}

/**
 * Ensure `outputs.freeCounsel` exists: LLM once, else templates.
 * Idempotent; concurrent callers share one in-flight promise.
 */
export async function ensureFreeCounsel(r: Reading): Promise<Reading> {
  if (r.outputs.freeCounsel) return r;

  const existing = inflight.get(r.id);
  if (existing) return existing;

  const work = (async () => {
    // Re-read race: another request may have saved while we waited.
    if (r.outputs.freeCounsel) return r;

    let counsel: FreeCounsel;
    try {
      counsel = await callFreeCounselLlm(r);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[free_counsel] fallback to templates reading=${r.id}: ${message}`);
      try {
        await recordLlmUsage({
          userId: r.userId,
          readingId: r.id,
          stage: USAGE_STAGE,
          model: llmModelForFreeCounsel(),
          provider: usingOpenRouter() ? "openrouter" : "anthropic",
          ok: false,
          error: message,
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
        });
      } catch (logErr) {
        console.warn("[llm_usage] free_counsel failure log failed", logErr);
      }
      counsel = templateFreeCounsel(r);
    }

    r.outputs = { ...r.outputs, freeCounsel: counsel };
    return saveReading(r);
  })().finally(() => {
    inflight.delete(r.id);
  });

  inflight.set(r.id, work);
  return work;
}
