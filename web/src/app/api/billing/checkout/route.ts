import { isResponse, requireUser } from "@/lib/auth";
import { getBillingAdapter } from "@/lib/billing";

/** Create a checkout session (Dodo / Cashfree when configured). */
export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;

  try {
    const body = (await req.json().catch(() => ({}))) as { successUrl?: string; cancelUrl?: string };
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const adapter = getBillingAdapter();
    const result = await adapter.createCheckout({
      userId: user.id,
      email: user.email,
      successUrl: body.successUrl || `${origin}/#/`,
      cancelUrl: body.cancelUrl || `${origin}/#/`,
    });
    return Response.json(result);
  } catch (e) {
    return Response.json(
      {
        error: e instanceof Error ? e.message : String(e),
        code: "BILLING_NOT_CONFIGURED",
      },
      { status: 501 },
    );
  }
}
