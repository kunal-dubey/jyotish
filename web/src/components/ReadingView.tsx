"use client";
import { useCallback, useEffect, useState } from "react";
import type { Status } from "@/lib/types";
import { api, type LoadedReading } from "./api";
import { go } from "./nav";
import ChartPanel from "./ChartPanel";
import ScorePanel from "./ScorePanel";
import StageRunner from "./StageRunner";

type Section = "chart" | "past" | "reports" | "guidance" | "protocol";
const ORDER: Status[] = ["chart", "confirmed", "past_check", "scored", "reports", "guidance", "protocol"];
const at = (s: Status) => ORDER.indexOf(s);

const SECTIONS: { id: Section; n: string; title: string; sub: string; doneAt: Status; openAt: Status }[] = [
  { id: "chart", n: "1", title: "The chart", sub: "Computation and verification", doneAt: "confirmed", openAt: "chart" },
  { id: "past", n: "2", title: "Foundation and past-check", sub: "Reports 1 and 2", doneAt: "scored", openAt: "confirmed" },
  { id: "reports", n: "3", title: "Reports 3 to 6", sub: "Timeline, vocation, inner life, audit", doneAt: "reports", openAt: "scored" },
  { id: "guidance", n: "4", title: "Plain-language guidance", sub: "With glossary", doneAt: "guidance", openAt: "reports" },
  { id: "protocol", n: "5", title: "Living protocol", sub: "A page to keep", doneAt: "protocol", openAt: "guidance" },
];

function furthest(s: Status): Section {
  const open = SECTIONS.filter((x) => at(s) >= at(x.openAt));
  return open[open.length - 1].id;
}

export default function ReadingView({ id }: { id: string }) {
  const [r, setR] = useState<LoadedReading | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [section, setSection] = useState<Section | null>(null);

  const onReading = useCallback((next: LoadedReading) => {
    setR((prev) => {
      // Move on after the two hard stops are passed; stay put after a stage is written so it can be read.
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

  // A stage started elsewhere (or before a reload) is still running: poll until it lands.
  useEffect(() => {
    if (!r?.generating) return;
    const t = setInterval(() => api.get(id).then((x) => (x.generating ? null : onReading(x))), 4000);
    return () => clearInterval(t);
  }, [r?.generating, id, onReading]);

  if (err) return <p className="note note-bad m-8">{err}</p>;
  if (!r || !section) return <p className="muted m-8">Loading…</p>;

  const name = r.intake.callName || r.intake.name;
  const isOpen = (s: (typeof SECTIONS)[number]) => at(r.status) >= at(s.openAt);

  async function remove() {
    if (!confirm(`Delete the reading for ${name}? This cannot be undone.`)) return;
    await api.remove(r!.id);
    go("#/");
  }

  return (
    <div className="mx-auto max-w-[78rem] px-5 md:px-8 py-8 md:py-12 grid lg:grid-cols-[15rem_minmax(0,1fr)] gap-8 lg:gap-14">
      <aside className="lg:sticky lg:top-6 self-start">
        <h1 className="serif text-[28px] leading-tight">{name}</h1>
        <p className="text-[13px] muted mt-1">
          {r.intake.date} · {r.intake.time} · {r.chart.ascendant.sign} lagna
        </p>
        <nav className="rail mt-6 grid" aria-label="Stages">
          {SECTIONS.map((s, k) => (
            <div key={s.id}>
              <a
                href={`#/r/${r.id}`}
                aria-current={section === s.id ? "step" : undefined}
                aria-disabled={!isOpen(s)}
                className={at(r.status) >= at(s.doneAt) ? "done" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  if (isOpen(s)) setSection(s.id);
                }}
                style={!isOpen(s) ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
              >
                <span className="dot">{at(r.status) >= at(s.doneAt) ? "✓" : s.n}</span>
                <span>
                  <span className="block text-[14px] font-medium">{s.title}</span>
                  <span className="block text-[12px] muted">{s.sub}</span>
                </span>
              </a>
              {k === 0 && <div className="stop">stop 1 · confirm</div>}
              {k === 1 && <div className="stop">stop 2 · score</div>}
            </div>
          ))}
        </nav>
        <button className="btn btn-quiet text-[12.5px] mt-6" onClick={remove}>
          Delete reading
        </button>
      </aside>

      <main key={section} className="min-w-0">
        {section === "chart" && <ChartPanel r={r} onReading={onReading} />}

        {section === "past" && (
          <div className="grid gap-10 enter">
            <header className="max-w-[42rem]">
              <p className="eyebrow">Stages 2 and 3</p>
              <h2 className="serif text-[34px] leading-tight mt-1">Foundation and the blind past-check</h2>
              <p className="muted mt-3">
                The model sees the name, the birth data and how the time is known. Anything else entered at intake stays
                back until the score is in.
              </p>
            </header>
            <StageRunner r={r} stage="past" output={r.outputs.past} label="Write Reports 1 and 2" onReading={onReading} />
            {r.outputs.claims && r.outputs.claims.length > 0 && !r.generating && (
              <ScorePanel key={r.outputs.past?.length} r={r} onReading={onReading} />
            )}
          </div>
        )}

        {section === "reports" && (
          <div className="grid gap-8 enter">
            <header className="max-w-[42rem]">
              <p className="eyebrow">Stage 3 continued</p>
              <h2 className="serif text-[34px] leading-tight mt-1">Reports 3 to 6</h2>
              <p className="muted mt-3">
                Written after the score, which the model reads first and uses to set its confidence. The intake context is
                released at this point.
              </p>
            </header>
            <StageRunner r={r} stage="reports" output={r.outputs.reports} label="Write Reports 3 to 6" onReading={onReading} />
          </div>
        )}

        {section === "guidance" && (
          <div className="grid gap-8 enter">
            <header className="max-w-[42rem]">
              <p className="eyebrow">Stage 4</p>
              <h2 className="serif text-[34px] leading-tight mt-1">Guidance in plain language</h2>
              <p className="muted mt-3">The same content without the vocabulary, followed by a glossary.</p>
            </header>
            <StageRunner r={r} stage="guidance" output={r.outputs.guidance} label="Write the guidance" onReading={onReading} />
          </div>
        )}

        {section === "protocol" && (
          <div className="grid gap-8 enter">
            <header className="max-w-[42rem]">
              <p className="eyebrow">Stage 5</p>
              <h2 className="serif text-[34px] leading-tight mt-1">The living protocol</h2>
              <p className="muted mt-3">
                A single HTML file to keep. It computes the weekday, the running periods, the season and the Saturn
                countdown from the date each time it opens. Palette and type are chosen from the chart.
              </p>
            </header>
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
                <div className="flex flex-wrap gap-3">
                  <a className="btn btn-primary" href={`/api/readings/${r.id}/protocol?download=1`}>
                    Download the HTML file
                  </a>
                  <a className="btn" href={`/api/readings/${r.id}/protocol`} target="_blank" rel="noreferrer">
                    Open in a new tab
                  </a>
                </div>
                <iframe
                  key={r.updatedAt}
                  title="Protocol preview"
                  src={`/api/readings/${r.id}/protocol`}
                  className="w-full h-[80vh] border hair rounded-[4px] bg-white"
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
