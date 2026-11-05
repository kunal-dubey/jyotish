/**
 * Known LLM models and per-feature generation knobs.
 * Runtime overrides (from probe auto-fix) live in Mongo via llmSettings.
 */

export type LlmFeature = "past" | "reports" | "guidance" | "protocol" | "free_counsel";

export type Effort = "low" | "medium" | "high";

/** How a model should be called for a given feature. */
export type ModelCallConfig = {
  maxTokens: number;
  /** Used when model id ends with :free or is openrouter/free. */
  freeMaxTokens: number;
  effort: Effort;
  /**
   * Anthropic beta path: adaptive thinking + zod structured outputs.
   * "auto" follows modelSupportsAnthropicExtras heuristics.
   */
  anthropicExtras: boolean | "auto";
  /** Optional; omitted = provider default. */
  temperature?: number;
};

export type ModelProfile = {
  id: string;
  label: string;
  /** Short note shown in admin UI. */
  blurb: string;
  /** OpenRouter-style ids; direct Anthropic uses bare claude-* when not on OpenRouter. */
  openRouterId: string;
  directAnthropicId?: string;
  /** Recommended for these features (UI hint only). */
  recommendedFor: LlmFeature[];
  /** Default call config; feature overrides merge on top. */
  defaults: ModelCallConfig;
  byFeature?: Partial<Record<LlmFeature, Partial<ModelCallConfig>>>;
};

export const LLM_FEATURES: { id: LlmFeature; label: string; description: string }[] = [
  {
    id: "past",
    label: "Blind past-check",
    description: "Falsifiable C1… claims scored before reports.",
  },
  {
    id: "reports",
    label: "Reports 3–6",
    description: "Timeline, vocation, inner life, decade pressure.",
  },
  {
    id: "guidance",
    label: "Guidance",
    description: "Plain-language decade guidance.",
  },
  {
    id: "protocol",
    label: "Living protocol",
    description: "Structured JSON protocol page.",
  },
  {
    id: "free_counsel",
    label: "Chart Atlas counsel",
    description: "Right now + D1–D30 personalized cards (free tier).",
  },
];

/** Stage-level defaults when a model has no override (mirrors historical STAGE_LLM). */
export const FEATURE_BASE_KNOBS: Record<LlmFeature, ModelCallConfig> = {
  past: { maxTokens: 64000, freeMaxTokens: 12000, effort: "low", anthropicExtras: "auto" },
  reports: { maxTokens: 64000, freeMaxTokens: 16000, effort: "medium", anthropicExtras: "auto" },
  guidance: { maxTokens: 48000, freeMaxTokens: 12000, effort: "medium", anthropicExtras: "auto" },
  protocol: { maxTokens: 64000, freeMaxTokens: 16000, effort: "medium", anthropicExtras: "auto" },
  free_counsel: { maxTokens: 16000, freeMaxTokens: 4000, effort: "low", anthropicExtras: "auto" },
};

/**
 * Curated catalog. Add models here; probe/auto-fix will persist working knobs.
 * Prefer OpenRouter ids when OPENROUTER_API_KEY is set.
 */
export const MODEL_CATALOG: ModelProfile[] = [
  {
    id: "claude-sonnet-5.5",
    label: "Claude Sonnet 5.5",
    blurb: "Default for paid stages. Always thinks — past stays low effort.",
    openRouterId: "anthropic/claude-sonnet-5.5",
    directAnthropicId: "claude-sonnet-4-5",
    recommendedFor: ["past", "reports", "guidance", "protocol"],
    defaults: { maxTokens: 64000, freeMaxTokens: 12000, effort: "medium", anthropicExtras: true },
    byFeature: {
      past: { effort: "low", maxTokens: 64000 },
      free_counsel: { maxTokens: 16000, effort: "low" },
    },
  },
  {
    id: "claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    blurb: "Faster/cheaper Anthropic; good atlas fallback on direct API.",
    openRouterId: "anthropic/claude-haiku-4.5",
    directAnthropicId: "claude-haiku-4-5",
    recommendedFor: ["free_counsel", "guidance"],
    defaults: { maxTokens: 32000, freeMaxTokens: 8000, effort: "low", anthropicExtras: true },
    byFeature: {
      past: { maxTokens: 48000, effort: "low" },
      free_counsel: { maxTokens: 16000 },
    },
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    blurb: "Default atlas counsel on OpenRouter. No Anthropic thinking extras.",
    openRouterId: "google/gemini-2.5-flash",
    recommendedFor: ["free_counsel", "guidance"],
    defaults: { maxTokens: 24000, freeMaxTokens: 8000, effort: "low", anthropicExtras: false },
    byFeature: {
      past: { maxTokens: 32000 },
      reports: { maxTokens: 32000 },
      protocol: { maxTokens: 32000 },
      free_counsel: { maxTokens: 6000 },
    },
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    blurb: "Stronger Gemini for reports/protocol via OpenRouter.",
    openRouterId: "google/gemini-2.5-pro",
    recommendedFor: ["reports", "protocol", "past"],
    defaults: { maxTokens: 48000, freeMaxTokens: 12000, effort: "medium", anthropicExtras: false },
    byFeature: {
      past: { effort: "low", maxTokens: 48000 },
      free_counsel: { maxTokens: 8000, effort: "low" },
    },
  },
  {
    id: "deepseek-v3.2",
    label: "DeepSeek V3.2",
    blurb: "OpenRouter fallback. Plain Messages API, JSON-in-text for protocol.",
    openRouterId: "deepseek/deepseek-v3.2",
    recommendedFor: ["reports", "guidance", "free_counsel"],
    defaults: { maxTokens: 24000, freeMaxTokens: 8000, effort: "low", anthropicExtras: false },
    byFeature: {
      past: { maxTokens: 24000 },
      protocol: { maxTokens: 24000 },
      free_counsel: { maxTokens: 6000 },
    },
  },
  {
    id: "gemma-4-31b-free",
    label: "Gemma 4 31B (free)",
    blurb: "OpenRouter free tier. Tight token caps; quality varies.",
    openRouterId: "google/gemma-4-31b-it:free",
    recommendedFor: ["free_counsel"],
    defaults: { maxTokens: 12000, freeMaxTokens: 8000, effort: "low", anthropicExtras: false },
    byFeature: {
      past: { freeMaxTokens: 10000, maxTokens: 10000 },
      reports: { freeMaxTokens: 12000, maxTokens: 12000 },
      guidance: { freeMaxTokens: 10000, maxTokens: 10000 },
      protocol: { freeMaxTokens: 12000, maxTokens: 12000 },
      free_counsel: { freeMaxTokens: 4000, maxTokens: 4000 },
    },
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    blurb: "OpenAI via OpenRouter Anthropic-compatible API.",
    openRouterId: "openai/gpt-4o",
    recommendedFor: ["reports", "guidance", "protocol"],
    defaults: { maxTokens: 32000, freeMaxTokens: 8000, effort: "medium", anthropicExtras: false },
    byFeature: {
      past: { effort: "low", maxTokens: 24000 },
      free_counsel: { maxTokens: 6000, effort: "low" },
    },
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    blurb: "Cheap OpenAI via OpenRouter for atlas / light stages.",
    openRouterId: "openai/gpt-4o-mini",
    recommendedFor: ["free_counsel", "guidance"],
    defaults: { maxTokens: 16000, freeMaxTokens: 6000, effort: "low", anthropicExtras: false },
    byFeature: {
      past: { maxTokens: 16000 },
      protocol: { maxTokens: 16000 },
      free_counsel: { maxTokens: 4000 },
    },
  },
];

export function catalogById(id: string): ModelProfile | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

export function catalogByModelString(model: string): ModelProfile | undefined {
  const m = model.trim();
  return MODEL_CATALOG.find(
    (p) => p.openRouterId === m || p.directAnthropicId === m || p.id === m || `anthropic/${p.directAnthropicId}` === m,
  );
}

/** Merge feature base → model defaults → model-by-feature → runtime override. */
export function mergeCallConfig(
  feature: LlmFeature,
  profile: ModelProfile | undefined,
  runtime?: Partial<ModelCallConfig> | null,
): ModelCallConfig {
  const base = FEATURE_BASE_KNOBS[feature];
  const fromDefaults = profile?.defaults;
  const fromFeature = profile?.byFeature?.[feature];
  return {
    maxTokens: runtime?.maxTokens ?? fromFeature?.maxTokens ?? fromDefaults?.maxTokens ?? base.maxTokens,
    freeMaxTokens:
      runtime?.freeMaxTokens ?? fromFeature?.freeMaxTokens ?? fromDefaults?.freeMaxTokens ?? base.freeMaxTokens,
    effort: runtime?.effort ?? fromFeature?.effort ?? fromDefaults?.effort ?? base.effort,
    anthropicExtras:
      runtime?.anthropicExtras ?? fromFeature?.anthropicExtras ?? fromDefaults?.anthropicExtras ?? base.anthropicExtras,
    temperature: runtime?.temperature ?? fromFeature?.temperature ?? fromDefaults?.temperature,
  };
}

export function resolveModelIdForTransport(profile: ModelProfile, openRouter: boolean): string {
  if (openRouter) return profile.openRouterId;
  return profile.directAnthropicId ?? profile.openRouterId.replace(/^anthropic\//, "");
}
