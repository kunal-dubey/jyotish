/**
 * Seed QA users with free / paid / admin plans.
 *
 *   cd web && node scripts/seed-test-users.mjs
 *
 * Env: MONGODB_URI (default mongodb://127.0.0.1:27017/jyotish)
 * Password for all: TestPass123!
 */

import { createRequire } from "node:module";
import { MongoClient } from "mongodb";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");

const URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/jyotish";
const PASSWORD = process.env.SEED_TEST_PASSWORD ?? "TestPass123!";

const USERS = [
  { email: "free@test.local", name: "Free Tester", plan: "free" },
  { email: "paid@test.local", name: "Paid Tester", plan: "paid" },
  { email: "admin@test.local", name: "Admin Tester", plan: "admin" },
];

async function main() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date().toISOString();

  for (const u of USERS) {
    const email = u.email.toLowerCase();
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
    console.log(`upserted ${email} plan=${u.plan}`);
  }

  console.log(`\nPassword for all: ${PASSWORD}`);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
