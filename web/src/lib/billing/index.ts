/**
 * Provider-agnostic billing adapter.
 * Wire Dodo Payments or Cashfree later; entitlements only read users.plan.
 */

import type { UserPlan } from "../plans";

export type BillingProviderId = "dodo" | "cashfree";

export type CheckoutRequest = {
  userId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutResult = {
  url: string;
  provider: BillingProviderId;
  sessionId?: string;
};

export type WebhookResult =
  | { ok: true; userId: string; plan: UserPlan; customerId?: string; subscriptionId?: string }
  | { ok: false; reason: string };

export interface BillingAdapter {
  readonly id: BillingProviderId;
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  /** Verify signature + parse body; return plan transition. */
  handleWebhook(rawBody: string, headers: Headers): Promise<WebhookResult>;
}

/** Stub until Dodo or Cashfree is chosen. */
export class UnconfiguredBillingAdapter implements BillingAdapter {
  readonly id: BillingProviderId;

  constructor(id: BillingProviderId = "dodo") {
    this.id = id;
  }

  async createCheckout(_req: CheckoutRequest): Promise<CheckoutResult> {
    throw new Error(
      `Billing provider "${this.id}" is not configured. Set BILLING_PROVIDER and provider keys, or use a paid seed user for QA.`,
    );
  }

  async handleWebhook(_rawBody: string, _headers: Headers): Promise<WebhookResult> {
    return { ok: false, reason: "Billing provider not configured." };
  }
}

export function getBillingAdapter(): BillingAdapter {
  const id = (process.env.BILLING_PROVIDER?.trim().toLowerCase() || "dodo") as BillingProviderId;
  if (id !== "dodo" && id !== "cashfree") {
    return new UnconfiguredBillingAdapter("dodo");
  }
  // Concrete adapters land in Phase 6; until then always stub.
  return new UnconfiguredBillingAdapter(id);
}
