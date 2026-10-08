import "server-only";
import type { Reading } from "./types";
import { getDb } from "./db";

type ReadingDoc = Reading & { _id?: unknown };

function strip(doc: ReadingDoc | null): Reading | null {
  if (!doc) return null;
  const { _id: _, ...r } = doc;
  return r as Reading;
}

export async function listReadings(userId: string): Promise<Reading[]> {
  const db = await getDb();
  const docs = await db
    .collection<ReadingDoc>("readings")
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map((d) => strip(d)!);
}

export async function getReading(id: string, userId: string): Promise<Reading | null> {
  if (!/^[a-z0-9-]+$/i.test(id)) return null;
  const db = await getDb();
  return strip(await db.collection<ReadingDoc>("readings").findOne({ id, userId }));
}

export async function saveReading(r: Reading): Promise<Reading> {
  r.updatedAt = new Date().toISOString();
  const db = await getDb();
  const { _id: _, ...doc } = r as ReadingDoc;
  await db.collection<ReadingDoc>("readings").replaceOne({ id: r.id, userId: r.userId }, doc, { upsert: true });
  return r;
}

export async function deleteReading(id: string, userId: string): Promise<boolean> {
  if (!/^[a-z0-9-]+$/i.test(id)) return false;
  const db = await getDb();
  const res = await db.collection("readings").deleteOne({ id, userId });
  return res.deletedCount > 0;
}
