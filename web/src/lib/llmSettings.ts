/**
 * Persisted LLM feature → model assignments and per-model runtime overrides.
 * Stored in Mongo `app_settings` with _id "llm".
 */

import "server-only";
import { getDb } from "./db";
import {
  LLM_FEATURES,
  MODEL_CATALOG,
  type LlmFeature,
  type ModelCallConfig,
  catalogById,
  resolveModelIdForTransport,
} from "./modelCatalog";
import { usingOpenRouter } from "./llm";

export type FeatureModelAssignment = {
  /** Catalog profile id, or raw model string if custom. */
  modelId: string;
  /** Optional raw override (OpenRouter / Anthropic id). Wins over catalog transport id. */
  modelString?: string;
};

export type ModelRuntimeOverride = Partial<ModelCallConfig> & {
  /** Last successful probe strategy label. */
  verifiedStrategy?: string;
  verifiedAt?: string;
  lastError?: string;
};

export type LlmAppSettings = {
  _id: "llm";
  updatedAt: string;
  updatedBy?: string;
  /** Per-feature model pick. Missing key → env / built-in default. */
  features: Partial<Record<LlmFeature, FeatureModelAssignment>>;
  /** Per catalog id or raw model string. */
  modelOverrides: Record<string, ModelRuntimeOverride>;
};

const DOC_ID = "llm" as const;

function emptySettings(): LlmAppSettings {
  return {
    _id: DOC_ID,
    updatedAt: new Date(0).toISOString(),
    features: {},
    modelOverrides: {},
  };
}

let cache: { at: number; value: LlmAppSettings } | null = null;
const CACHE_MS = 2_000;

export function invalidateLlmSettingsCache() {
  cache = null;
}

export async function getLlmSettings(): Promise<LlmAppSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const db = await getDb();
  const col = db.collection<LlmAppSettings>("app_settings");
  const doc = await col.findOne({ _id: DOC_ID });
  const value: LlmAppSettings = doc
    ? {
        _id: DOC_ID,
        updatedAt: doc.updatedAt ?? new Date(0).toISOString(),
        updatedBy: doc.updatedBy,
        features: doc.features ?? {},
        modelOverrides: doc.modelOverrides ?? {},
      }
    : emptySettings();
  cache = { at: Date.now(), value };
  return value;
}

export async function patchLlmSettings(input: {
  features?: Partial<Record<LlmFeature, FeatureModelAssignment | null>>;
  modelOverrides?: Record<string, ModelRuntimeOverride | null>;
  updatedBy?: string;
}): Promise<LlmAppSettings> {
  const current = await getLlmSettings();
  const features = { ...current.features };
  if (input.features) {
    for (const [k, v] of Object.entries(input.features) as [LlmFeature, FeatureModelAssignment | null][]) {
      if (v == null) delete features[k];
      else features[k] = v;
    }
  }
  const modelOverrides = { ...current.modelOverrides };
  if (input.modelOverrides) {
    for (const [k, v] of Object.entries(input.modelOverrides)) {
      if (v == null) delete modelOverrides[k];
      else modelOverrides[k] = { ...modelOverrides[k], ...v };
    }
  }
  const next: LlmAppSettings = {
    _id: DOC_ID,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy ?? current.updatedBy,
    features,
    modelOverrides,
  };
  const db = await getDb();
  const col = db.collection<LlmAppSettings>("app_settings");
  await col.updateOne({ _id: DOC_ID }, { $set: next }, { upsert: true });
  invalidateLlmSettingsCache();
  cache = { at: Date.now(), value: next };
  return next;
}

/** Env keys still win when no admin assignment is set (deployment defaults). */
const FEATURE_ENV: Record<LlmFeature, string | undefined> = {
  past: "ANTHROPIC_MODEL_PAST",
  reports: "ANTHROPIC_MODEL_REPORTS",
  guidance: "ANTHROPIC_MODEL_GUIDANCE",
  protocol: "ANTHROPIC_MODEL_PROTOCOL",
  free_counsel: "ANTHROPIC_MODEL_FREE",
};

export function envModelForFeature(feature: LlmFeature): string | null {
  const key = FEATURE_ENV[feature];
  if (key) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  if (feature === "free_counsel") {
    return usingOpenRouter() ? "google/gemini-2.5-flash" : "claude-haiku-4-5";
  }
  const global = process.env.ANTHROPIC_MODEL?.trim();
  if (global) return global;
  return usingOpenRouter() ? "anthropic/claude-sonnet-5.5" : "claude-sonnet-4-5";
}

export function defaultCatalogIdForFeature(feature: LlmFeature): string {
  if (feature === "free_counsel") {
    return usingOpenRouter() ? "gemini-2.5-flash" : "claude-haiku-4.5";
  }
  return "claude-sonnet-5.5";
}

/** Resolve the transport model string for a feature (settings → env → catalog default). */
export async function resolveFeatureModelString(feature: LlmFeature): Promise<{
  model: string;
  catalogId: string | null;
  source: "settings" | "env" | "default";
}> {
  const settings = await getLlmSettings();
  const assigned = settings.features[feature];
  if (assigned?.modelString?.trim()) {
    return { model: assigned.modelString.trim(), catalogId: assigned.modelId || null, source: "settings" };
  }
  if (assigned?.modelId) {
    const profile = catalogById(assigned.modelId);
    if (profile) {
      return {
        model: resolveModelIdForTransport(profile, usingOpenRouter()),
        catalogId: profile.id,
        source: "settings",
      };
    }
    // Treat unknown modelId as a raw model string.
    return { model: assigned.modelId, catalogId: null, source: "settings" };
  }

  const envKey = FEATURE_ENV[feature];
  if (envKey && process.env[envKey]?.trim()) {
    return { model: process.env[envKey]!.trim(), catalogId: null, source: "env" };
  }
  if (process.env.ANTHROPIC_MODEL?.trim() && feature !== "free_counsel") {
    return { model: process.env.ANTHROPIC_MODEL.trim(), catalogId: null, source: "env" };
  }

  const catalogId = defaultCatalogIdForFeature(feature);
  const profile = catalogById(catalogId);
  return {
    model: profile ? resolveModelIdForTransport(profile, usingOpenRouter()) : envModelForFeature(feature)!,
    catalogId: profile?.id ?? null,
    source: "default",
  };
}

export function overrideKeyFor(model: string, catalogId: string | null): string {
  return catalogId || model;
}

export async function adminModelsPayload() {
  const settings = await getLlmSettings();
  const openRouter = usingOpenRouter();
  const features = Object.fromEntries(
    await Promise.all(
      LLM_FEATURES.map(async (f) => {
        const resolved = await resolveFeatureModelString(f.id);
        return [
          f.id,
          {
            ...f,
            assignment: settings.features[f.id] ?? null,
            resolvedModel: resolved.model,
            resolvedCatalogId: resolved.catalogId,
            source: resolved.source,
          },
        ];
      }),
    ),
  );
  return {
    provider: openRouter ? "openrouter" : "anthropic",
    catalog: MODEL_CATALOG.map((p) => ({
      id: p.id,
      label: p.label,
      blurb: p.blurb,
      openRouterId: p.openRouterId,
      directAnthropicId: p.directAnthropicId,
      transportId: resolveModelIdForTransport(p, openRouter),
      recommendedFor: p.recommendedFor,
      defaults: p.defaults,
      byFeature: p.byFeature ?? {},
      override: settings.modelOverrides[p.id] ?? settings.modelOverrides[p.openRouterId] ?? null,
    })),
    features,
    settings: {
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
      modelOverrides: settings.modelOverrides,
    },
  };
}
