import { isResponse, requireUser } from "@/lib/auth";
import { probeCatalog, probeModel } from "@/lib/llmProbe";
import { LLM_FEATURES, type LlmFeature } from "@/lib/modelCatalog";

/**
 * POST /api/admin/models/probe
 * Body:
 *   { catalogId?, model?, feature?, features?, catalogIds?, autofix?: boolean, all?: boolean }
 * Smoke-tests model request shapes and optionally persists winning knobs.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (user.plan !== "admin") {
    return Response.json({ error: "Admin only.", code: "ADMIN_REQUIRED" }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      catalogId?: string;
      model?: string;
      feature?: LlmFeature;
      features?: LlmFeature[];
      catalogIds?: string[];
      autofix?: boolean;
      all?: boolean;
    };

    if (body.all || body.catalogIds?.length || (body.features?.length && !body.catalogId && !body.model)) {
      const features = body.features?.length
        ? body.features
        : body.feature
          ? [body.feature]
          : (["past", "free_counsel", "protocol"] as LlmFeature[]);
      for (const f of features) {
        if (!LLM_FEATURES.some((x) => x.id === f)) {
          return Response.json({ error: `Unknown feature: ${f}` }, { status: 400 });
        }
      }
      const report = await probeCatalog({
        features,
        catalogIds: body.catalogIds,
        autofix: body.autofix !== false,
        updatedBy: user.email,
      });
      return Response.json(report);
    }

    const feature = body.feature ?? "past";
    if (!LLM_FEATURES.some((x) => x.id === feature)) {
      return Response.json({ error: `Unknown feature: ${feature}` }, { status: 400 });
    }
    if (!body.catalogId && !body.model) {
      return Response.json({ error: "Provide catalogId, model, or all:true." }, { status: 400 });
    }

    const result = await probeModel({
      catalogId: body.catalogId,
      model: body.model,
      feature,
      autofix: body.autofix !== false,
      updatedBy: user.email,
    });
    return Response.json({ results: [result], summary: { ok: result.ok ? 1 : 0, failed: result.ok ? 0 : 1 } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
