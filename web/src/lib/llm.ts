import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** OpenRouter Anthropic-compatible Messages API (not /api/v1). */
const OPENROUTER_BASE = "https://openrouter.ai/api";

export function usingOpenRouter(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function hasLlmCredentials(): boolean {
  if (usingOpenRouter()) return true;
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_AUTH_TOKEN?.trim());
}

export function llmModel(): string {
  if (process.env.ANTHROPIC_MODEL?.trim()) return process.env.ANTHROPIC_MODEL.trim();
  return usingOpenRouter() ? "anthropic/claude-opus-5.5" : "claude-opus-5-5";
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
