/**
 * Upsert QA + owner admin users. Used by /api/admin/seed and local scripts.
 */

import "server-only";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import type { UserPlan } from "./plans";

export const SEED_TEST_PASSWORD = "TestPass123!";

/** Fixed QA profiles (password always reset to SEED_TEST_PASSWORD). */
export const SEED_TEST_USERS: { email: string; name: string; plan: UserPlan }[] = [
  { email: "free@test.local", name: "Free Tester", plan: "free" },
  { email: "paid@test.local", name: "Paid Tester", plan: "paid" },
  { email: "admin@test.local", name: "Admin Tester", plan: "admin" },
];

/** Owner admin — plan forced to admin; existing password kept. */
export const SEED_OWNER_ADMIN = {
  email: "contact.kunaldubey@gmail.com",
  name: "Kunal Dubey",
  plan: "admin" as const,
};

export type SeedUserResult = {
  email: string;
  plan: UserPlan;
  action: "inserted" | "updated";
  passwordReset: boolean;
};

export type SeedReport = {
  ok: true;
  testPassword: string;
  users: SeedUserResult[];
  owner: SeedUserResult & { note: string };
};

function seedBearer(): string | null {
  const dedicated = process.env.SEED_SECRET?.trim();
  if (dedicated && dedicated.length >= 16) return dedicated;
  const auth = process.env.AUTH_SECRET?.trim();
  if (auth && auth.length >= 16) return auth;
  return null;
}

/** True if Authorization: Bearer … or x-seed-secret matches SEED_SECRET / AUTH_SECRET. */
export function authorizeSeedRequest(req: Request): boolean {
  const expected = seedBearer();
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const alt = req.headers.get("x-seed-secret")?.trim();
  const got = bearer || alt;
  if (!got || got.length !== expected.length) return false;
  // timing-safe-ish compare
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function seedUsers(opts?: { testPassword?: string }): Promise<SeedReport> {
  const db = await getDb();
  const password = opts?.testPassword ?? process.env.SEED_TEST_PASSWORD ?? SEED_TEST_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();
  const users: SeedUserResult[] = [];

  for (const u of SEED_TEST_USERS) {
    const email = u.email.toLowerCase();
    const existing = await db.collection("users").findOne({ email });
    await db.collection("users").updateOne(
      { email },
      {
        $set: {
          email,
          name: u.name,
          plan: u.plan,
          passwordHash,
          billingProvider: null,
          billingCustomerId: null,
          billingSubscriptionId: null,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    users.push({
      email,
      plan: u.plan,
      action: existing ? "updated" : "inserted",
      passwordReset: true,
    });
  }

  const ownerEmail = SEED_OWNER_ADMIN.email.toLowerCase();
  const ownerExisting = await db.collection("users").findOne({ email: ownerEmail });
  if (ownerExisting) {
    await db.collection("users").updateOne(
      { email: ownerEmail },
      {
        $set: {
          plan: "admin",
          name: ownerExisting.name || SEED_OWNER_ADMIN.name,
          updatedAt: now,
        },
      },
    );
  } else {
    await db.collection("users").insertOne({
      email: ownerEmail,
      name: SEED_OWNER_ADMIN.name,
      plan: "admin",
      passwordHash,
      billingProvider: null,
      billingCustomerId: null,
      billingSubscriptionId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  const owner: SeedReport["owner"] = {
    email: ownerEmail,
    plan: "admin",
    action: ownerExisting ? "updated" : "inserted",
    passwordReset: !ownerExisting,
    note: ownerExisting
      ? "Existing account promoted to admin; password unchanged."
      : `New account created; temporary password is the test password until you change it.`,
  };

  return { ok: true, testPassword: password, users, owner };
}
