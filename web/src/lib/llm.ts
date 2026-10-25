import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { StageName } from "./types";

/** OpenRouter Anthropic-compatible Messages API (not /api/v1). */
const OPENROUTER_BASE = "https://openrouter.ai/api";

/**
 * Default OpenRouter model: Claude Sonnet — strong enough for falsifiable past-check
 * claims, still finishable under Vercel's 300s when adaptive thinking is off.
 * Flash Lite / free models were too vague for this protocol.
 */
export const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-sonnet-5.5";

/** Cheap/fast fallbacks when Sonnet is rate-limited (quality degrades stepwise). */
export const FALLBACK_OPENROUTER_FLASH = "google/gemini-2.5-flash";
export const FALLBACK_OPENROUTER_DEEPSEEK = "deepseek/deepseek-v3.2";
export const FALLBACK_OPENROUTER_FREE = "google/gemma-4-31b-it:free";

const DEFAULT_OPENROUTER_FALLBACKS = [
  FALLBACK_OPENROUTER_FLASH,
  FALLBACK_OPENROUTER_DEEPSEEK,
  FALLBACK_OPENROUTER_FREE,
] as const;

const STAGE_ENV: Partial<Record<StageName, string>> = {
  past: "ANTHROPIC_MODEL_PAST",
  reports: "ANTHROPIC_MODEL_REPORTS",
  guidance: "ANTHROPIC_MODEL_GUIDANCE",
  protocol: "ANTHROPIC_MODEL_PROTOCOL",
};

export function usingOpenRouter(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function hasLlmCredentials(): boolean {
  if (usingOpenRouter()) return true;
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_AUTH_TOKEN?.trim());
}

export function llmModel(): string {
  if (process.env.ANTHROPIC_MODEL?.trim()) return process.env.ANTHROPIC_MODEL.trim();
  return usingOpenRouter() ? DEFAULT_OPENROUTER_MODEL : "claude-sonnet-4-5";
}

/** Per-stage model: stage env → default. */
export function llmModelForStage(stage: StageName): string {
  const envKey = STAGE_ENV[stage];
  if (envKey) {
    const override = process.env[envKey]?.trim();
    if (override) return override;
  }
  return llmModel();
}

/**
 * Cheap model for free-tier counsel (Right now + D1–D30 cards).
 * Override with ANTHROPIC_MODEL_FREE.
 */
export function llmModelForFreeCounsel(): string {
  if (process.env.ANTHROPIC_MODEL_FREE?.trim()) return process.env.ANTHROPIC_MODEL_FREE.trim();
  return usingOpenRouter() ? FALLBACK_OPENROUTER_FLASH : "claude-haiku-4-5";
}

/** OpenRouter free endpoints (`:free` or the free router). */
export function isFreeOpenRouterModel(model: string): boolean {
  return model === "openrouter/free" || model.endsWith(":free");
}

/**
 * Adaptive thinking / effort / Anthropic zod structured outputs.
 * On OpenRouter we default these OFF even for anthropic/* — thinking often blows
 * the Vercel 300s budget. Opt in with OPENROUTER_THINKING=1.
 * Direct Anthropic keeps thinking enabled.
 */
export function modelSupportsAnthropicExtras(model: string): boolean {
  if (isFreeOpenRouterModel(model)) return false;
  if (!model.startsWith("anthropic/") && usingOpenRouter()) return false;
  if (usingOpenRouter()) return process.env.OPENROUTER_THINKING?.trim() === "1";
  return model.startsWith("claude") || !usingOpenRouter();
}

/**
 * OpenRouter `fallbacks` for the Anthropic Messages API (max 3).
 * Override with comma-separated OPENROUTER_FALLBACKS.
 */
export function llmOpenRouterFallbacks(primary: string): { model: string }[] {
  const fromEnv = process.env.OPENROUTER_FALLBACKS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const pool = fromEnv?.length ? fromEnv : [...DEFAULT_OPENROUTER_FALLBACKS];
  const seen = new Set<string>([primary]);
  const out: { model: string }[] = [];
  for (const id of pool) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ model: id });
    if (out.length >= 3) break;
  }
  return out;
}

/** Anthropic SDK client — direct Anthropic, or OpenRouter when OPENROUTER_API_KEY is set. */
export function getLlmClient(): Anthropic {
  const openrouter = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouter) {
    return new Anthropic({
      // Must not send a real Anthropic key; OpenRouter auth is Bearer via authToken.
      apiKey: null,
      authToken: openrouter,
      baseURL: process.env.ANTHROPIC_BASE_URL?.trim() || OPENROUTER_BASE,
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER?.trim() || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_TITLE?.trim() || "Jyotish Protocol",
      },
    });
  }
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || undefined,
    authToken: process.env.ANTHROPIC_AUTH_TOKEN || undefined,
    baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
  });
}

export function llmAuthErrorHint(): string {
  return usingOpenRouter()
    ? "OpenRouter API key missing or invalid. Set OPENROUTER_API_KEY in web/.env.local."
    : "Anthropic API key missing or invalid. Set ANTHROPIC_API_KEY in web/.env.local (or OPENROUTER_API_KEY).";
}

export function llmRateLimitHint(model: string): string {
  if (isFreeOpenRouterModel(model)) {
    return "The free model providers are at capacity right now (this is not your account credit balance). Retry in a minute — the app also falls back to other models automatically.";
  }
  return "Rate limited by the API. Wait a minute and retry.";
}
