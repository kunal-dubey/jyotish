import { isResponse, requireUser } from "@/lib/auth";
import { setUserPlan } from "@/lib/entitlements";
import type { UserPlan } from "@/lib/plans";
import { normalizePlan } from "@/lib/plans";

/**
 * Dev/admin plan flip for QA. Disabled in production unless the caller is admin.
 * Body: { plan: "free" | "paid" | "admin", email?: string } — email only for admin targeting others (future).
 */
export async function PATCH(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;

  const production = process.env.NODE_ENV === "production";
  if (production && user.plan !== "admin") {
    return Response.json({ error: "Plan changes are disabled in production." }, { status: 403 });
  }

  try {
    const body = (await req.json()) as { plan?: string };
    const plan = normalizePlan(body.plan) as UserPlan;
    if (body.plan !== "free" && body.plan !== "paid" && body.plan !== "admin") {
      return Response.json({ error: 'plan must be "free", "paid", or "admin".' }, { status: 400 });
    }
    // Non-admins in non-production may not escalate to admin.
    if (plan === "admin" && user.plan !== "admin" && production) {
      return Response.json({ error: "Cannot self-promote to admin." }, { status: 403 });
    }
    await setUserPlan(user.id, plan);
    return Response.json({ id: user.id, email: user.email, name: user.name, plan });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
