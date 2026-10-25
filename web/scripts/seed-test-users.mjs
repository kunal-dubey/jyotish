/**
 * Seed QA users + owner admin (local Mongo).
 *
 *   cd web && node scripts/seed-test-users.mjs
 *   # production (after deploy): curl with SEED_SECRET — see README
 *
 * Env: MONGODB_URI (default mongodb://127.0.0.1:27017/jyotish)
 * Test password: TestPass123!
 */

import { createRequire } from "node:module";
import { MongoClient } from "mongodb";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");

const URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/jyotish";
const PASSWORD = process.env.SEED_TEST_PASSWORD ?? "TestPass123!";

const TEST_USERS = [
  { email: "free@test.local", name: "Free Tester", plan: "free" },
  { email: "paid@test.local", name: "Paid Tester", plan: "paid" },
  { email: "admin@test.local", name: "Admin Tester", plan: "admin" },
];

const OWNER = { email: "contact.kunaldubey@gmail.com", name: "Kunal Dubey", plan: "admin" };

async function main() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date().toISOString();

  for (const u of TEST_USERS) {
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

  const ownerEmail = OWNER.email.toLowerCase();
  const existing = await db.collection("users").findOne({ email: ownerEmail });
  if (existing) {
    await db.collection("users").updateOne(
      { email: ownerEmail },
      { $set: { plan: "admin", name: existing.name || OWNER.name, updatedAt: now } },
    );
    console.log(`promoted ${ownerEmail} plan=admin (password unchanged)`);
  } else {
    await db.collection("users").insertOne({
      email: ownerEmail,
      name: OWNER.name,
      plan: "admin",
      passwordHash,
      billingProvider: null,
      billingCustomerId: null,
      billingSubscriptionId: null,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`inserted ${ownerEmail} plan=admin (temp password = test password)`);
  }

  console.log(`\nTest-user password: ${PASSWORD}`);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
