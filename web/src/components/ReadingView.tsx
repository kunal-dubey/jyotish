"use client";
import { useCallback, useEffect, useState } from "react";
import type { Status } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/types";
import { api, type LoadedReading } from "./api";
import ChartPanel from "./ChartPanel";
import ScorePanel from "./ScorePanel";
import StageRunner from "./StageRunner";

type Section = "chart" | "past" | "reports" | "guidance" | "protocol";
const at = (s: Status) => STATUS_ORDER.indexOf(s);

const SECTIONS: {
  id: Section;
  n: string;
  title: string;
  sub: string;
  doneAt: Status;
  openAt: Status;
  highlight?: boolean;
}[] = [
  { id: "chart", n: "1", title: "Chart", sub: "Confirm the moment", doneAt: "confirmed", openAt: "chart" },
  {
    id: "past",
    n: "2",
    title: "Blind past-check",
    sub: "The heart of the reading",
    doneAt: "scored",
    openAt: "confirmed",
    highlight: true,
  },
  { id: "reports", n: "3", title: "Reports", sub: "After the score", doneAt: "reports", openAt: "scored" },
  { id: "guidance", n: "4", title: "Guidance", sub: "Plain language", doneAt: "guidance", openAt: "reports" },
  { id: "protocol", n: "5", title: "Protocol", sub: "A page to keep", doneAt: "protocol", openAt: "guidance" },
];

function furthest(s: Status): Section {
  const open = SECTIONS.filter((x) => at(s) >= at(x.openAt));
  return open[open.length - 1].id;
}

export default function ReadingView({ id }: { id: string }) {
  const [r, setR] = useState<LoadedReading | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [showFoundation, setShowFoundation] = useState(false);

  const onReading = useCallback((next: LoadedReading) => {
    setR((prev) => {
      if (prev?.status === "chart" && next.status === "confirmed") setSection("past");
      if (prev?.status === "past_check" && next.status === "scored") setSection("reports");
      return next;
    });
  }, []);

  useEffect(() => {
    api.get(id).then(
      (x) => {
        setR(x);
        setSection(furthest(x.status));
      },
      (e) => setErr(e.message),
    );
  }, [id]);

  useEffect(() => {
    if (!r?.generating) return;
    const t = setInterval(() => api.get(id).then((x) => (x.generating ? null : onReading(x))), 4000);
    return () => clearInterval(t);
  }, [r?.generating, id, onReading]);

  if (err) return <p className="note note-bad m-8">{err}</p>;
  if (!r || !section) {
    return (
      <div className="sky min-h-[40vh] grid place-items-center">
        <span className="pulse" aria-hidden />
      </div>
    );
  }

  const name = r.intake.callName || r.intake.name;
  const isOpen = (s: (typeof SECTIONS)[number]) => at(r.status) >= at(s.openAt);
  const claimsReady = !!(r.outputs.claims && r.outputs.claims.length > 0);
  const pastWriting = !r.outputs.past || !!r.generating;

  async function remove() {
    if (!confirm(`Delete the reading for ${name}? This cannot be undone.`)) return;
    await api.remove(r!.id);
    window.location.hash = "#/";
  }

  return (
    <div className="sky min-h-[calc(100dvh-3.5rem)]">
      <div className="mx-auto max-w-[78rem] px-5 md:px-8 py-8 md:py-12 grid lg:grid-cols-[14rem_minmax(0,1fr)] gap-8 lg:gap-14">
        <aside className="lg:sticky lg:top-20 self-start">
          <h1 className="serif text-[26px] leading-tight">{name}</h1>
          <p className="text-[13px] muted mt-1">
            {r.intake.date} · {r.chart.ascendant.sign} lagna
          </p>
          <nav className="rail mt-6 grid" aria-label="Stages">
            {SECTIONS.map((s, k) => (
              <div key={s.id}>
                <a
                  href={`#/r/${r.id}`}
                  aria-current={section === s.id ? "step" : undefined}
                  aria-disabled={!isOpen(s)}
                  className={`${at(r.status) >= at(s.doneAt) ? "done" : ""} ${s.highlight ? "highlight" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (isOpen(s)) setSection(s.id);
                  }}
                  style={!isOpen(s) ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                >
                  <span className="dot">{at(r.status) >= at(s.doneAt) ? "✓" : s.n}</span>
                  <span>
                    <span className="block text-[14px] font-medium">{s.title}</span>
                    <span className="block text-[12px] muted">{s.sub}</span>
                  </span>
                </a>
                {k === 0 && <div className="stop">confirm</div>}
                {k === 1 && <div className="stop">score</div>}
              </div>
            ))}
          </nav>
          <button type="button" className="btn btn-quiet text-[12.5px] mt-6" onClick={remove}>
            Delete reading
          </button>
        </aside>

        <main key={section} className="min-w-0">
          {section === "chart" && <ChartPanel r={r} onReading={onReading} />}

          {section === "past" && (
            <div className="grid gap-10">
              {!claimsReady && (
                <header className="max-w-[40rem] enter">
                  <p className="eyebrow text-[var(--gold)]">The heart of the path</p>
                  <h2 className="serif text-[clamp(1.9rem,3.8vw,2.6rem)] leading-tight mt-1">
                    A blind check of the past
                  </h2>
                  <p className="muted mt-3 leading-relaxed">
                    The model sees the name, birth data, and how the time is known — nothing else. It writes a foundation,
                    then concrete claims about periods you already lived. You score those claims before anything forward
                    appears.
                  </p>
                </header>
              )}

              {claimsReady && !pastWriting && (
                <div className="flex items-center justify-between gap-3">
                  <p className="eyebrow">Foundation written</p>
                  <button type="button" className="see-more" onClick={() => setShowFoundation((v) => !v)}>
                    {showFoundation ? "Hide foundation" : "Curious? Read the foundation"}
                  </button>
                </div>
              )}

              {(!claimsReady || showFoundation || pastWriting) && (
                <StageRunner
                  r={r}
                  stage="past"
                  output={r.outputs.past}
                  label="Generate the past-check"
                  onReading={onReading}
                />
              )}

              {claimsReady && !r.generating && <ScorePanel key={r.outputs.past?.length} r={r} onReading={onReading} />}
            </div>
          )}

          {section === "reports" && (
            <ModuleStage
              kicker="After the score"
              title="Reports 3 to 6"
              body="Written with your score in hand, and with any optional context you shared. Skim for what matters; expand when curious."
            >
              <StageRunner
                r={r}
                stage="reports"
                output={r.outputs.reports}
                label="Write the reports"
                onReading={onReading}
                collapsedPreview
              />
            </ModuleStage>
          )}

          {section === "guidance" && (
            <ModuleStage
              kicker="Plain language"
              title="Guidance"
              body="The same substance without the vocabulary, plus a short glossary."
            >
              <StageRunner
                r={r}
                stage="guidance"
                output={r.outputs.guidance}
                label="Write the guidance"
                onReading={onReading}
                collapsedPreview
              />
            </ModuleStage>
          )}

          {section === "protocol" && (
            <ModuleStage
              kicker="Keep this"
              title="Living protocol"
              body="A single HTML file. It recomputes weekday, periods, season, and Saturn countdown each time it opens."
            >
              <StageRunner
                r={r}
                stage="protocol"
                output={r.outputs.protocol ? "ready" : undefined}
                showOutput={false}
                label="Build the protocol"
                onReading={onReading}
              />
              {r.outputs.protocol && !r.generating && (
                <div className="grid gap-4 mt-4">
                  <div className="flex flex-wrap gap-3">
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
                    className="w-full h-[70vh] border hair rounded-[12px] bg-white"
                  />
                </div>
              )}
            </ModuleStage>
          )}
        </main>
      </div>
    </div>
  );
}

function ModuleStage({
  kicker,
  title,
  body,
  children,
}: {
  kicker: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-8 enter">
      <header className="max-w-[40rem]">
        <p className="eyebrow">{kicker}</p>
        <h2 className="serif text-[clamp(1.85rem,3.5vw,2.4rem)] leading-tight mt-1">{title}</h2>
        <p className="muted mt-3 leading-relaxed">{body}</p>
      </header>
      {children}
    </div>
  );
}
