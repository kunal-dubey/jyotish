/** Client-safe plan helpers (no server-only imports). */

export type UserPlan = "free" | "paid" | "admin";

export function normalizePlan(plan: string | undefined | null): UserPlan {
  if (plan === "paid" || plan === "admin") return plan;
  return "free";
}

export function canAccessPaid(plan: UserPlan): boolean {
  return plan === "paid" || plan === "admin";
}
