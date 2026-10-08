"use client";
import type { Reading, StageName } from "@/lib/types";

export type LoadedReading = Reading & { generating: StageName | null };
export type AuthUser = { id: string; email: string; name?: string };

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

export async function runStage(id: string, stage: StageName, h: StreamHandlers) {
  const res = await fetch(`/api/readings/${id}/stage/${stage}`, opts({ method: "POST" }));
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    h.onError((body as { error?: string }).error ?? `HTTP ${res.status}`);
    return;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let finished = false;
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
  if (!finished) h.onError("The connection closed before the stage finished. Reload to see whether it saved.");
}
