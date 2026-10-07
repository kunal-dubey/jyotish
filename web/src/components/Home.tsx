"use client";
import { useEffect, useState } from "react";
import { api } from "./api";

const STATUS_LABEL: Record<string, string> = {
  chart: "Awaiting confirmation",
  confirmed: "Confirmed, past-check not written",
  past_check: "Awaiting score",
  scored: "Scored",
  reports: "Reports written",
  guidance: "Guidance written",
  protocol: "Protocol ready",
};

type Row = Awaited<ReturnType<typeof api.list>>[number];

export default function Home() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.list().then(setRows, (e) => setErr(e.message));
  }, []);

  return (
    <main className="mx-auto max-w-[78rem] px-5 md:px-8 py-12 md:py-20 grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 md:gap-20">
      <section className="enter">
        <h1 className="serif text-[44px] md:text-[56px] leading-[1.02] tracking-tight">
          A natal reading that has to earn its weight.
        </h1>
        <p className="mt-6 text-[16px] muted max-w-[30rem] leading-relaxed">
          The chart is computed, not recalled. The analysis stops twice: once to confirm the birth data, once to score a
          blind check of the past. What comes after is read at the volume the score allows.
        </p>
        <a href="#/new" className="btn btn-primary mt-8">
          Begin a reading
        </a>
      </section>

      <section aria-labelledby="readings-h" className="enter">
        <h2 id="readings-h" className="eyebrow mb-4">
          Readings
        </h2>
        {err && <p className="note note-bad">{err}</p>}
        {rows && rows.length === 0 && (
          <p className="muted serif text-[18px] italic">None yet. A reading starts with a name, an exact time, and a place.</p>
        )}
        {rows && rows.length > 0 && (
          <ul className="border-t hair">
            {rows.map((r) => (
              <li key={r.id} className="border-b hair">
                <a href={`#/r/${r.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4 group">
                  <span>
                    <span className="serif text-[21px] group-hover:underline underline-offset-4 decoration-1">{r.name}</span>
                    <span className="block text-[13px] muted">
                      {r.date} · {r.place} · {r.lagna} lagna
                    </span>
                  </span>
                  <span className="text-[12.5px] muted self-center text-right">{STATUS_LABEL[r.status] ?? r.status}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
