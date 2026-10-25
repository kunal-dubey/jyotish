import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import type { UserPlan } from "./plans";
import { canAccessPaid, normalizePlan } from "./plans";

export type UserBilling = {
  billingProvider?: "dodo" | "cashfree" | null;
  billingCustomerId?: string | null;
  billingSubscriptionId?: string | null;
};

export type UserProfile = {
  id: string;
  email: string;
  name?: string;
  plan: UserPlan;
} & UserBilling;

type UserDoc = {
  _id: ObjectId;
  email: string;
  name?: string;
  plan?: UserPlan;
  billingProvider?: "dodo" | "cashfree" | null;
  billingCustomerId?: string | null;
  billingSubscriptionId?: string | null;
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!ObjectId.isValid(userId)) return null;
  const db = await getDb();
  const doc = await db.collection<UserDoc>("users").findOne({ _id: new ObjectId(userId) });
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    plan: normalizePlan(doc.plan),
    billingProvider: doc.billingProvider ?? null,
    billingCustomerId: doc.billingCustomerId ?? null,
    billingSubscriptionId: doc.billingSubscriptionId ?? null,
  };
}

/** 403 with stable code when the user lacks paid access. */
export function entitlementDenied(plan: UserPlan): Response {
  return Response.json(
    {
      error: "This module requires a paid plan.",
      code: "ENTITLEMENT_REQUIRED",
      plan,
    },
    { status: 403 },
  );
}

export async function requirePaidAccess(userId: string): Promise<UserProfile | Response> {
  const profile = await getUserProfile(userId);
  if (!profile) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!canAccessPaid(profile.plan)) return entitlementDenied(profile.plan);
  return profile;
}

export async function setUserPlan(
  userId: string,
  plan: UserPlan,
  billing?: Partial<UserBilling>,
): Promise<void> {
  if (!ObjectId.isValid(userId)) throw new Error("Invalid user id.");
  const db = await getDb();
  const update: Record<string, unknown> = { plan };
  if (billing) {
    if ("billingProvider" in billing) update.billingProvider = billing.billingProvider ?? null;
    if ("billingCustomerId" in billing) update.billingCustomerId = billing.billingCustomerId ?? null;
    if ("billingSubscriptionId" in billing) {
      update.billingSubscriptionId = billing.billingSubscriptionId ?? null;
    }
  }
  await db.collection("users").updateOne({ _id: new ObjectId(userId) }, { $set: update });
}
