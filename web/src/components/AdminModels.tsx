"use client";
import { useCallback, useEffect, useState } from "react";
import {
  api,
  type LlmModelsAdminPayload,
  type LlmProbeReport,
} from "./api";
import CosmicLoader from "./CosmicLoader";

const FEATURE_ORDER = ["past", "reports", "guidance", "protocol", "free_counsel"] as const;

export default function AdminModels() {
  const [data, setData] = useState<LlmModelsAdminPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [probing, setProbing] = useState(false);
  const [probe, setProbe] = useState<LlmProbeReport | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api.adminModels();
      setData(payload);
      const next: Record<string, string> = {};
      for (const id of FEATURE_ORDER) {
        const f = payload.features[id];
        next[id] = f?.assignment?.modelId || f?.resolvedCatalogId || "";
      }
      setDraft(next);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      const features: Record<string, { modelId: string } | null> = {};
      for (const id of FEATURE_ORDER) {
        const chosen = draft[id]?.trim();
        if (!chosen) features[id] = null;
        else features[id] = { modelId: chosen };
      }
      const payload = await api.patchAdminModels({ features });
      setData(payload);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function runProbe(all = true) {
    setProbing(true);
    setProbe(null);
    try {
      const report = await api.probeAdminModels(
        all
          ? { all: true, autofix: true, features: ["past", "free_counsel", "protocol"] }
          : {
              catalogId: draft.past || undefined,
              feature: "past",
              autofix: true,
            },
      );
      setProbe(report);
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setProbing(false);
    }
  }

  return (
    <main className="sky min-h-[calc(100dvh-3.5rem)]">
      <div className="mx-auto max-w-[78rem] px-4 sm:px-5 md:px-8 py-8 sm:py-12 grid gap-8">
        <header className="max-w-[40rem] enter">
          <h1 className="serif text-[clamp(1.8rem,5vw,2.8rem)] leading-tight">LLM models</h1>
          <p className="muted mt-3 text-[15px] leading-relaxed">
            Pick which model powers each protocol stage and Chart Atlas counsel. Configs (tokens, thinking
            path) are stored per model; Probe &amp; autofix smoke-tests every catalog entry and writes working
            knobs when a strategy succeeds.
          </p>
          <p className="muted mt-2 text-[13px]">
            Provider: <span className="text-[var(--ink)]">{data?.provider ?? "…"}</span>
            {data?.settings.updatedAt && data.settings.updatedAt !== new Date(0).toISOString() ? (
              <>
                {" "}
                · updated {new Date(data.settings.updatedAt).toLocaleString()}
                {data.settings.updatedBy ? ` by ${data.settings.updatedBy}` : ""}
              </>
            ) : null}
          </p>
        </header>

        {err && <p className="note note-bad">{err}</p>}
        {loading && !data && (
          <div className="grid place-items-center py-16">
            <CosmicLoader size="md" label="Loading models" />
          </div>
        )}

        {data && (
          <div className="grid gap-8 enter" data-ui data-testid="admin-models">
            <section className="panel-soft px-4 py-4 grid gap-4" aria-label="Feature model picks">
              <h2 className="text-[14px] font-medium">Features</h2>
              <div className="grid gap-3">
                {FEATURE_ORDER.map((id) => {
                  const f = data.features[id];
                  return (
                    <label key={id} className="grid sm:grid-cols-[11rem_1fr] gap-2 items-start sm:items-center">
                      <span className="text-[14px]">
                        {f?.label ?? id}
                        <span className="block text-[12px] muted font-normal">{f?.description}</span>
                      </span>
                      <select
                        className="input text-[14px] py-2 px-2"
                        data-testid={`model-select-${id}`}
                        value={draft[id] ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, [id]: e.target.value }))}
                      >
                        <option value="">Default ({f?.resolvedModel})</option>
                        {data.catalog.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label} — {m.transportId}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                <button type="button" className="btn btn--primary btn--sm" disabled={saving} onClick={() => void save()}>
                  {saving ? "Saving…" : "Save assignments"}
                </button>
                <button
                  type="button"
                  className="btn btn--tinted btn--sm"
                  disabled={probing}
                  data-testid="probe-all"
                  onClick={() => void runProbe(true)}
                >
                  {probing ? "Probing…" : "Probe catalog & autofix"}
                </button>
                <a href="#/admin/usage" className="btn btn--ghost btn--sm">
                  Usage
                </a>
              </div>
            </section>

            <section className="grid gap-3" aria-label="Catalog">
              <h2 className="text-[14px] font-medium">Catalog</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="muted border-b" style={{ borderColor: "var(--line)" }}>
                      <th className="px-3 py-2 font-medium">Model</th>
                      <th className="px-3 py-2 font-medium">Transport id</th>
                      <th className="px-3 py-2 font-medium">Verified</th>
                      <th className="px-3 py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.catalog.map((m) => (
                      <tr key={m.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{m.label}</div>
                          <div className="muted text-[12px]">{m.blurb}</div>
                        </td>
                        <td className="px-3 py-2 font-mono text-[12px]">{m.transportId}</td>
                        <td className="px-3 py-2 text-[12px]">
                          {m.override?.verifiedStrategy ? (
                            <span className="text-[var(--ok)]">
                              {m.override.verifiedStrategy}
                              {m.override.verifiedAt
                                ? ` · ${new Date(m.override.verifiedAt).toLocaleDateString()}`
                                : ""}
                            </span>
                          ) : m.override?.lastError ? (
                            <span className="text-[var(--danger)]" title={m.override.lastError}>
                              failed
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 muted text-[12px]">
                          {m.recommendedFor.join(", ")}
                          {m.override?.maxTokens != null ? ` · max ${m.override.maxTokens}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {probe && (
              <section className="panel-soft px-4 py-4 grid gap-3" data-testid="probe-report">
                <h2 className="text-[14px] font-medium">
                  Probe report — {probe.summary.ok} ok · {probe.summary.failed} failed
                </h2>
                <ul className="grid gap-2 text-[13px]">
                  {probe.results.map((r, i) => (
                    <li key={`${r.catalogId}-${r.feature}-${i}`} className="flex flex-wrap gap-x-3 gap-y-1">
                      <span className={r.ok ? "text-[var(--ok)]" : "text-[var(--danger)]"}>
                        {r.ok ? "ok" : "fail"}
                      </span>
                      <span className="font-mono text-[12px]">{r.catalogId ?? r.model}</span>
                      <span className="muted">{r.feature}</span>
                      {r.winningStrategy ? <span className="muted">via {r.winningStrategy}</span> : null}
                      {!r.ok && r.attempts.at(-1)?.error ? (
                        <span className="muted truncate max-w-[28rem]" title={r.attempts.at(-1)?.error}>
                          {r.attempts.at(-1)?.error}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
