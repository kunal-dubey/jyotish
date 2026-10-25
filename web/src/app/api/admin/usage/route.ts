import { isResponse, requireUser } from "@/lib/auth";
import { queryLlmUsage } from "@/lib/llmUsage";

/** Admin-only LLM usage aggregates + recent events. */
export async function GET(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (user.plan !== "admin") {
    return Response.json({ error: "Admin only.", code: "ADMIN_REQUIRED" }, { status: 403 });
  }

  const url = new URL(req.url);
  const sinceDays = Math.min(365, Math.max(0, Number(url.searchParams.get("days") ?? 30) || 30));
  const limitRecent = Math.min(200, Math.max(10, Number(url.searchParams.get("recent") ?? 50) || 50));

  try {
    const report = await queryLlmUsage({ sinceDays, limitRecent });
    return Response.json(report);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
