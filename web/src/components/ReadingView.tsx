"use client";
import { useCallback, useEffect, useState } from "react";
import type { Status } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/types";
import { api, type LoadedReading } from "./api";
import ChartPanel from "./ChartPanel";
import ScorePanel from "./ScorePanel";
import StageRunner from "./StageRunner";
import ModulesPanel from "./ModulesPanel";

type Section = "chart" | "modules" | "past" | "reports" | "guidance" | "protocol";
type Phase = "foundation" | "protocol";

const at = (s: Status) => STATUS_ORDER.indexOf(s);

type SectionDef = {
  id: Section;
  n: string;
  title: string;
  short: string;
  /** One line in the rail. */
  sub: string;
  /** What this step is for (header strip). */
  purpose: string;
  /** What the user does here. */
  youDo: string;
  phase: Phase;
  doneAt: Status;
  openAt: Status;
  highlight?: boolean;
  paid?: boolean;
  next?: Section;
  nextLabel?: string;
  back?: Section;
  backLabel?: string;
};

const SECTIONS: SectionDef[] = [
  {
    id: "chart",
    n: "1",
    title: "Birth chart",
    short: "Chart",
    sub: "Confirm the moment",
    purpose: "Lock the birth data the whole reading rests on.",
    youDo: "Check date, time, and place. Confirm only when they look right.",
    phase: "foundation",
    doneAt: "confirmed",
    openAt: "chart",
    next: "modules",
    nextLabel: "Continue to chart atlas",
  },
  {
    id: "modules",
    n: "2",
    title: "Chart atlas",
    short: "Atlas",
    sub: "Life areas · free",
    purpose: "See how each life area sits for you right now — in plain words.",
    youDo: "Read Right now, open any area for more detail. No scoring yet.",
    phase: "foundation",
    doneAt: "confirmed",
    openAt: "chart",
    back: "chart",
    backLabel: "Birth chart",
    next: "past",
    nextLabel: "Continue to blind past-check",
  },
  {
    id: "past",
    n: "3",
    title: "Blind past-check",
    short: "Past-check",
    sub: "Score the claims",
    purpose: "Test the chart against periods you already lived — before any forward counsel.",
    youDo: "Generate claims, mark each right / wrong / unclear. That score calibrates everything after.",
    phase: "protocol",
    doneAt: "scored",
    openAt: "confirmed",
    highlight: true,
    paid: true,
    back: "modules",
    backLabel: "Chart atlas",
    next: "reports",
    nextLabel: "Continue to reports",
  },
  {
    id: "reports",
    n: "4",
    title: "Forward reports",
    short: "Reports",
    sub: "Timeline & vocation",
    purpose: "Detailed forward reading written with your past-check score in hand.",
    youDo: "Generate Reports 3–6, then open sections when you want depth.",
    phase: "protocol",
    doneAt: "reports",
    openAt: "scored",
    paid: true,
    back: "past",
    backLabel: "Past-check",
    next: "guidance",
    nextLabel: "Continue to guidance",
  },
  {
    id: "guidance",
    n: "5",
    title: "Decade guidance",
    short: "Guidance",
    sub: "Plain language",
    purpose: "The same substance without classical vocabulary — priorities for the decade.",
    youDo: "Generate guidance, then read at your pace.",
    phase: "protocol",
    doneAt: "guidance",
    openAt: "reports",
    paid: true,
    back: "reports",
    backLabel: "Reports",
    next: "protocol",
    nextLabel: "Continue to living protocol",
  },
  {
    id: "protocol",
    n: "6",
    title: "Living protocol",
    short: "Protocol",
    sub: "A page to keep",
    purpose: "One HTML page that keeps weekday, periods, and season current when you reopen it.",
    youDo: "Build once, download or bookmark, return anytime.",
    phase: "protocol",
    doneAt: "protocol",
    openAt: "guidance",
    paid: true,
    back: "guidance",
    backLabel: "Guidance",
  },
];

const PHASE_LABEL: Record<Phase, string> = {
  foundation: "Included with every reading",
  protocol: "Full protocol",
};

function furthest(s: Status, paidOk: boolean): Section {
  // Prefer atlas while still on chart/confirmed before past-check is generated.
  if (s === "chart" || s === "confirmed") return s === "chart" ? "chart" : "modules";
  const open = SECTIONS.filter((x) => {
    if (x.paid && !paidOk) return false;
    return at(s) >= at(x.openAt);
  });
  if (!open.length) return "chart";
  return open[open.length - 1].id;
}

export default function ReadingView({ id }: { id: string }) {
  const [r, setR] = useState<LoadedReading | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [showFoundation, setShowFoundation] = useState(false);

  const onReading = useCallback((next: LoadedReading) => {
    setR((prev) => {
      // After confirm → atlas (not skip to past). After scoring → reports.
      if (prev?.status === "chart" && next.status === "confirmed") setSection("modules");
      if (prev?.status === "past_check" && next.status === "scored") setSection("reports");
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
        setSection(furthest(x.status, !!x.canAccessPaid));
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
  if (!r || !section) {
    return (
      <div className="sky min-h-[40vh] grid place-items-center">
        <span className="pulse" aria-hidden />
      </div>
    );
  }

  const reading = r;
  const name = reading.intake.callName || reading.intake.name;
  const paidOk = !!reading.canAccessPaid;
  const current = SECTIONS.find((s) => s.id === section)!;

  const isOpen = (s: SectionDef) => {
    if (s.paid && !paidOk) return true;
    return at(reading.status) >= at(s.openAt);
  };

  const canGoNext = (s: SectionDef) => {
    if (!s.next) return false;
    const next = SECTIONS.find((x) => x.id === s.next)!;
    if (next.paid && !paidOk) return true; // show paid gate
    if (s.id === "chart") return at(reading.status) >= at("confirmed");
    if (s.id === "modules") return at(reading.status) >= at("confirmed");
    if (s.id === "past") return at(reading.status) >= at("scored");
    if (s.id === "reports") return at(reading.status) >= at("reports");
    if (s.id === "guidance") return at(reading.status) >= at("guidance");
    return false;
  };

  const claimsReady = !!(reading.outputs.claims && reading.outputs.claims.length > 0);
  const pastGenerating = reading.generating === "past";
  const showPastRunner = !claimsReady || showFoundation || pastGenerating;

  function selectSection(s: SectionDef) {
    if (s.id === "modules" || at(reading.status) >= at(s.openAt) || (s.paid && !paidOk)) setSection(s.id);
  }

  function go(id: Section) {
    const s = SECTIONS.find((x) => x.id === id);
    if (s) selectSection(s);
  }

  async function remove() {
    if (!confirm(`Delete the reading for ${name}? This cannot be undone.`)) return;
    await api.remove(reading.id);
    window.location.hash = "#/";
  }

  const foundationSecs = SECTIONS.filter((s) => s.phase === "foundation");
  const protocolSecs = SECTIONS.filter((s) => s.phase === "protocol");

  function RailGroup({ phase, items }: { phase: Phase; items: SectionDef[] }) {
    return (
      <div className="grid gap-1">
        <p className="eyebrow text-[10.5px] px-1.5 mb-1">{PHASE_LABEL[phase]}</p>
        {items.map((s, k) => (
          <div key={s.id}>
            <a
              href={`#/r/${reading.id}`}
              aria-current={section === s.id ? "step" : undefined}
              aria-disabled={!isOpen(s)}
              className={`${at(reading.status) >= at(s.doneAt) ? "done" : ""} ${s.highlight ? "highlight" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                selectSection(s);
              }}
              style={
                !isOpen(s) || (s.paid && !paidOk)
                  ? { opacity: s.paid && !paidOk ? 0.7 : 0.4, cursor: s.paid && !paidOk ? "pointer" : "not-allowed" }
                  : undefined
              }
            >
              <span className="dot">
                {at(reading.status) >= at(s.doneAt) ? "✓" : s.paid && !paidOk ? "·" : s.n}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-medium">
                  {s.title}
                  {s.paid && !paidOk ? <span className="muted font-normal"> · locked</span> : null}
                </span>
                <span className="block text-[12px] muted">{s.sub}</span>
              </span>
            </a>
            {s.id === "chart" && <div className="stop">confirm</div>}
            {s.id === "modules" && k === items.length - 1 && phase === "foundation" && (
              <div className="stop">then protocol</div>
            )}
            {s.id === "past" && <div className="stop">score</div>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="sky min-h-[calc(100dvh-3.5rem)]">
      <div className="mx-auto max-w-[78rem] px-4 sm:px-5 md:px-8 py-6 sm:py-8 md:py-12 grid lg:grid-cols-[15rem_minmax(0,1fr)] gap-6 lg:gap-14">
        <aside className="lg:sticky lg:top-20 self-start min-w-0">
          <div className="min-w-0">
            <h1 className="serif text-[clamp(1.4rem,4vw,1.65rem)] leading-tight truncate">{name}</h1>
            <p className="text-[13px] muted mt-1">
              {r.intake.date} · {r.chart.ascendant.sign} lagna
            </p>
          </div>

          <nav className="rail-scroll mt-4 lg:hidden" aria-label="Reading steps">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#/r/${r.id}`}
                aria-current={section === s.id ? "step" : undefined}
                aria-disabled={!isOpen(s)}
                className={`${at(r.status) >= at(s.doneAt) ? "done" : ""} ${s.highlight ? "highlight" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  selectSection(s);
                }}
                style={
                  !isOpen(s) || (s.paid && !paidOk)
                    ? { opacity: s.paid && !paidOk ? 0.65 : 0.4, cursor: s.paid && !paidOk ? "pointer" : "not-allowed" }
                    : undefined
                }
              >
                <span className="dot">{at(r.status) >= at(s.doneAt) ? "✓" : s.paid && !paidOk ? "🔒" : s.n}</span>
                {s.short}
              </a>
            ))}
          </nav>

          <nav className="rail mt-6 hidden lg:grid gap-5" aria-label="Reading steps">
            <RailGroup phase="foundation" items={foundationSecs} />
            <RailGroup phase="protocol" items={protocolSecs} />
          </nav>

          <button type="button" className="btn btn-quiet text-[12.5px] mt-4 lg:mt-6" onClick={remove}>
            Delete reading
          </button>
        </aside>

        <main key={section} className="min-w-0 overflow-x-clip grid gap-8">
          <SectionIntro section={current} paidLocked={!!(current.paid && !paidOk)} />

          {section === "chart" && (
            <>
              <ChartPanel r={r} onReading={onReading} />
              <StepNav
                back={undefined}
                next={
                  at(reading.status) >= at("confirmed")
                    ? { id: "modules", label: "Continue to chart atlas" }
                    : undefined
                }
                nextHint={at(reading.status) < at("confirmed") ? "Confirm the birth data above to unlock the atlas." : undefined}
                onGo={go}
              />
            </>
          )}

          {section === "modules" && (
            <>
              <ModulesPanel
                r={r}
                onContinueToPast={() => go("past")}
                onUnlockHint={() => go("past")}
              />
              <StepNav
                back={{ id: "chart", label: "Birth chart" }}
                next={{ id: "past", label: paidOk ? "Continue to blind past-check" : "See past-check (protocol)" }}
                onGo={go}
              />
            </>
          )}

          {section === "past" && !paidOk && (
            <>
              <PaidGate title="Blind past-check" onModules={() => go("modules")} />
              <StepNav back={{ id: "modules", label: "Chart atlas" }} onGo={go} />
            </>
          )}

          {section === "past" && paidOk && (
            <>
              <div className="grid gap-8 sm:gap-10">
                {!claimsReady && !pastGenerating && (
                  <div className="max-w-[40rem] panel-soft px-4 sm:px-5 py-4 enter">
                    <p className="text-[14px] leading-relaxed">
                      The model sees the name, birth data, and how the time is known — nothing from your occupation or
                      questions yet. It writes claims about periods you already lived. You score them; that score opens
                      forward reports.
                    </p>
                  </div>
                )}

                {claimsReady && !pastGenerating && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="eyebrow">Foundation written</p>
                    <button type="button" className="see-more" onClick={() => setShowFoundation((v) => !v)}>
                      {showFoundation ? "Hide foundation" : "Curious? Read the foundation"}
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

                {claimsReady && !pastGenerating && <ScorePanel key={r.outputs.past?.length} r={r} onReading={onReading} />}
              </div>
              <StepNav
                back={{ id: "modules", label: "Chart atlas" }}
                next={
                  canGoNext(current)
                    ? { id: "reports", label: "Continue to reports" }
                    : undefined
                }
                nextHint={!canGoNext(current) ? "Score every claim above to unlock reports." : undefined}
                onGo={go}
              />
            </>
          )}

          {section === "reports" && !paidOk && (
            <>
              <PaidGate title="Forward reports" onModules={() => go("modules")} />
              <StepNav back={{ id: "modules", label: "Chart atlas" }} onGo={go} />
            </>
          )}
          {section === "reports" && paidOk && (
            <>
              <StageRunner
                r={r}
                stage="reports"
                output={r.outputs.reports}
                label="Write the reports"
                onReading={onReading}
              />
              <StepNav
                back={{ id: "past", label: "Past-check" }}
                next={canGoNext(current) ? { id: "guidance", label: "Continue to guidance" } : undefined}
                nextHint={!canGoNext(current) ? "Generate the reports to continue." : undefined}
                onGo={go}
              />
            </>
          )}

          {section === "guidance" && !paidOk && (
            <>
              <PaidGate title="Decade guidance" onModules={() => go("modules")} />
              <StepNav back={{ id: "modules", label: "Chart atlas" }} onGo={go} />
            </>
          )}
          {section === "guidance" && paidOk && (
            <>
              <StageRunner
                r={r}
                stage="guidance"
                output={r.outputs.guidance}
                label="Write the guidance"
                onReading={onReading}
              />
              <StepNav
                back={{ id: "reports", label: "Reports" }}
                next={canGoNext(current) ? { id: "protocol", label: "Continue to living protocol" } : undefined}
                nextHint={!canGoNext(current) ? "Generate guidance to continue." : undefined}
                onGo={go}
              />
            </>
          )}

          {section === "protocol" && !paidOk && (
            <>
              <PaidGate title="Living protocol" onModules={() => go("modules")} />
              <StepNav back={{ id: "modules", label: "Chart atlas" }} onGo={go} />
            </>
          )}
          {section === "protocol" && paidOk && (
            <>
              <StageRunner
                r={r}
                stage="protocol"
                output={r.outputs.protocol ? "ready" : undefined}
                showOutput={false}
                label="Build the protocol"
                onReading={onReading}
              />
              {r.outputs.protocol && !r.generating && (
                <div className="grid gap-4">
                  <div className="btn-row btn-row-stack sm:flex-row">
                    <a className="btn btn-primary" href={`/api/readings/${r.id}/protocol?download=1`}>
                      Download HTML
                    </a>
                    <a className="btn" href={`/api/readings/${r.id}/protocol`} target="_blank" rel="noreferrer">
                      Open in a new tab
                    </a>
                  </div>
                  <iframe
                    key={r.updatedAt}
                    title="Protocol preview"
                    src={`/api/readings/${r.id}/protocol`}
                    className="w-full h-[55vh] sm:h-[70vh] border hair rounded-[12px] bg-white max-w-full"
                  />
                </div>
              )}
              <StepNav back={{ id: "guidance", label: "Guidance" }} onGo={go} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SectionIntro({ section, paidLocked }: { section: SectionDef; paidLocked: boolean }) {
  return (
    <header className="max-w-[40rem] enter">
      <p className="eyebrow text-[var(--gold)]">
        {PHASE_LABEL[section.phase]}
        {paidLocked ? " · locked" : ""} · Step {section.n} of {SECTIONS.length}
      </p>
      <h2 className="serif text-[clamp(1.55rem,4.5vw,2.4rem)] leading-tight mt-1">{section.title}</h2>
      <p className="mt-3 text-[14.5px] sm:text-[15px] leading-relaxed">{section.purpose}</p>
      <p className="mt-2 text-[13.5px] muted leading-relaxed">
        <span className="text-[var(--ink)] font-medium">Your part: </span>
        {section.youDo}
      </p>
    </header>
  );
}

function StepNav({
  back,
  next,
  nextHint,
  onGo,
}: {
  back?: { id: Section; label: string };
  next?: { id: Section; label: string };
  nextHint?: string;
  onGo: (id: Section) => void;
}) {
  if (!back && !next && !nextHint) return null;
  return (
    <nav
      className="border-t hair pt-6 sm:pt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
      aria-label="Step navigation"
    >
      {back ? (
        <button type="button" className="btn btn-ghost w-fit" onClick={() => onGo(back.id)}>
          ← {back.label}
        </button>
      ) : (
        <span />
      )}
      <div className="flex flex-col gap-2 sm:items-end">
        {nextHint && <p className="text-[12.5px] muted max-w-[22rem] sm:text-right">{nextHint}</p>}
        {next && (
          <button type="button" className="btn btn-primary w-fit" onClick={() => onGo(next.id)}>
            {next.label} →
          </button>
        )}
      </div>
    </nav>
  );
}

function PaidGate({ title, onModules }: { title: string; onModules: () => void }) {
  return (
    <div className="grid gap-4 enter max-w-[36rem] panel-soft px-4 sm:px-5 py-5">
      <p className="text-[14.5px] leading-relaxed">
        <strong className="font-medium">{title}</strong> is part of the full protocol. It opens after the free chart
        atlas — starting with a blind past-check you score, then reports, guidance, and a living protocol page.
      </p>
      <p className="text-[13.5px] muted leading-relaxed">
        Your atlas stays available either way. Upgrade (or flip plan in QA) to run this step.
      </p>
      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={onModules}>
          Back to chart atlas
        </button>
      </div>
    </div>
  );
}
