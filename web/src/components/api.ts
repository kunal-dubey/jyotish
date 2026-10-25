"use client";
import type { ModuleDef } from "@/lib/modules";
import type { ModuleSubtitle } from "@/lib/moduleSubtitles";
import type { UserPlan } from "@/lib/plans";
import type { Reading, StageName } from "@/lib/types";
import type { VargaReadingCard } from "@/lib/vargaReadings";

export type ReadingModule = ModuleDef & {
  subtitle?: ModuleSubtitle;
  locked: boolean;
  reading?: VargaReadingCard;
};

export type LoadedReading = Reading & {
  generating: StageName | null;
  plan?: UserPlan;
  canAccessPaid?: boolean;
  modules?: ReadingModule[];
};
export type AuthUser = { id: string; email: string; name?: string; plan?: UserPlan };

export type LlmUsageTotals = {
  calls: number;
  ok: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
};

export type LlmUsageReport = {
  since: string | null;
  totals: LlmUsageTotals;
  byStage: Record<string, LlmUsageTotals>;
  byModel: Record<string, LlmUsageTotals>;
  byUser: { userId: string; email?: string; totals: LlmUsageTotals }[];
  recent: {
    id: string;
    createdAt: string;
    userId: string;
    readingId: string;
    stage: string;
    model: string;
    provider: string;
    ok: boolean;
    error?: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    totalTokens: number;
  }[];
};

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}

const opts = (init?: RequestInit): RequestInit => ({
  credentials: "include",
  ...init,
  headers: { ...(init?.headers ?? {}) },
});

export const api = {
  me: () => fetch("/api/auth/me", opts()).then((r) => json<AuthUser>(r)),
  login: (email: string, password: string) =>
    fetch("/api/auth/login", opts({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) })).then(
      (r) => json<AuthUser>(r),
    ),
  register: (email: string, password: string, name?: string) =>
    fetch(
      "/api/auth/register",
      opts({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, name }) }),
    ).then((r) => json<AuthUser>(r)),
  logout: () => fetch("/api/auth/logout", opts({ method: "POST" })).then((r) => json<{ ok: boolean }>(r)),
  setPlan: (plan: UserPlan) =>
    fetch("/api/auth/plan", opts({ method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan }) })).then(
      (r) => json<AuthUser>(r),
    ),
  adminUsage: (days = 30) =>
    fetch(`/api/admin/usage?days=${days}`, opts()).then((r) => json<LlmUsageReport>(r)),
  list: () =>
    fetch("/api/readings", opts()).then((r) =>
      json<{ id: string; name: string; date: string; place: string; lagna: string; status: string; updatedAt: string }[]>(r),
    ),
  get: (id: string) => fetch(`/api/readings/${id}`, opts()).then((r) => json<LoadedReading>(r)),
  create: (intake: unknown) =>
    fetch("/api/readings", opts({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(intake) })).then(
      (r) => json<LoadedReading>(r),
    ),
  patch: (id: string, body: unknown) =>
    fetch(`/api/readings/${id}`, opts({ method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).then(
      (r) => json<LoadedReading>(r),
    ),
  remove: (id: string) => fetch(`/api/readings/${id}`, opts({ method: "DELETE" })).then((r) => json(r)),
  geocode: (q: string) =>
    fetch(`/api/geocode?q=${encodeURIComponent(q)}`, opts()).then((r) =>
      json<{ results: { label: string; lat: number; lon: number; tz: string | null }[] }>(r),
    ),
};

export type StreamHandlers = {
  onThinking: (t: string) => void;
  onText: (t: string) => void;
  onDone: (r: LoadedReading) => void;
  onError: (msg: string) => void;
};

export async function runStage(id: string, stage: StageName, h: StreamHandlers, signal?: AbortSignal) {
  const res = await fetch(`/api/readings/${id}/stage/${stage}`, opts({ method: "POST", signal }));
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    h.onError((body as { error?: string }).error ?? `HTTP ${res.status}`);
    return;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let finished = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        const e = JSON.parse(line);
        if (e.type === "thinking") h.onThinking(e.text);
        else if (e.type === "text") h.onText(e.text);
        else if (e.type === "done") {
          finished = true;
          h.onDone({ ...e.reading, generating: null });
        } else if (e.type === "error") {
          finished = true;
          h.onError(e.message);
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) return;
    throw err;
  }
  if (!finished && !signal?.aborted) {
    h.onError("The connection closed before the stage finished. Reload to see whether it saved.");
  }
}
