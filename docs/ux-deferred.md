# Jyotish UX — Deferred follow-ups

> **Status:** Parking lot after Phases 1–3 of [`ux-improvement-plan.md`](./ux-improvement-plan.md)  
> **Date:** 5 Nov 2026  
> **Rule:** Do not block product UX ship on these. Revisit when the dependency is available.

---

## 1. Password reset (email)

**Why deferred:** Needs transactional email (provider, templates, token store, rate limits).

**When ready**
1. `POST /api/auth/forgot` — accept email, always return ok (no user enumeration).
2. Store hashed one-time token + expiry on user (or separate collection).
3. Send link `#/reset?token=…` (or `/reset?token=`).
4. `POST /api/auth/reset` — validate token, set password, invalidate token.
5. Auth screen: “Forgot password?” → request form → “Check your email” copy.

**Until then:** Auth may show a quiet note that reset isn’t available yet (no fake form).

---

## 2. Live billing adapters (Dodo / Cashfree)

**Why deferred:** Needs `BILLING_PROVIDER` + provider API keys, webhook secrets, and pricing SKUs.

**Already in place**
- `#/billing` plan UI + checkout CTA
- `POST /api/billing/checkout` → adapter
- Webhook route stub → `setUserPlan`
- Graceful “checkout being connected” when unconfigured
- QA plan switcher in non-production

**When ready**
1. Implement `DodoBillingAdapter` / `CashfreeBillingAdapter` in `web/src/lib/billing/`.
2. Env: provider keys, webhook secret, price/product ids.
3. Return real checkout URL; handle success/cancel (`#/billing?status=`).
4. Webhook: verify signature → flip `users.plan` to `paid` (or downgrade on cancel).
5. Optional: show price on Billing page from config (not hard-coded fake numbers).
6. Optional: manage-subscription / cancel link for paid users.

**QA without keys:** seed `paid@test.local` / plan switcher.

---

## 3. Nice-to-haves (post Phase 3)

| Item | Notes |
|------|--------|
| Analytics events | See Part H of the main plan (`begin_opened`, `paid_gate_cta`, etc.) |
| OAuth sign-in | Only if growth experiments need it |
| True server cancel for LLM | Explicitly rejected for now (client-only stop); revisit if cost becomes an issue |
| ~~Delete `NewReadingDialog`~~ | Removed 2026-11-05 — Begin uses Onboarding only |
| Password change while logged in | Separate from forgot-password email |

---

## Document history

| Date | Change |
|------|--------|
| 2026-11-05 | Created; moved password reset + billing adapters out of Phase 3 checklist |
| 2026-11-05 | NewReadingDialog removed; Auth forgot-password note stays honest until email reset ships |
