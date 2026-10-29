"use client";
import { useEffect, useState } from "react";
import { CORE_WORDS } from "@/lib/glossary";
import { api } from "./api";
import { TermLink } from "./TermLink";

const STAGES = ["Birth Chart", "Chart Atlas", "Past-Check", "Reports"] as const;

const NEXT_LABEL: Record<string, string> = {
  chart: "Confirm the Birth Chart",
  confirmed: "Read Chart Atlas",
  past_check: "Score the Past-Check",
  scored: "Open the Reports",
  reports: "Continue the Reports",
  guidance: "Continue Guidance",
  protocol: "Open the Living Page",
};

const NEXT_DESC: Record<string, string> = {
  chart: "Check the birth details once. Everything else is cast from them.",
  confirmed: "Twelve areas of life in plain language. Open any one to see why it reads that way.",
  past_check: "Statements about the past, scored blind. The reports open once you submit.",
  scored: "Reports, guidance, and a living page sit behind the past-check score.",
  reports: "Forward reports are in progress.",
  guidance: "Decade guidance is ready to continue.",
  protocol: "The living page is ready.",
};

function progressText(status: string) {
  if (status === "protocol" || status === "guidance" || status === "reports") return "Reports open";
  if (status === "scored") return "Now: Reports";
  if (status === "past_check") return "Now: Past-Check";
  if (status === "confirmed") return "Now: Chart Atlas";
  return "Now: Birth Chart";
}

function stageIndex(status: string): number {
  if (status === "chart") return 1;
  if (status === "confirmed") return 2;
  if (status === "past_check") return 3;
  return 4;
}

function stageDone(status: string, index: number) {
  const cur = stageIndex(status);
  if (index === 1) return cur >= 2;
  if (index === 2) return cur >= 3;
  if (index === 3) return cur >= 4 || status === "scored";
  return status === "protocol" || status === "guidance" || status === "reports";
}

function stageCurrent(status: string, index: number) {
  return !stageDone(status, index) && stageIndex(status) === index;
}

function stageLocked(status: string, index: number) {
  return !stageDone(status, index) && !stageCurrent(status, index) && stageIndex(status) < index;
}

type Row = Awaited<ReturnType<typeof api.list>>[number];

function CheckIcon() {
  return (
    <svg className="track__icon" viewBox="0 0 14 14" aria-hidden>
      <path
        d="M3 7.2 5.8 10 11 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="track__icon" viewBox="0 0 14 14" aria-hidden>
      <rect x="3.5" y="6.5" width="7" height="5.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 6.5V5a2 2 0 0 1 4 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Home({ onNewReading }: { onNewReading?: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.list().then(setRows, (e) => setErr(e.message));
  }, []);

  const hero = rows?.[0] ?? null;
  const others = rows && hero ? rows.slice(1) : [];
  const chartCtx = hero
    ? { name: hero.name, rising: hero.lagna, time: hero.time, place: hero.place }
    : undefined;

  return (
    <main className="app-shell">
      <section className="library enter">
        <header className="library__head">
          <h1 tabIndex={-1}>Your Readings</h1>
          <p className="lede">
            Each reading moves through four stages, from the birth chart to the reports. Any astrology word with a
            dotted underline explains itself when you tap it.
          </p>
        </header>

        {err && <p className="note note-bad">{err}</p>}

        <div className="library__layout">
          <div className="library__main">
            {!rows && (
              <div className="empty">
                <span className="pulse" aria-hidden />
              </div>
            )}

            {rows && rows.length === 0 && (
              <div className="empty">
                <h2>No Readings Yet</h2>
                <p className="muted">Start with a name, a birth moment and a place. The chart is cast from those.</p>
                <button type="button" className="btn btn--primary" onClick={onNewReading}>
                  New Reading
                </button>
              </div>
            )}

            {hero && (
              <>
                <article className="hero" aria-labelledby="hero-name">
                  <div>
                    <h2 className="hero__name" id="hero-name">
                      {hero.name}
                    </h2>
                    <p className="hero__meta">
                      {hero.date}
                      {hero.time ? <> · <span className="num">{hero.time}</span></> : null}
                      {" · "}
                      {hero.place}
                      {hero.lagna ? (
                        <>
                          {" · "}
                          <TermLink termId="lagna" ctx={chartCtx}>
                            {hero.lagna} rising
                          </TermLink>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <ol className="track" aria-label="Progress">
                    {STAGES.map((name, i) => {
                      const idx = i + 1;
                      const done = stageDone(hero.status, idx);
                      const current = stageCurrent(hero.status, idx);
                      const locked = stageLocked(hero.status, idx);
                      return (
                        <li
                          key={name}
                          className={`track__step${done ? " is-done" : ""}${current ? " is-current" : ""}${locked ? " is-locked" : ""}`}
                        >
                          <span className="track__bar" aria-hidden />
                          {done || current ? (
                            <a href={`#/r/${hero.id}`} className="track__label track__label--link">
                              {done && !current ? <CheckIcon /> : null}
                              {name}
                              <span className="sr-only">
                                , {done ? "done" : "current"} — open reading
                              </span>
                            </a>
                          ) : (
                            <span className="track__label">
                              {locked ? <LockIcon /> : null}
                              {name}
                              <span className="sr-only">
                                , {locked ? "locked" : "not started"}
                              </span>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  <p className="hero__next">{NEXT_DESC[hero.status] ?? NEXT_DESC.chart}</p>
                  <div className="hero__actions">
                    <a href={`#/r/${hero.id}`} className="btn btn--primary">
                      {NEXT_LABEL[hero.status] ?? "Open reading"}
                    </a>
                  </div>
                </article>

                {others.length > 0 && (
                  <section aria-labelledby="others-title">
                    <h2 className="section-title" id="others-title">
                      Other Readings
                    </h2>
                    <ul className="reading-list">
                      {others.map((r) => (
                        <li key={r.id}>
                          <a href={`#/r/${r.id}`} className="reading-row">
                            <div>
                              <h3 className="reading-row__name">{r.name}</h3>
                              <p className="small">
                                {r.date}
                                {r.time ? <> · {r.time}</> : null}
                                {" · "}
                                {r.place}
                              </p>
                            </div>
                            <p className="reading-row__state">{progressText(r.status)}</p>
                            <span className="reading-row__chev" aria-hidden>
                              ›
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>

          <aside className="aside" aria-label="Help">
            {hero && (
              <div className="aside__block">
                <h2>Words to Know</h2>
                <p className="small">
                  Tap one for what it means and what it says in {hero.name}&apos;s chart. Click to keep it open.
                </p>
                <ul className="words">
                  {(["lagna", "house", "dasha", "mahadasha", "antardasha", "nakshatra"] as const).map((id) => {
                    const w = CORE_WORDS.find((x) => x.id === id);
                    if (!w) return null;
                    return (
                      <li key={w.id}>
                        <TermLink termId={w.id} ctx={chartCtx}>
                          {w.label}
                        </TermLink>
                        <span className="small">{w.short}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <details className="disclose">
              <summary>
                How a Reading Works
                <span aria-hidden>▾</span>
              </summary>
              <div className="disclose__body">
                <ol className="how">
                  <li>
                    <h3>Birth Chart · about 2 min</h3>
                    <p>Confirm the birth moment once. Everything else is cast from it.</p>
                  </li>
                  <li>
                    <h3>Chart Atlas · about 8 min</h3>
                    <p>Twelve areas of life in plain words, each with one practice you can use.</p>
                  </li>
                  <li>
                    <h3>Past-Check · about 6 min</h3>
                    <p>Statements about years you already lived, scored before any forecast. How many depends on the report.</p>
                  </li>
                  <li>
                    <h3>Reports</h3>
                    <p>The year ahead, the decade, and a page to keep — after you score.</p>
                  </li>
                </ol>
              </div>
            </details>

            <details className="disclose">
              <summary>
                Why the Past-Check Comes First
                <span aria-hidden>▾</span>
              </summary>
              <div className="disclose__body">
                <p>
                  If the chart cannot describe what already happened, its forecast is decoration. You score it, and
                  nothing is adjusted afterwards. The pass line is just over half the available points.
                </p>
              </div>
            </details>
          </aside>
        </div>
      </section>
    </main>
  );
}
