import "server-only";
import { MongoClient, type Db } from "mongodb";

const URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/jyotish";

declare global {
  var __jyotishMongo: { client: MongoClient; db: Db; ready: Promise<void> } | undefined;
}

function connect() {
  const client = new MongoClient(URI, {
    serverSelectionTimeoutMS: 3_000,
    connectTimeoutMS: 3_000,
  });
  const db = client.db();
  const ready = client.connect().then(() => {
    // Indexes in the background — don't block the first auth/API request on them.
    void Promise.all([
      db.collection("users").createIndex({ email: 1 }, { unique: true }),
      db.collection("readings").createIndex({ id: 1 }, { unique: true }),
      db.collection("readings").createIndex({ userId: 1, updatedAt: -1 }),
      db.collection("llm_usage").createIndex({ createdAt: -1 }),
      db.collection("llm_usage").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("llm_usage").createIndex({ readingId: 1, createdAt: -1 }),
      db.collection("llm_usage").createIndex({ stage: 1, createdAt: -1 }),
      db.collection("app_settings").createIndex({ _id: 1 }),
    ]).catch(() => {
      /* best-effort */
    });
  });
  return { client, db, ready };
}

export async function getDb(): Promise<Db> {
  if (!globalThis.__jyotishMongo) globalThis.__jyotishMongo = connect();
  try {
    await globalThis.__jyotishMongo.ready;
    return globalThis.__jyotishMongo.db;
  } catch (err) {
    // Drop a failed bootstrap so the next request can reconnect (e.g. Mongo came up later).
    try {
      await globalThis.__jyotishMongo.client.close();
    } catch {
      /* ignore */
    }
    globalThis.__jyotishMongo = undefined;
    throw err;
  }
}
