import "server-only";
import { MongoClient, type Db } from "mongodb";

const URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/jyotish";

declare global {
  var __jyotishMongo: { client: MongoClient; db: Db; ready: Promise<void> } | undefined;
}

function connect() {
  const client = new MongoClient(URI);
  const db = client.db();
  const ready = client.connect().then(async () => {
    await Promise.all([
      db.collection("users").createIndex({ email: 1 }, { unique: true }),
      db.collection("readings").createIndex({ id: 1 }, { unique: true }),
      db.collection("readings").createIndex({ userId: 1, updatedAt: -1 }),
      db.collection("llm_usage").createIndex({ createdAt: -1 }),
      db.collection("llm_usage").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("llm_usage").createIndex({ readingId: 1, createdAt: -1 }),
      db.collection("llm_usage").createIndex({ stage: 1, createdAt: -1 }),
    ]);
  });
  return { client, db, ready };
}

export async function getDb(): Promise<Db> {
  if (!globalThis.__jyotishMongo) globalThis.__jyotishMongo = connect();
  await globalThis.__jyotishMongo.ready;
  return globalThis.__jyotishMongo.db;
}
