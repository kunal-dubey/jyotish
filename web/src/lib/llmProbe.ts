/**
 * Smoke-test a model with the same request shapes used by features, then
 * auto-fix call knobs when the provider rejects or returns empty/unusable output.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  getLlmClient,
  hasLlmCredentials,
  isFreeOpenRouterModel,
  llmAuthErrorHint,
  llmOpenRouterFallbacks,
  modelRequiresAdaptiveThinking,
  usingOpenRouter,
} from "./llm";
import {
  FEATURE_BASE_KNOBS,
  catalogById,
  catalogByModelString,
  mergeCallConfig,
  resolveModelIdForTransport,
  type LlmFeature,
  type ModelCallConfig,
} from "./modelCatalog";
import { patchLlmSettings, type ModelRuntimeOverride } from "./llmSettings";

const TinyJson = z.object({ ok: z.boolean(), note: z.string() });

export type ProbeStrategy = {
  label: string;
  config: ModelCallConfig;
};

export type ProbeAttempt = {
  strategy: string;
  ok: boolean;
  error?: string;
  stopReason?: string | null;
  textLen?: number;
  outputTokens?: number;
  latencyMs: number;
};

export type ProbeResult = {
  model: string;
  catalogId: string | null;
  feature: LlmFeature;
  ok: boolean;
  winningStrategy?: string;
  attempts: ProbeAttempt[];
  persistedOverride?: ModelRuntimeOverride | null;
};

function strategiesFor(feature: LlmFeature, model: string, base: ModelCallConfig): ProbeStrategy[] {
  const free = isFreeOpenRouterModel(model);
  const mustThink = modelRequiresAdaptiveThinking(model);
  const out: ProbeStrategy[] = [];

  const push = (label: string, patch: Partial<ModelCallConfig>) => {
    out.push({
      label,
      config: {
        maxTokens: patch.maxTokens ?? base.maxTokens,
        freeMaxTokens: patch.freeMaxTokens ?? base.freeMaxTokens,
        effort: patch.effort ?? base.effort,
        anthropicExtras: patch.anthropicExtras ?? base.anthropicExtras,
        temperature: patch.temperature ?? base.temperature,
      },
    });
  };

  push("catalog", {});
  if (!mustThink && base.anthropicExtras !== false) {
    push("no-anthropic-extras", { anthropicExtras: false });
  }
  if (mustThink || base.anthropicExtras === true || base.anthropicExtras === "auto") {
    push("extras-low-effort", { anthropicExtras: true, effort: "low" });
  }
  push("lower-tokens", {
    maxTokens: free ? Math.min(base.freeMaxTokens, 4000) : Math.min(base.maxTokens, 8000),
    freeMaxTokens: Math.min(base.freeMaxTokens, 4000),
    anthropicExtras: mustThink ? true : false,
    effort: "low",
  });
  push("minimal", {
    maxTokens: free ? 2048 : 4096,
    freeMaxTokens: 2048,
    anthropicExtras: mustThink ? true : false,
    effort: "low",
  });

  // De-dupe by label+JSON
  const seen = new Set<string>();
  return out.filter((s) => {
    const key = `${s.label}:${JSON.stringify(s.config)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function wantsJson(feature: LlmFeature): boolean {
  return feature === "protocol" || feature === "free_counsel";
}

async function runOnce(
  client: Anthropic,
  model: string,
  feature: LlmFeature,
  config: ModelCallConfig,
): Promise<Omit<ProbeAttempt, "strategy" | "latencyMs"> & { latencyMs?: number }> {
  const useExtras =
    config.anthropicExtras === true
      ? true
      : config.anthropicExtras === false
        ? false
        : modelRequiresAdaptiveThinking(model);
  const maxTokens = isFreeOpenRouterModel(model)
    ? Math.min(config.freeMaxTokens, 4096)
    : Math.min(config.maxTokens, useExtras ? 8192 : 4096);

  const routingExtras = usingOpenRouter()
    ? ({ fallbacks: llmOpenRouterFallbacks(model).slice(0, 1) } as { fallbacks: { model: string }[] })
    : {};

  const json = wantsJson(feature);
  const system = json
    ? "You are a JSON probe. Reply with a tiny JSON object only."
    : "You are a connectivity probe. Reply with a short plain sentence.";
  const user = json
    ? 'Return exactly: {"ok":true,"note":"probe"}'
    : `Reply with exactly: PROBE_OK_${feature}`;

  const t0 = Date.now();
  try {
    if (useExtras) {
      const msg = await client.beta.messages.create({
        model,
        max_tokens: maxTokens,
        ...routingExtras,
        thinking: { type: "adaptive", display: "omitted" },
        output_config: {
          effort: config.effort,
          ...(json ? { format: zodOutputFormat(TinyJson) } : {}),
        },
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: user }],
      });
      const text = Array.from(msg.content as Iterable<{ type: string; text?: string }>)
        .flatMap((b) => (b.type === "text" && b.text ? [b.text] : []))
        .join("");
      const parsed =
        json && "parsed_output" in msg && msg.parsed_output
          ? msg.parsed_output
          : json
            ? (() => {
                const start = text.indexOf("{");
                const end = text.lastIndexOf("}");
                if (start < 0 || end <= start) return null;
                return JSON.parse(text.slice(start, end + 1));
              })()
            : null;
      if (msg.stop_reason === "refusal") {
        return { ok: false, error: "refusal", stopReason: msg.stop_reason, textLen: text.length, latencyMs: Date.now() - t0 };
      }
      if (json) {
        const check = TinyJson.safeParse(parsed);
        if (!check.success || !check.data.ok) {
          return {
            ok: false,
            error: "JSON probe failed to parse/validate",
            stopReason: msg.stop_reason,
            textLen: text.length,
            outputTokens: msg.usage?.output_tokens,
            latencyMs: Date.now() - t0,
          };
        }
      } else if (!text.includes("PROBE_OK") && text.trim().length < 2) {
        return {
          ok: false,
          error: "Empty or unexpected text (thinking may have consumed budget)",
          stopReason: msg.stop_reason,
          textLen: text.length,
          outputTokens: msg.usage?.output_tokens,
          latencyMs: Date.now() - t0,
        };
      }
      return {
        ok: true,
        stopReason: msg.stop_reason,
        textLen: text.length,
        outputTokens: msg.usage?.output_tokens,
        latencyMs: Date.now() - t0,
      };
    }

    const msg = await client.messages.create({
      model,
      max_tokens: maxTokens,
      ...routingExtras,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = Array.from(msg.content as Iterable<{ type: string; text?: string }>)
      .flatMap((b) => (b.type === "text" && b.text ? [b.text] : []))
      .join("");
    if (msg.stop_reason === "refusal") {
      return { ok: false, error: "refusal", stopReason: msg.stop_reason, textLen: text.length, latencyMs: Date.now() - t0 };
    }
    if (json) {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start < 0 || end <= start) {
        return {
          ok: false,
          error: "No JSON object in reply",
          stopReason: msg.stop_reason,
          textLen: text.length,
          outputTokens: msg.usage?.output_tokens,
          latencyMs: Date.now() - t0,
        };
      }
      const check = TinyJson.safeParse(JSON.parse(text.slice(start, end + 1)));
      if (!check.success || !check.data.ok) {
        return {
          ok: false,
          error: "JSON probe invalid",
          stopReason: msg.stop_reason,
          textLen: text.length,
          latencyMs: Date.now() - t0,
        };
      }
    } else if (!/PROBE_OK/i.test(text) && text.trim().length < 2) {
      return {
        ok: false,
        error: "Empty text",
        stopReason: msg.stop_reason,
        textLen: text.length,
        latencyMs: Date.now() - t0,
      };
    }
    return {
      ok: true,
      stopReason: msg.stop_reason,
      textLen: text.length,
      outputTokens: msg.usage?.output_tokens,
      latencyMs: Date.now() - t0,
    };
  } catch (err) {
    const message =
      err instanceof Anthropic.AuthenticationError
        ? llmAuthErrorHint()
        : err instanceof Anthropic.APIError
          ? `API ${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);
    return { ok: false, error: message.slice(0, 500), latencyMs: Date.now() - t0 };
  }
}

export async function probeModel(opts: {
  model?: string;
  catalogId?: string;
  feature: LlmFeature;
  /** Persist winning knobs to Mongo. Default true. */
  autofix?: boolean;
  updatedBy?: string;
}): Promise<ProbeResult> {
  if (!hasLlmCredentials()) {
    return {
      model: opts.model ?? "",
      catalogId: opts.catalogId ?? null,
      feature: opts.feature,
      ok: false,
      attempts: [
        {
          strategy: "preflight",
          ok: false,
          error: "No LLM credentials (OPENROUTER_API_KEY or ANTHROPIC_API_KEY).",
          latencyMs: 0,
        },
      ],
    };
  }

  const openRouter = usingOpenRouter();
  const profile = opts.catalogId
    ? catalogById(opts.catalogId)
    : opts.model
      ? catalogByModelString(opts.model)
      : undefined;
  const model =
    opts.model?.trim() ||
    (profile ? resolveModelIdForTransport(profile, openRouter) : null) ||
    "";
  if (!model) {
    return {
      model: "",
      catalogId: opts.catalogId ?? null,
      feature: opts.feature,
      ok: false,
      attempts: [{ strategy: "preflight", ok: false, error: "No model id", latencyMs: 0 }],
    };
  }

  const base = mergeCallConfig(opts.feature, profile, null);
  // Probe uses smaller caps than production; scale from feature base so free models stay safe.
  const probeBase: ModelCallConfig = {
    ...base,
    maxTokens: Math.min(base.maxTokens, FEATURE_BASE_KNOBS[opts.feature].maxTokens),
    freeMaxTokens: Math.min(base.freeMaxTokens, 8000),
  };

  const client = getLlmClient();
  const attempts: ProbeAttempt[] = [];
  let winning: ProbeStrategy | null = null;

  for (const strategy of strategiesFor(opts.feature, model, probeBase)) {
    const result = await runOnce(client, model, opts.feature, strategy.config);
    attempts.push({
      strategy: strategy.label,
      ok: result.ok,
      error: result.error,
      stopReason: result.stopReason,
      textLen: result.textLen,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs ?? 0,
    });
    if (result.ok) {
      winning = strategy;
      break;
    }
  }

  let persistedOverride: ModelRuntimeOverride | null = null;
  if (winning && opts.autofix !== false) {
    const key = profile?.id ?? model;
    persistedOverride = {
      maxTokens: winning.config.maxTokens,
      freeMaxTokens: winning.config.freeMaxTokens,
      effort: winning.config.effort,
      anthropicExtras: winning.config.anthropicExtras,
      temperature: winning.config.temperature,
      verifiedStrategy: winning.label,
      verifiedAt: new Date().toISOString(),
      lastError: undefined,
    };
    await patchLlmSettings({
      modelOverrides: { [key]: persistedOverride },
      updatedBy: opts.updatedBy ?? "probe",
    });
  } else if (!winning && opts.autofix !== false) {
    const key = profile?.id ?? model;
    const last = attempts[attempts.length - 1];
    persistedOverride = {
      lastError: last?.error ?? "all strategies failed",
      verifiedAt: new Date().toISOString(),
    };
    await patchLlmSettings({
      modelOverrides: { [key]: persistedOverride },
      updatedBy: opts.updatedBy ?? "probe",
    });
  }

  return {
    model,
    catalogId: profile?.id ?? opts.catalogId ?? null,
    feature: opts.feature,
    ok: Boolean(winning),
    winningStrategy: winning?.label,
    attempts,
    persistedOverride,
  };
}

export async function probeCatalog(opts?: {
  features?: LlmFeature[];
  catalogIds?: string[];
  autofix?: boolean;
  updatedBy?: string;
}): Promise<{ results: ProbeResult[]; summary: { ok: number; failed: number } }> {
  const features = opts?.features ?? (["past", "free_counsel", "protocol"] as LlmFeature[]);
  const profiles = opts?.catalogIds?.length
    ? opts.catalogIds.map((id) => catalogById(id)).filter(Boolean)
    : (await import("./modelCatalog")).MODEL_CATALOG;

  const results: ProbeResult[] = [];
  for (const profile of profiles) {
    if (!profile) continue;
    // Skip Anthropic-direct-only profiles that lack OpenRouter when on OR, and vice versa.
    if (usingOpenRouter() && !profile.openRouterId) continue;
    if (!usingOpenRouter() && !profile.directAnthropicId && profile.openRouterId.startsWith("google/")) {
      // Non-Anthropic models need OpenRouter with our current client.
      for (const feature of features) {
        results.push({
          model: profile.openRouterId,
          catalogId: profile.id,
          feature,
          ok: false,
          attempts: [
            {
              strategy: "preflight",
              ok: false,
              error: "Model requires OpenRouter (set OPENROUTER_API_KEY).",
              latencyMs: 0,
            },
          ],
        });
      }
      continue;
    }
    for (const feature of features) {
      results.push(
        await probeModel({
          catalogId: profile.id,
          feature,
          autofix: opts?.autofix,
          updatedBy: opts?.updatedBy,
        }),
      );
    }
  }
  const ok = results.filter((r) => r.ok).length;
  return { results, summary: { ok, failed: results.length - ok } };
}
