import { getBillingAdapter } from "@/lib/billing";
import { setUserPlan } from "@/lib/entitlements";

/** Provider webhooks → flip users.plan. Signature verification lives in the adapter. */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const adapter = getBillingAdapter();
  const result = await adapter.handleWebhook(rawBody, req.headers);
  if (!result.ok) {
    return Response.json({ error: result.reason }, { status: 400 });
  }
  await setUserPlan(result.userId, result.plan, {
    billingProvider: adapter.id,
    billingCustomerId: result.customerId ?? null,
    billingSubscriptionId: result.subscriptionId ?? null,
  });
  return Response.json({ ok: true, plan: result.plan });
}
