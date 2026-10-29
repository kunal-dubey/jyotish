"use client";
import { useCallback, useEffect, useState } from "react";
import type { Status } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/types";
import { api, type LoadedReading } from "./api";
import ChartPanel from "./ChartPanel";
import ScorePanel from "./ScorePanel";
import StageRunner from "./StageRunner";
import ModulesPanel from "./ModulesPanel";
import { TermLink } from "./TermLink";

/** Four stages — names match the UX spec. */
type Path = "confirm" | "today" | "past" | "forward";
type ForwardTab = "reports" | "guidance" | "protocol";

const at = (s: Status) => STATUS_ORDER.indexOf(s);

const PATH: {
  id: Path;
  title: string;
  short: string;
  purpose: string;
  doneAt: Status;
  openAt: Status;
  paid?: boolean;
}[] = [
  {
    id: "confirm",
    title: "Confirm the Birth Moment",
    short: "Birth Chart",
    purpose: "Changing details later resets confirmation and any past-check scores.",
    doneAt: "confirmed",
    openAt: "chart",
  },
  {
    id: "today",
    title: "Chart Atlas",
    short: "Chart Atlas",
    purpose: "Twelve areas of life, one plain line each. Open an area to see why it reads that way, then open it further for the chart behind it.",
    doneAt: "confirmed",
    openAt: "chart",
  },
  {
    id: "past",
    title: "Past-Check",
    short: "Past-Check",
    purpose: "Statements written from the chart before anyone read your history. Score each one against what actually happened.",
    doneAt: "scored",
    openAt: "confirmed",
    paid: true,
  },
  {
    id: "forward",
    title: "Reports",
    short: "Reports",
    purpose: "Forward reports sit behind the past-check. This is what opens, and when.",
    doneAt: "protocol",
    openAt: "scored",
    paid: true,
  },
];

function furthest(s: Status, paidOk: boolean): Path {
  if (s === "chart") return "confirm";
  if (s === "confirmed") return "today";
  if (!paidOk) return "today";
  if (at(s) < at("scored")) return "past";
  return "forward";
}

function forwardTabFor(s: Status): ForwardTab {
  if (at(s) >= at("protocol")) return "protocol";
  if (at(s) >= at("guidance")) return "guidance";
  return "reports";
}

function stageNote(s: (typeof PATH)[number], reading: LoadedReading, paidOk: boolean, done: boolean, open: boolean) {
  if (s.id === "confirm") return done ? "Confirmed" : "Check the details";
  if (s.id === "today") {
    if (done) return "Read";
    if (open) return "Twelve areas of life";
    return "After the chart";
  }
  if (s.id === "past") {
    if (!paidOk) return "After the past-check";
    if (reading.status === "scored" || at(reading.status) > at("scored")) {
      const claims = reading.outputs.claims ?? [];
      const points = claims.reduce((sum, c) => {
        const v = reading.scores[c.id];
        if (v === "right") return sum + 2;
        if (v === "unclear") return sum + 1;
        return sum;
      }, 0);
      return claims.length ? `Scored ${points} of ${claims.length * 2}` : "Scored";
    }
    if (reading.outputs.claims?.length) {
      const answered = reading.outputs.claims.filter((c) => reading.scores[c.id]).length;
      return `${answered} of ${reading.outputs.claims.length} scored`;
    }
    if (at(reading.status) >= at("confirmed")) return "After the atlas";
    return "After the chart";
  }
  if (!paidOk || !open) return "After the past-check";
  if (done || at(reading.status) >= at("reports")) return "Open";
  return "After the past-check";
}

export default function ReadingView({ id }: { id: string }) {
  const [r, setR] = useState<LoadedReading | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [path, setPath] = useState<Path | null>(null);
  const [forwardTab, setForwardTab] = useState<ForwardTab>("reports");
  const [showFoundation, setShowFoundation] = useState(false);
  const [editBirth, setEditBirth] = useState(false);

  const onReading = useCallback((next: LoadedReading) => {
    setR((prev) => {
      if (prev?.status === "chart" && next.status === "confirmed") setPath("today");
      if (prev?.status === "past_check" && next.status === "scored") {
        setPath("forward");
        setForwardTab("reports");
      }
      return {
        ...next,
        modules: next.modules ?? prev?.modules,
        plan: next.plan ?? prev?.plan,
        canAccessPaid: next.canAccessPaid ?? prev?.canAccessPaid,
      };
    });
  }, []);

  useEffect(() => {
    api.get(id).then(
      (x) => {
        setR(x);
        setPath(furthest(x.status, !!x.canAccessPaid));
        setForwardTab(forwardTabFor(x.status));
      },
      (e) => setErr(e.message),
    );
  }, [id]);

  useEffect(() => {
    if (!r?.generating) return;
    const t = setInterval(() => api.get(id).then((x) => (x.generating ? null : onReading(x))), 4000);
    return () => clearInterval(t);
  }, [r?.generating, id, onReading]);

  if (err) return <p className="note note-bad m-4 sm:m-8">{err}</p>;
  if (!r || !path) {
    return (
      <div className="app-shell grid place-items-center min-h-[40vh]">
        <span className="pulse" aria-hidden />
      </div>
    );
  }

  const reading = r;
  const name = reading.intake.callName || reading.intake.name;
  const paidOk = !!reading.canAccessPaid;
  const current = PATH.find((s) => s.id === path)!;
  const asc = reading.chart.ascendant.sign;

  const isOpen = (s: (typeof PATH)[number]) => {
    if (s.paid && !paidOk) return true;
    if (s.id === "today") return at(reading.status) >= at("chart");
    return at(reading.status) >= at(s.openAt);
  };

  const isDone = (s: (typeof PATH)[number]) => {
    if (s.id === "today") return at(reading.status) >= at("confirmed");
    if (s.id === "forward") return at(reading.status) >= at("reports");
    return at(reading.status) >= at(s.doneAt);
  };

  function selectPath(s: (typeof PATH)[number]) {
    if (s.id === "today" || at(reading.status) >= at(s.openAt) || (s.paid && !paidOk)) setPath(s.id);
  }

  function go(next: Path) {
    const s = PATH.find((x) => x.id === next);
    if (s) selectPath(s);
  }

  async function remove() {
    if (!confirm(`Delete the reading for ${name}? This cannot be undone.`)) return;
    await api.remove(reading.id);
    window.location.hash = "#/";
  }

  const claimsReady = !!(reading.outputs.claims && reading.outputs.claims.length > 0);
  const pastGenerating = reading.generating === "past";
  const showPastRunner = !claimsReady || showFoundation || pastGenerating;
  const pastScored = at(reading.status) >= at("scored");

  return (
    <div className="app-shell">
      <div className="reading enter">
        <div className="rail">
          <a href="#/" className="linkbtn rail__back">
            ‹ All Readings
          </a>
          <div className="reading-id">
            <h1 className="reading-id__name" tabIndex={-1}>
              {name}
            </h1>
            <p className="reading-id__meta">
              {reading.intake.date} · <span className="num">{reading.intake.time}</span>
              <br />
              {reading.intake.place.label}
              <br />
              <TermLink
                termId="lagna"
                ctx={{
                  name,
                  rising: asc,
                  time: reading.intake.time,
                  place: reading.intake.place.label,
                }}
              >
                {asc} rising
              </TermLink>
              {reading.status === "chart" ? ", not confirmed" : ""}
            </p>
            <button
              type="button"
              className="linkbtn"
              style={{ color: "var(--gold)", textDecoration: "underline", textUnderlineOffset: "0.18em" }}
              onClick={() => {
                setEditBirth(true);
                setPath("confirm");
              }}
            >
              Edit Birth Details
            </button>
          </div>

          <nav aria-label="Reading stages">
            <ol className="stepper">
              {PATH.map((s) => {
                const open = isOpen(s);
                const done = isDone(s);
                const currentStep = path === s.id;
                const locked = !open && !(s.paid && !paidOk);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`stage${currentStep ? " is-current" : ""}${done ? " is-done" : ""}${locked ? " is-locked" : ""}`}
                      aria-current={currentStep ? "step" : undefined}
                      aria-disabled={locked || undefined}
                      onClick={() => selectPath(s)}
                    >
                      <span className="stage__mark" aria-hidden>
                        {locked ? (
                          <svg width="14" height="14" viewBox="0 0 14 14">
                            <rect x="3.5" y="6.5" width="7" height="5.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                            <path d="M5 6.5V5a2 2 0 0 1 4 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                        ) : done && !currentStep ? (
                          <svg width="14" height="14" viewBox="0 0 14 14">
                            <path d="M3 7.2 5.8 10 11 4" fill="none" stroke="var(--ok)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <span className="stage__dot" />
                        )}
                      </span>
                      <span className="stage__text">
                        <span className="stage__label">{s.short}</span>
                        <span className="stage__note">{stageNote(s, reading, paidOk, done, open)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <button type="button" className="linkbtn" onClick={remove}>
            Delete reading
          </button>
        </div>

        <section className="stage-main" aria-label={current.short} key={path}>
          <div className="stage-head">
            <h2 className="stage-title" tabIndex={-1}>
              {current.title}
            </h2>
            <p className="lede">{current.purpose}</p>
          </div>

          {path === "confirm" && (
            <>
              <ChartPanel
                r={r}
                onReading={(next) => {
                  setEditBirth(false);
                  onReading(next);
                }}
                startEditing={editBirth}
              />
              <div className="stage-foot">
                <p>
                  {at(reading.status) >= at("confirmed")
                    ? "Chart confirmed. Next: the atlas in plain words — then a blind past-check before any forecast."
                    : "Confirm the birth details above to continue."}
                </p>
                {at(reading.status) >= at("confirmed") && (
                  <button type="button" className="btn btn--primary" onClick={() => go("today")}>
                    Continue to Atlas
                  </button>
                )}
              </div>
            </>
          )}

          {path === "today" && (
            <>
              <ModulesPanel r={r} />
              <div className="stage-foot">
                <p>Next, the past-check: a handful of statements to score, just a few minutes. The reports open after you score them.</p>
                <button type="button" className="btn btn--primary" onClick={() => go("past")}>
                  {paidOk ? "Continue Past-Check" : "See Past-Check"}
                </button>
              </div>
            </>
          )}

          {path === "past" && !paidOk && (
            <>
              <PaidGate onToday={() => go("today")} />
              <div className="stage-foot">
                <button type="button" className="btn btn--ghost" onClick={() => go("today")}>
                  ← Atlas
                </button>
              </div>
            </>
          )}

          {path === "past" && paidOk && (
            <>
              {!claimsReady && !pastGenerating && (
                <div className="panel">
                  <p>
                    Claims are written from the name, birth data, and how the time is known. Nothing from occupation or
                    questions yet.
                  </p>
                </div>
              )}

              {claimsReady && !pastGenerating && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="small">Foundation written</p>
                  <button type="button" className="linkbtn" onClick={() => setShowFoundation((v) => !v)}>
                    {showFoundation ? "Hide foundation" : "Read the foundation"}
                  </button>
                </div>
              )}

              {showPastRunner && (
                <StageRunner
                  r={r}
                  stage="past"
                  output={r.outputs.past}
                  label="Generate the past-check"
                  onReading={onReading}
                />
              )}

              {claimsReady && !pastGenerating && (
                <ScorePanel key={r.outputs.past?.length} r={r} onReading={onReading} />
              )}

              <div className="stage-foot">
                <button type="button" className="btn btn--ghost" onClick={() => go("today")}>
                  ← Atlas
                </button>
                {pastScored && (
                  <button type="button" className="btn btn--primary" onClick={() => go("forward")}>
                    Open Reports
                  </button>
                )}
              </div>
            </>
          )}

          {path === "forward" && !paidOk && (
            <>
              <PaidGate onToday={() => go("today")} />
              <div className="stage-foot">
                <button type="button" className="btn btn--ghost" onClick={() => go("today")}>
                  ← Atlas
                </button>
              </div>
            </>
          )}

          {path === "forward" && paidOk && (
            <>
              {!pastScored ? (
                <div className="locked">
                  <h3>Score the past-check to open these</h3>
                  <p>Score every claim. Either way the reports open afterwards; a low score adds a note to read them as suggestions.</p>
                  <button type="button" className="btn btn--primary" onClick={() => go("past")}>
                    Go to the past-check
                  </button>
                </div>
              ) : (
                <>
                  <div className="tab-seg" role="tablist" aria-label="Forward pieces">
                    {(
                      [
                        { id: "reports" as const, name: "Reports", ready: !!r.outputs.reports },
                        { id: "guidance" as const, name: "Guidance", ready: !!r.outputs.guidance },
                        { id: "protocol" as const, name: "Living page", ready: !!r.outputs.protocol },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={forwardTab === t.id}
                        onClick={() => setForwardTab(t.id)}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>

                  {forwardTab === "reports" && (
                    <div className="grid gap-6">
                      <StageRunner
                        r={r}
                        stage="reports"
                        output={r.outputs.reports}
                        label="Write the reports"
                        onReading={onReading}
                      />
                      {!!r.outputs.reports && (
                        <button type="button" className="btn btn--ghost w-fit" onClick={() => setForwardTab("guidance")}>
                          Continue to guidance
                        </button>
                      )}
                    </div>
                  )}

                  {forwardTab === "guidance" && (
                    <div className="grid gap-6">
                      <StageRunner
                        r={r}
                        stage="guidance"
                        output={r.outputs.guidance}
                        label="Write the guidance"
                        onReading={onReading}
                      />
                      {!!r.outputs.guidance && (
                        <button type="button" className="btn btn--ghost w-fit" onClick={() => setForwardTab("protocol")}>
                          Continue to living page
                        </button>
                      )}
                    </div>
                  )}

                  {forwardTab === "protocol" && (
                    <div className="grid gap-6">
                      <StageRunner
                        r={r}
                        stage="protocol"
                        output={r.outputs.protocol ? "ready" : undefined}
                        showOutput={false}
                        label="Build the living page"
                        onReading={onReading}
                      />
                      {r.outputs.protocol && !r.generating && (
                        <div className="grid gap-4">
                          <div className="actions">
                            <a className="btn btn--primary" href={`/api/readings/${r.id}/protocol?download=1`}>
                              Download HTML
                            </a>
                            <a className="btn btn--ghost" href={`/api/readings/${r.id}/protocol`} target="_blank" rel="noreferrer">
                              Open in a new tab
                            </a>
                          </div>
                          <iframe
                            key={r.updatedAt}
                            title="Living page preview"
                            src={`/api/readings/${r.id}/protocol`}
                            className="w-full h-[55vh] sm:h-[70vh] rounded-[4px] bg-[var(--s1)] max-w-full"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="stage-foot">
                <button type="button" className="btn btn--ghost" onClick={() => go("past")}>
                  ← Past-check
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function PaidGate({ onToday }: { onToday: () => void }) {
  return (
    <div className="locked enter">
      <h3>The full protocol sits behind this step</h3>
      <p>
        Your atlas — life areas and one practice each — stays open. The past-check and the forward reports are part of
        the full protocol: statements about years you already lived, scored before any forecast. Upgrade to unlock them.
      </p>
      <button type="button" className="btn btn--primary" onClick={onToday}>
        Back to the atlas
      </button>
    </div>
  );
}
