"use client";
import { useEffect, useState } from "react";
import { api } from "./api";

const STATUS_LABEL: Record<string, string> = {
  chart: "Confirm the chart",
  confirmed: "Ready for the past-check",
  past_check: "Score the blind check",
  scored: "Past-check scored",
  reports: "Reports ready",
  guidance: "Guidance ready",
  protocol: "Protocol ready",
};

const STATUS_TONE: Record<string, string> = {
  past_check: "text-[var(--gold)]",
  chart: "text-[var(--accent)]",
  confirmed: "text-[var(--accent)]",
};

type Row = Awaited<ReturnType<typeof api.list>>[number];

export default function Home() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.list().then(setRows, (e) => setErr(e.message));
  }, []);

  return (
    <main className="sky min-h-[calc(100dvh-3.5rem)] relative">
      <div className="orb orb-a drift" aria-hidden />
      <div className="mx-auto max-w-[78rem] px-5 md:px-8 py-12 md:py-20 grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 md:gap-20">
        <section className="enter">
          <p className="eyebrow text-[var(--gold)]">Your library</p>
          <h1 className="serif text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.02] tracking-tight mt-3">
            Readings that pause until the chart proves itself.
          </h1>
          <p className="mt-5 text-[16px] muted max-w-[30rem] leading-relaxed">
            Start when you have a name, a birth moment, and a place. The blind past-check is the heart of the path —
            everything after it opens at the volume that score allows.
          </p>
          <a href="#/begin" className="btn btn-primary mt-8">
            Begin a reading
          </a>
        </section>

        <section aria-labelledby="readings-h" className="enter">
          <h2 id="readings-h" className="eyebrow mb-4">
            In progress
          </h2>
          {err && <p className="note note-bad">{err}</p>}
          {rows && rows.length === 0 && (
            <div className="panel-soft">
              <p className="serif text-[20px] italic muted">None yet.</p>
              <p className="mt-2 text-[14px] muted">A reading starts with a few quiet facts — one screen at a time.</p>
            </div>
          )}
          {rows && rows.length > 0 && (
            <ul className="grid gap-2">
              {rows.map((r) => (
                <li key={r.id}>
                  <a
                    href={`#/r/${r.id}`}
                    className="panel flex items-center justify-between gap-4 group"
                  >
                    <span>
                      <span className="serif text-[22px] group-hover:underline underline-offset-4 decoration-1">
                        {r.name}
                      </span>
                      <span className="block text-[13px] muted mt-0.5">
                        {r.date} · {r.place} · {r.lagna} lagna
                      </span>
                    </span>
                    <span className={`text-[12.5px] text-right shrink-0 ${STATUS_TONE[r.status] ?? "muted"}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
