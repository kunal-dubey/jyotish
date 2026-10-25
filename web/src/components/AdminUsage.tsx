"use client";
import { useEffect, useState } from "react";
import { api, type LlmUsageReport } from "./api";

function fmt(n: number) {
  return n.toLocaleString();
}

function TotalsCard({ title, t }: { title: string; t: LlmUsageReport["totals"] }) {
  return (
    <div className="panel-soft px-4 py-3.5">
      <p className="eyebrow">{title}</p>
      <p className="serif text-[1.75rem] leading-none mt-2 tabular-nums">{fmt(t.totalTokens)}</p>
      <p className="text-[12.5px] muted mt-2">
        {fmt(t.calls)} calls · {fmt(t.ok)} ok · {fmt(t.failed)} failed
      </p>
      <p className="text-[12px] muted mt-1">
        in {fmt(t.inputTokens)} · out {fmt(t.outputTokens)} · cache {fmt(t.cacheReadTokens)}
      </p>
    </div>
  );
}

export default function AdminUsage() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<LlmUsageReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .adminUsage(days)
      .then((r) => {
        setReport(r);
        setErr(null);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <main className="sky min-h-[calc(100dvh-3.5rem)]">
      <div className="mx-auto max-w-[78rem] px-4 sm:px-5 md:px-8 py-8 sm:py-12 grid gap-8">
        <header className="max-w-[40rem] enter">
          <p className="eyebrow text-[var(--gold)]">Admin</p>
          <h1 className="serif text-[clamp(1.8rem,5vw,2.8rem)] leading-tight mt-1">LLM usage</h1>
          <p className="muted mt-3 text-[14.5px] leading-relaxed">
            Every protocol stage call is logged to <code className="text-[12px]">llm_usage</code> with model, tokens,
            and outcome. Readings still keep a per-stage snapshot; this table is the durable ledger.
          </p>
          <label className="mt-5 flex items-center gap-2 text-[13px]">
            <span className="muted">Window</span>
            <select
              className="input text-[13px] py-1.5 px-2 w-auto"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>365 days</option>
            </select>
          </label>
        </header>

        {err && <p className="note note-bad">{err}</p>}
        {loading && !report && (
          <div className="grid place-items-center py-16">
            <span className="pulse" aria-hidden />
          </div>
        )}

        {report && (
          <div className="grid gap-8 enter">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <TotalsCard title="All tokens" t={report.totals} />
              {(["past", "reports", "guidance", "protocol"] as const).map((stage) =>
                report.byStage[stage] ? (
                  <TotalsCard key={stage} title={stage} t={report.byStage[stage]} />
                ) : null,
              )}
            </div>

            <section className="grid gap-3">
              <h2 className="eyebrow">By model</h2>
              <div className="overflow-x-auto panel-soft">
                <table className="w-full text-[13px] min-w-[28rem]">
                  <thead>
                    <tr className="muted text-left">
                      <th className="px-3 py-2 font-medium">Model</th>
                      <th className="px-3 py-2 font-medium">Calls</th>
                      <th className="px-3 py-2 font-medium">Tokens</th>
                      <th className="px-3 py-2 font-medium">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.byModel)
                      .sort((a, b) => b[1].totalTokens - a[1].totalTokens)
                      .map(([model, t]) => (
                        <tr key={model} className="border-t hair">
                          <td className="px-3 py-2 font-mono text-[12px]">{model}</td>
                          <td className="px-3 py-2 tabular-nums">{fmt(t.calls)}</td>
                          <td className="px-3 py-2 tabular-nums">{fmt(t.totalTokens)}</td>
                          <td className="px-3 py-2 tabular-nums">{fmt(t.failed)}</td>
                        </tr>
                      ))}
                    {Object.keys(report.byModel).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 muted">
                          No calls in this window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-3">
              <h2 className="eyebrow">By user</h2>
              <div className="overflow-x-auto panel-soft">
                <table className="w-full text-[13px] min-w-[28rem]">
                  <thead>
                    <tr className="muted text-left">
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Calls</th>
                      <th className="px-3 py-2 font-medium">Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byUser.slice(0, 40).map((u) => (
                      <tr key={u.userId} className="border-t hair">
                        <td className="px-3 py-2">{u.email ?? u.userId}</td>
                        <td className="px-3 py-2 tabular-nums">{fmt(u.totals.calls)}</td>
                        <td className="px-3 py-2 tabular-nums">{fmt(u.totals.totalTokens)}</td>
                      </tr>
                    ))}
                    {report.byUser.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 muted">
                          No users yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-3">
              <h2 className="eyebrow">Recent calls</h2>
              <div className="overflow-x-auto panel-soft">
                <table className="w-full text-[12.5px] min-w-[40rem]">
                  <thead>
                    <tr className="muted text-left">
                      <th className="px-3 py-2 font-medium">When</th>
                      <th className="px-3 py-2 font-medium">Stage</th>
                      <th className="px-3 py-2 font-medium">Model</th>
                      <th className="px-3 py-2 font-medium">In / out</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.recent.map((e) => (
                      <tr key={e.id} className="border-t hair">
                        <td className="px-3 py-2 whitespace-nowrap muted">{e.createdAt.slice(0, 19).replace("T", " ")}</td>
                        <td className="px-3 py-2">{e.stage}</td>
                        <td className="px-3 py-2 font-mono text-[11px] max-w-[12rem] truncate" title={e.model}>
                          {e.model}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {fmt(e.inputTokens)} / {fmt(e.outputTokens)}
                        </td>
                        <td className="px-3 py-2">
                          {e.ok ? (
                            <span className="text-[var(--ok)]">ok</span>
                          ) : (
                            <span className="text-[var(--bad)]" title={e.error}>
                              fail
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
