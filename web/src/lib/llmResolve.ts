/**
 * Resolve model id + call knobs for a feature (past / reports / … / free_counsel).
 */

import "server-only";
import {
  catalogByModelString,
  mergeCallConfig,
  type LlmFeature,
  type ModelCallConfig,
  type Effort,
} from "./modelCatalog";
import {
  getLlmSettings,
  overrideKeyFor,
  resolveFeatureModelString,
} from "./llmSettings";
import {
  isFreeOpenRouterModel,
  llmEffortForStage,
  modelRequiresAdaptiveThinking,
  modelSupportsAnthropicExtras,
} from "./llm";
import type { StageName } from "./types";

export type ResolvedLlmCall = {
  feature: LlmFeature;
  model: string;
  catalogId: string | null;
  source: "settings" | "env" | "default";
  config: ModelCallConfig;
  /** Effective max_tokens after free-model cap. */
  maxTokens: number;
  effort: Effort;
  useAnthropicExtras: boolean;
};

function effectiveExtras(model: string, config: ModelCallConfig): boolean {
  if (config.anthropicExtras === true) return true;
  if (config.anthropicExtras === false) return false;
  return modelSupportsAnthropicExtras(model);
}

export async function resolveLlmCall(feature: LlmFeature): Promise<ResolvedLlmCall> {
  const { model, catalogId, source } = await resolveFeatureModelString(feature);
  const settings = await getLlmSettings();
  const profile = catalogId
    ? catalogByModelString(catalogId) ?? catalogByModelString(model)
    : catalogByModelString(model);
  const key = overrideKeyFor(model, catalogId ?? profile?.id ?? null);
  const runtime = settings.modelOverrides[key] ?? settings.modelOverrides[model] ?? null;
  const config = mergeCallConfig(feature, profile, runtime);
  const useAnthropicExtras = effectiveExtras(model, config);
  // Claude 5.5 always thinks — never let a false override starve the beta path.
  const forcedExtras = modelRequiresAdaptiveThinking(model) ? true : useAnthropicExtras;
  const maxTokens = isFreeOpenRouterModel(model) ? config.freeMaxTokens : config.maxTokens;
  const effort =
    feature === "free_counsel"
      ? config.effort
      : llmEffortForStage(feature as StageName, config.effort);

  return {
    feature,
    model,
    catalogId: catalogId ?? profile?.id ?? null,
    source,
    config: { ...config, anthropicExtras: forcedExtras },
    maxTokens,
    effort,
    useAnthropicExtras: forcedExtras,
  };
}
