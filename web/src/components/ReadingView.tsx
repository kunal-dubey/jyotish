"use client";
import { useCallback, useEffect, useState } from "react";
import type { Status } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/types";
import { api, type LoadedReading } from "./api";
import ChartPanel from "./ChartPanel";
import CosmicLoader from "./CosmicLoader";
import ForwardPanel, { type ForwardTab } from "./ForwardPanel";
import ScorePanel from "./ScorePanel";
import StageRunner from "./StageRunner";
import ModulesPanel from "./ModulesPanel";
import { TermLink } from "./TermLink";

/** Four stages — names match the UX spec. */
type Path = "confirm" | "today" | "past" | "forward";

const at = (s: Status) => STATUS_ORDER.indexOf(s);

const PATH: {
  id: Path;
  title: string;
  short: string;
  /** Compact label for narrow steppers (phones). */
  mobileShort: string;
  purpose: string;
  doneAt: Status;
  openAt: Status;
  paid?: boolean;
}[] = [
  {
    id: "confirm",
    title: "Confirm the Birth Moment",
    short: "Birth Chart",
    mobileShort: "Chart",
    purpose: "Check the chart against the recorded moment. Changing details later resets confirmation and past-check scores.",
    doneAt: "confirmed",
    openAt: "chart",
  },
  {
    id: "today",
    title: "Chart Atlas",
    short: "Chart Atlas",
    mobileShort: "Atlas",
    purpose: "Pick an area. Read the plain counsel. Open chart depth when you want it.",
    doneAt: "confirmed",
    openAt: "chart",
  },
  {
    id: "past",
    title: "Past-Check",
    short: "Past-Check",
    mobileShort: "Past",
    purpose: "Score chart statements against years you already lived — before any forecast.",
    doneAt: "scored",
    openAt: "confirmed",
    paid: true,
  },
  {
    id: "forward",
    title: "Reports",
    short: "Reports",
    mobileShort: "Reports",
    purpose: "Plain priorities after the past-check — then confidence, chart notes, and a living page.",
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
  if (at(s) >= at("guidance")) return "reading";
  if (at(s) >= at("reports")) return "howSure";
  return "reading";
}

function stageNote(s: (typeof PATH)[number], reading: LoadedReading, paidOk: boolean, done: boolean, open: boolean) {
  if (s.id === "confirm") return done ? "Confirmed" : "Check the details";
  if (s.id === "today") {
    if (done) return "Read";
    if (open) return "Twelve areas of life";
    return "After the chart";
  }
  if (s.id === "past") {
    if (!paidOk) return "Full reading";
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
  if (!paidOk || !open) return "Full reading";
  if (done || at(reading.status) >= at("reports")) return "Open";
  return "After the past-check";
}

export default function ReadingView({ id }: { id: string }) {
  const [r, setR] = useState<LoadedReading | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [path, setPath] = useState<Path | null>(null);
  const [forwardTab, setForwardTab] = useState<ForwardTab>("reading");
  const [editBirth, setEditBirth] = useState(false);

  const onReading = useCallback((next: LoadedReading) => {
    setR((prev) => {
      if (prev?.status === "chart" && next.status === "confirmed") setPath("today");
      if (prev?.status === "past_check" && next.status === "scored") {
        setPath("forward");
        setForwardTab("reading");
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
    return <CosmicLoader size="lg" fullPage label="Loading your reading" />;
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
  const pastScored = at(reading.status) >= at("scored");
  const pastIdle = path === "past" && paidOk && !claimsReady && !pastGenerating;
  const forwardActive = path === "forward" && paidOk && pastScored;
  const fitPage = path === "today" || (path === "past" && !pastIdle) || forwardActive;

  return (
    <div className={`app-shell${fitPage ? " app-shell--fit" : ""}`}>
      <div className={`reading enter${fitPage ? " reading--fit" : ""}`}>
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
                      aria-label={`${s.short}: ${stageNote(s, reading, paidOk, done, open)}`}
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
                        <span className="stage__label stage__label--full">{s.short}</span>
                        <span className="stage__label stage__label--short" aria-hidden>
                          {s.mobileShort}
                        </span>
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

        <section
          className={`stage-main${fitPage ? " stage-main--fit" : ""}`}
          aria-label={current.short}
          key={path}
        >
          <div className="stage-head">
            <h2 className="stage-title" tabIndex={-1}>
              {current.title}
            </h2>
            {path !== "today" && path !== "past" && path !== "forward" && (
              <p className="lede">{current.purpose}</p>
            )}
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
              {at(reading.status) >= at("confirmed") && (
                <div className="stage-foot">
                  <p>Next: the atlas in plain words — then a blind past-check before any forecast.</p>
                  <button type="button" className="btn btn--primary" onClick={() => go("today")}>
                    Continue to Atlas
                  </button>
                </div>
              )}
            </>
          )}

          {path === "today" && (
            <>
              <ModulesPanel
                r={r}
                onContinueToPast={() => go("past")}
                onUnlockHint={() => {
                  window.location.hash = "#/billing";
                }}
              />
              <div className="stage-foot">
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
              <div className="stage-body">
                {claimsReady && !pastGenerating ? (
                  <ScorePanel key={r.outputs.past?.length} r={r} onReading={onReading} />
                ) : pastGenerating ? (
                  <div className="past-wait enter">
                    <StageRunner
                      r={r}
                      stage="past"
                      output={r.outputs.past}
                      label="Generate the past-check"
                      onReading={onReading}
                    />
                  </div>
                ) : (
                  <div className="past-start enter">
                    <article className="atlas-reader">
                      <header className="atlas-reader__head">
                        <h3 className="atlas-reader__title">Past check</h3>
                        <p className="atlas-reader__practice">
                          Blind claims from periods already lived. Score how each fits before any forecast opens.
                        </p>
                      </header>
                      <StageRunner
                        r={r}
                        stage="past"
                        output={r.outputs.past}
                        label="Generate the past-check"
                        onReading={onReading}
                      />
                    </article>
                  </div>
                )}
              </div>

              <div className="stage-foot">
                <button type="button" className="btn btn--ghost" onClick={() => go("today")}>
                  ← Atlas
                </button>
                {pastScored ? (
                  <button type="button" className="btn btn--primary" onClick={() => go("forward")}>
                    Open your reading
                  </button>
                ) : null}
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
                  <h3>Score the past-check before any forecast</h3>
                  <p>
                    Score every claim. Either way your reading opens afterwards; a low score keeps the advice inside a
                    quieter confidence volume.
                  </p>
                  <button type="button" className="btn btn--primary" onClick={() => go("past")}>
                    Go to the past-check
                  </button>
                </div>
              ) : (
                <div className="stage-body">
                  <ForwardPanel r={r} tab={forwardTab} onTab={setForwardTab} onReading={onReading} />
                </div>
              )}

              <div className="stage-foot">
                <button type="button" className="btn btn--ghost" onClick={() => go("past")}>
                  ← Past-check
                </button>
                {pastScored && forwardTab === "reading" && !!r.outputs.guidance && (
                  <button type="button" className="btn btn--primary" onClick={() => setForwardTab("protocol")}>
                    Continue to living page
                  </button>
                )}
                {pastScored && (forwardTab === "howSure" || forwardTab === "chartNotes") && (
                  <button type="button" className="btn btn--primary" onClick={() => setForwardTab("reading")}>
                    {forwardTab === "chartNotes" ? "Back to your reading" : "Continue to your reading"}
                  </button>
                )}
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
      <h3>The full reading sits behind this step</h3>
      <p>
        Your atlas — life areas and one practice each — stays open on the free plan. The past-check and Reports are part
        of the full protocol: statements about years you already lived, scored before any forecast.
      </p>
      <div className="btn-row" style={{ marginTop: "1rem" }}>
        <a href="#/billing" className="btn btn--primary">
          See plans
        </a>
        <button type="button" className="btn btn--ghost" onClick={onToday}>
          Back to the atlas
        </button>
      </div>
    </div>
  );
}
