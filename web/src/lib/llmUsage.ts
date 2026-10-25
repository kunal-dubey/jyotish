import "server-only";
import { randomUUID } from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import type { StageName } from "./types";

export type LlmUsageStage = StageName | "free_counsel";

export type LlmUsageEvent = {
  id: string;
  createdAt: string;
  userId: string;
  readingId: string;
  stage: LlmUsageStage;
  model: string;
  provider: "openrouter" | "anthropic";
  ok: boolean;
  error?: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  /** input + output (excludes cache-read double-count). */
  totalTokens: number;
  stopReason?: string | null;
};

export type LlmUsageTotals = {
  calls: number;
  ok: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
};

export async function recordLlmUsage(
  event: Omit<LlmUsageEvent, "id" | "createdAt" | "totalTokens"> & { totalTokens?: number },
): Promise<void> {
  const db = await getDb();
  const inputTokens = event.inputTokens || 0;
  const outputTokens = event.outputTokens || 0;
  const cacheReadTokens = event.cacheReadTokens || 0;
  const doc: LlmUsageEvent = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    userId: event.userId,
    readingId: event.readingId,
    stage: event.stage,
    model: event.model,
    provider: event.provider,
    ok: event.ok,
    error: event.error,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    totalTokens: event.totalTokens ?? inputTokens + outputTokens,
    stopReason: event.stopReason ?? null,
  };
  await db.collection("llm_usage").insertOne(doc);
}

function emptyTotals(): LlmUsageTotals {
  return { calls: 0, ok: 0, failed: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, totalTokens: 0 };
}

function add(t: LlmUsageTotals, e: LlmUsageEvent) {
  t.calls += 1;
  if (e.ok) t.ok += 1;
  else t.failed += 1;
  t.inputTokens += e.inputTokens;
  t.outputTokens += e.outputTokens;
  t.cacheReadTokens += e.cacheReadTokens;
  t.totalTokens += e.totalTokens;
}

export type LlmUsageReport = {
  since: string | null;
  totals: LlmUsageTotals;
  byStage: Record<string, LlmUsageTotals>;
  byModel: Record<string, LlmUsageTotals>;
  byUser: { userId: string; email?: string; totals: LlmUsageTotals }[];
  recent: LlmUsageEvent[];
};

export async function queryLlmUsage(opts?: {
  sinceDays?: number;
  limitRecent?: number;
}): Promise<LlmUsageReport> {
  const db = await getDb();
  const sinceDays = opts?.sinceDays ?? 30;
  const since =
    sinceDays > 0 ? new Date(Date.now() - sinceDays * 86400000).toISOString() : null;
  const filter = since ? { createdAt: { $gte: since } } : {};

  const events = await db
    .collection<LlmUsageEvent>("llm_usage")
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(5000)
    .toArray();

  const totals = emptyTotals();
  const byStage: Record<string, LlmUsageTotals> = {};
  const byModel: Record<string, LlmUsageTotals> = {};
  const byUserMap = new Map<string, LlmUsageTotals>();

  for (const raw of events) {
    const e = raw as LlmUsageEvent;
    add(totals, e);
    byStage[e.stage] ??= emptyTotals();
    add(byStage[e.stage], e);
    byModel[e.model] ??= emptyTotals();
    add(byModel[e.model], e);
    const ut = byUserMap.get(e.userId) ?? emptyTotals();
    add(ut, e);
    byUserMap.set(e.userId, ut);
  }

  const userIds = [...byUserMap.keys()];
  const oids = userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const users = oids.length
    ? await db
        .collection<{ _id: ObjectId; email: string }>("users")
        .find({ _id: { $in: oids } })
        .project({ email: 1 })
        .toArray()
    : [];
  const emailById = Object.fromEntries(users.map((u) => [u._id.toString(), u.email]));

  const byUser = [...byUserMap.entries()]
    .map(([userId, t]) => ({ userId, email: emailById[userId], totals: t }))
    .sort((a, b) => b.totals.totalTokens - a.totals.totalTokens);

  const limitRecent = opts?.limitRecent ?? 50;
  const recent = events.slice(0, limitRecent).map((e) => {
    const { _id: _, ...rest } = e as LlmUsageEvent & { _id?: unknown };
    return rest as LlmUsageEvent;
  });

  return { since, totals, byStage, byModel, byUser, recent };
}
