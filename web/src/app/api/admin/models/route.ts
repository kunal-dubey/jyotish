import { isResponse, requireUser } from "@/lib/auth";
import {
  adminModelsPayload,
  patchLlmSettings,
  type FeatureModelAssignment,
  type ModelRuntimeOverride,
} from "@/lib/llmSettings";
import type { LlmFeature } from "@/lib/modelCatalog";
import { LLM_FEATURES } from "@/lib/modelCatalog";

/** Admin: catalog + current feature → model assignments. */
export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (user.plan !== "admin") {
    return Response.json({ error: "Admin only.", code: "ADMIN_REQUIRED" }, { status: 403 });
  }
  try {
    return Response.json(await adminModelsPayload());
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

/**
 * PATCH body:
 * {
 *   features?: { past?: { modelId, modelString? } | null, ... },
 *   modelOverrides?: { [id]: { maxTokens?, ... } | null }
 * }
 */
export async function PATCH(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (user.plan !== "admin") {
    return Response.json({ error: "Admin only.", code: "ADMIN_REQUIRED" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      features?: Partial<Record<LlmFeature, FeatureModelAssignment | null>>;
      modelOverrides?: Record<string, ModelRuntimeOverride | null>;
    };

    if (body.features) {
      const allowed = new Set(LLM_FEATURES.map((f) => f.id));
      for (const key of Object.keys(body.features)) {
        if (!allowed.has(key as LlmFeature)) {
          return Response.json({ error: `Unknown feature: ${key}` }, { status: 400 });
        }
      }
    }

    await patchLlmSettings({
      features: body.features,
      modelOverrides: body.modelOverrides,
      updatedBy: user.email,
    });
    return Response.json(await adminModelsPayload());
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
