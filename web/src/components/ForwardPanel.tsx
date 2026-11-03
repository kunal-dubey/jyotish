"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { StageName } from "@/lib/types";
import { type LoadedReading } from "./api";
import {
  lifeSectionLabel,
  partitionReportSections,
  pastScoreSummary,
  practitionerFoundationMarkdown,
} from "./forwardLayers";
import Markdown from "./Markdown";
import ReportDigest, { splitReportSections, type ReportSection } from "./ReportDigest";
import StageRunner, { type StageRunnerHandle } from "./StageRunner";

/** Presentation tabs — Life / Skeptic / Practitioner / Living companion. */
export type ForwardTab = "reading" | "howSure" | "chartNotes" | "protocol";

const PIECES: {
  id: ForwardTab;
  name: string;
  stage: StageName;
  label: string;
  practice: string;
}[] = [
  {
    id: "reading",
    name: "Your reading",
    stage: "guidance",
    label: "Write your reading",
    practice: "Priorities for this chapter — plain words, calibrated to the past-check.",
  },
  {
    id: "howSure",
    name: "How sure?",
    stage: "reports",
    label: "Write the confidence notes",
    practice: "What the score earned — structural, interpretive, and thin.",
  },
  {
    id: "chartNotes",
    name: "Chart notes",
    stage: "reports",
    label: "Write the chart notes",
    practice: "Classical detail for practitioners — timeline, vocation, inner life.",
  },
  {
    id: "protocol",
    name: "Living page",
    stage: "protocol",
    label: "Build the living page",
    practice: "A keepable page that recomputes weekday and periods when it opens.",
  },
];

function sectionsForTab(
  tab: ForwardTab,
  r: LoadedReading,
): { sections: ReportSection[]; stage: StageName; hasContent: boolean; generateLabel: string } {
  const piece = PIECES.find((p) => p.id === tab) ?? PIECES[0];
  if (tab === "protocol") {
    return {
      sections: [],
      stage: "protocol",
      hasContent: !!r.outputs.protocol,
      generateLabel: piece.label,
    };
  }
  if (tab === "reading") {
    const guidance = r.outputs.guidance;
    if (guidance) {
      return {
        sections: splitReportSections(guidance),
        stage: "guidance",
        hasContent: true,
        generateLabel: piece.label,
      };
    }
    // Guidance needs reports first
    if (!r.outputs.reports) {
      return {
        sections: [],
        stage: "reports",
        hasContent: false,
        generateLabel: "Prepare the forward notes",
      };
    }
    return {
      sections: [],
      stage: "guidance",
      hasContent: false,
      generateLabel: piece.label,
    };
  }

  const { howSure, chartNotes } = partitionReportSections(r.outputs.reports);
  if (tab === "howSure") {
    return {
      sections: howSure,
      stage: "reports",
      hasContent: !!r.outputs.reports,
      generateLabel: piece.label,
    };
  }
  return {
    sections: chartNotes,
    stage: "reports",
    hasContent: !!r.outputs.reports,
    generateLabel: piece.label,
  };
}

export default function ForwardPanel({
  r,
  tab,
  onTab,
  onReading,
}: {
  r: LoadedReading;
  tab: ForwardTab;
  onTab: (t: ForwardTab) => void;
  onReading: (r: LoadedReading) => void;
}) {
  const piece = PIECES.find((p) => p.id === tab) ?? PIECES[0];
  const resolved = useMemo(() => sectionsForTab(tab, r), [tab, r]);
  const { sections, stage, hasContent, generateLabel } = resolved;

  const [sectionIndex, setSectionIndex] = useState(0);
  const [showPieces, setShowPieces] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [showFoundation, setShowFoundation] = useState(false);
  const [runnerBusy, setRunnerBusy] = useState(false);
  const pieceRef = useRef<HTMLElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const runnerRef = useRef<StageRunnerHandle>(null);
  const foundationRef = useRef<HTMLDialogElement>(null);

  const generating = r.generating === stage || runnerBusy;
  const busyElsewhere = !!r.generating && r.generating !== stage;
  const section = sections[sectionIndex];
  const foundationMd = useMemo(() => practitionerFoundationMarkdown(r.outputs.past), [r.outputs.past]);
  const score = useMemo(
    () => pastScoreSummary(r.outputs.claims ?? [], r.scores),
    [r.outputs.claims, r.scores],
  );

  const runnerOutput =
    stage === "protocol"
      ? r.outputs.protocol
        ? "ready"
        : undefined
      : stage === "guidance"
        ? r.outputs.guidance
        : r.outputs.reports;

  // Clear sticky local busy once the server is idle and this tab already has content
  useEffect(() => {
    if (!r.generating && hasContent && runnerBusy) setRunnerBusy(false);
  }, [r.generating, hasContent, runnerBusy]);

  useEffect(() => {
    setSectionIndex(0);
    setShowSections(false);
    setShowPieces(false);
  }, [tab, runnerOutput]);

  useEffect(() => {
    if (!sections.length) return;
    setSectionIndex((i) => Math.min(Math.max(0, i), sections.length - 1));
  }, [sections.length]);

  useEffect(() => {
    if (!showPieces || !pieceRef.current) return;
    pieceRef.current.querySelector<HTMLElement>(".linkbtn.is-on")?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [tab, showPieces]);

  useEffect(() => {
    if (!showSections || !sectionRef.current) return;
    sectionRef.current.querySelector<HTMLElement>(".linkbtn.is-on")?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [sectionIndex, showSections]);

  useEffect(() => {
    const el = foundationRef.current;
    if (!el) return;
    if (showFoundation && !el.open) el.showModal();
    if (!showFoundation && el.open) el.close();
  }, [showFoundation]);

  function stepSection(delta: number) {
    if (!sections.length) return;
    setSectionIndex((i) => (i + delta + sections.length) % sections.length);
    setShowSections(false);
  }

  function selectPiece(id: ForwardTab) {
    onTab(id);
    setShowPieces(false);
  }

  const sectionTitle = (s: ReportSection) =>
    tab === "reading" ? lifeSectionLabel(s.title) : s.title.replace(/^Report\s*\d+:\s*/i, "");

  const pieceMenu = showPieces ? (
    <nav ref={pieceRef} className="atlas-more atlas-crumb-menu" aria-label="Forward pieces">
      {PIECES.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`linkbtn${p.id === tab ? " is-on" : ""}`}
          aria-current={p.id === tab ? "true" : undefined}
          onClick={() => selectPiece(p.id)}
        >
          {p.name}
        </button>
      ))}
    </nav>
  ) : null;

  const scoreNote =
    tab === "howSure" && (r.outputs.claims?.length ?? 0) > 0 ? (
      <p className={`atlas-note${score.pass ? "" : " atlas-note--warn"}`} role="status">
        <span className="atlas-note__label num">
          {score.points}/{score.maxPoints}
        </span>
        <span className="atlas-note__text">
          {score.pass ? "Above the pass line" : "Below the pass line"} · {score.fitClose} of{" "}
          {r.outputs.claims!.length} fit closely — forecasts stay inside this volume
        </span>
      </p>
    ) : null;

  let reader: ReactNode = null;

  if (!generating && !hasContent && tab !== "protocol") {
    reader = (
      <article className="atlas-reader forward-reader enter">
        <div className="past-top">
          <nav className="atlas-crumb" aria-label="Location">
            <button
              type="button"
              className={`atlas-crumb__link${showPieces ? " is-on" : ""}`}
              aria-expanded={showPieces}
              aria-haspopup="listbox"
              onClick={() => setShowPieces((v) => !v)}
            >
              Forward
            </button>
            <span className="atlas-crumb__sep" aria-hidden>
              ›
            </span>
            <span className="atlas-crumb__here">{piece.name}</span>
            <span className="atlas-crumb__hint">Click the trail to switch sections</span>
          </nav>
        </div>
        {pieceMenu}
        <header className="atlas-reader__head">
          <h3 className="atlas-reader__title">{piece.name}</h3>
          <p className="atlas-reader__practice">{piece.practice}</p>
        </header>
        {tab === "reading" && !r.outputs.reports ? (
          <p className="atlas-reader__watch">
            First the chart notes and confidence audit are written from your score — then your plain-language reading
            opens.
          </p>
        ) : null}
        {busyElsewhere ? (
          <p className="note note-warn">Another stage is generating ({r.generating}).</p>
        ) : null}
      </article>
    );
  } else if (!generating && tab === "protocol" && hasContent) {
    reader = (
      <article className="atlas-reader forward-reader enter">
        <div className="past-top">
          <nav className="atlas-crumb" aria-label="Location">
            <button
              type="button"
              className={`atlas-crumb__link${showPieces ? " is-on" : ""}`}
              aria-expanded={showPieces}
              aria-haspopup="listbox"
              onClick={() => setShowPieces((v) => !v)}
            >
              Forward
            </button>
            <span className="atlas-crumb__sep" aria-hidden>
              ›
            </span>
            <span className="atlas-crumb__here">Living page</span>
            <span className="atlas-crumb__hint">Click the trail to switch sections</span>
          </nav>
        </div>
        {pieceMenu}
        <header className="atlas-reader__head">
          <h3 className="atlas-reader__title">Living page</h3>
          <p className="atlas-reader__practice">{piece.practice}</p>
        </header>
        <div className="atlas-reader__body">
          <iframe
            key={r.updatedAt}
            title="Living page preview"
            src={`/api/readings/${r.id}/protocol`}
            className="forward-protocol"
          />
        </div>
        <footer className="atlas-reader__foot">
          <div className="atlas-foot__primary">
            <div className="atlas-links" role="group" aria-label="Living page actions">
              <a className="linkbtn" href={`/api/readings/${r.id}/protocol`} target="_blank" rel="noreferrer">
                Open in a new tab
              </a>
              <a className="linkbtn" href={`/api/readings/${r.id}/protocol?download=1`}>
                Download HTML
              </a>
              <button
                type="button"
                className="linkbtn"
                disabled={busyElsewhere}
                onClick={() => runnerRef.current?.run()}
              >
                Regenerate
              </button>
            </div>
          </div>
        </footer>
      </article>
    );
  } else if (!generating && !hasContent && tab === "protocol") {
    reader = (
      <article className="atlas-reader forward-reader enter">
        <div className="past-top">
          <nav className="atlas-crumb" aria-label="Location">
            <button
              type="button"
              className={`atlas-crumb__link${showPieces ? " is-on" : ""}`}
              aria-expanded={showPieces}
              aria-haspopup="listbox"
              onClick={() => setShowPieces((v) => !v)}
            >
              Forward
            </button>
            <span className="atlas-crumb__sep" aria-hidden>
              ›
            </span>
            <span className="atlas-crumb__here">Living page</span>
            <span className="atlas-crumb__hint">Click the trail to switch sections</span>
          </nav>
        </div>
        {pieceMenu}
        <header className="atlas-reader__head">
          <h3 className="atlas-reader__title">Living page</h3>
          <p className="atlas-reader__practice">{piece.practice}</p>
        </header>
        {busyElsewhere ? (
          <p className="note note-warn">Another stage is generating ({r.generating}).</p>
        ) : null}
      </article>
    );
  } else if (!generating && section) {
    reader = (
      <article className="atlas-reader forward-reader fade-claim" key={section.id}>
        {scoreNote}
        <div className="past-top">
          <nav className="atlas-crumb" aria-label="Location">
            <button
              type="button"
              className={`atlas-crumb__link${showPieces ? " is-on" : ""}`}
              aria-expanded={showPieces}
              aria-haspopup="listbox"
              onClick={() => {
                setShowPieces((v) => !v);
                setShowSections(false);
              }}
            >
              {piece.name}
            </button>
            <span className="atlas-crumb__sep" aria-hidden>
              ›
            </span>
            {sections.length > 1 ? (
              <button
                type="button"
                className={`atlas-crumb__link${showSections ? " is-on" : ""}`}
                aria-expanded={showSections}
                aria-haspopup="listbox"
                onClick={() => {
                  setShowSections((v) => !v);
                  setShowPieces(false);
                }}
              >
                {sectionTitle(section)}
              </button>
            ) : (
              <span className="atlas-crumb__here">{sectionTitle(section)}</span>
            )}
            <span className="atlas-crumb__hint">Click the trail to switch sections</span>
          </nav>
          <p className="past-progress">
            {sectionIndex + 1} of {sections.length}
          </p>
        </div>
        {pieceMenu}
        {showSections ? (
          <nav ref={sectionRef} className="atlas-more atlas-crumb-menu" aria-label="Sections">
            {sections.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`linkbtn${i === sectionIndex ? " is-on" : ""}`}
                aria-current={i === sectionIndex ? "true" : undefined}
                onClick={() => {
                  setSectionIndex(i);
                  setShowSections(false);
                }}
              >
                {sectionTitle(s)}
              </button>
            ))}
          </nav>
        ) : null}
        <header className="atlas-reader__head">
          <h3 className="atlas-reader__title">{sectionTitle(section)}</h3>
          <p className="atlas-reader__practice">{piece.practice}</p>
        </header>
        <div className="atlas-reader__body">
          <div className="forward-prose">
            <Markdown text={section.body} />
          </div>
        </div>
        <footer className="atlas-reader__foot">
          <div className="atlas-foot__primary">
            <div className="atlas-links" role="group" aria-label="Actions">
              {tab === "chartNotes" && foundationMd ? (
                <button type="button" className="linkbtn" onClick={() => setShowFoundation(true)}>
                  Foundation
                </button>
              ) : null}
              <button
                type="button"
                className="linkbtn"
                disabled={busyElsewhere}
                onClick={() => runnerRef.current?.run()}
              >
                Regenerate
              </button>
            </div>
            {sections.length > 1 ? (
              <div className="atlas-nav" aria-label="Section navigation">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm atlas-nav__btn"
                  aria-label="Previous section"
                  onClick={() => stepSection(-1)}
                >
                  ‹
                </button>
                <span className="atlas-nav__pos">
                  {sectionIndex + 1} / {sections.length}
                </span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm atlas-nav__btn"
                  aria-label="Next section"
                  onClick={() => stepSection(1)}
                >
                  ›
                </button>
              </div>
            ) : null}
          </div>
        </footer>
      </article>
    );
  } else if (!generating && hasContent && sections.length === 0 && (tab === "howSure" || tab === "chartNotes")) {
    reader = (
      <article className="atlas-reader forward-reader enter">
        {scoreNote}
        <div className="past-top">
          <nav className="atlas-crumb" aria-label="Location">
            <button
              type="button"
              className={`atlas-crumb__link${showPieces ? " is-on" : ""}`}
              aria-expanded={showPieces}
              aria-haspopup="listbox"
              onClick={() => setShowPieces((v) => !v)}
            >
              {piece.name}
            </button>
            <span className="atlas-crumb__hint">Click the trail to switch sections</span>
          </nav>
        </div>
        {pieceMenu}
        <header className="atlas-reader__head">
          <h3 className="atlas-reader__title">{piece.name}</h3>
          <p className="atlas-reader__practice">{piece.practice}</p>
        </header>
        <div className="atlas-reader__body">
          <p className="atlas-reader__watch">
            {tab === "howSure"
              ? "Confidence sections will appear here once the forward notes include a score implication and audit. Open Chart notes for the classical write-up."
              : "Classical sections will appear here once the forward notes are written."}
          </p>
        </div>
        <footer className="atlas-reader__foot">
          <div className="atlas-links">
            <button type="button" className="linkbtn" disabled={busyElsewhere} onClick={() => runnerRef.current?.run()}>
              Regenerate
            </button>
          </div>
        </footer>
      </article>
    );
  }

  const runnerClass = generating ? "past-wait enter" : !hasContent ? "forward-generate" : "stage-runner--silent";

  return (
    <div className="forward-shell">
      {reader}
      <div className={runnerClass}>
        <StageRunner
          ref={runnerRef}
          r={r}
          stage={stage}
          output={runnerOutput}
          showOutput={false}
          showIdleButton={!hasContent && !generating}
          label={generateLabel}
          onReading={onReading}
          onBusyChange={setRunnerBusy}
        />
      </div>

      <dialog
        ref={foundationRef}
        className="dialog dialog--wide dialog--foundation"
        aria-labelledby="forward-foundation-title"
        onClose={() => setShowFoundation(false)}
        onCancel={() => setShowFoundation(false)}
      >
        <div className="dialog__in">
          <div className="dialog__head">
            <h2 id="forward-foundation-title" className="dialog__title">
              Foundation
            </h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={() => setShowFoundation(false)}>
              ×
            </button>
          </div>
          <p className="dialog__lede">
            Disclosure, computation notes, and the foundation write-up for practitioners.
          </p>
          <div className="dialog__section past-foundation-body">
            {foundationMd ? (
              <ReportDigest markdown={foundationMd} emptyHint="No foundation text yet." />
            ) : (
              <p className="note note-warn">No foundation document on this reading yet.</p>
            )}
          </div>
          <div className="dialog__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setShowFoundation(false)}>
              Close
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
