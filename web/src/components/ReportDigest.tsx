"use client";
import { useMemo, useState } from "react";
import Markdown from "./Markdown";

export type ReportSection = {
  id: string;
  title: string;
  body: string;
  preview: string;
};

function makePreview(body: string, max = 150): string {
  const plain = body
    .replace(/^#+\s+.+$/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "";
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const at = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "), cut.lastIndexOf(", "));
  return (at > 50 ? cut.slice(0, at + 1) : cut).trim() + "…";
}

export function splitReportSections(markdown: string): ReportSection[] {
  const text = markdown.trim();
  if (!text) return [];

  const chunks = text.split(/(?=^##\s+)/m).filter((c) => c.trim());
  const sections: ReportSection[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i].trim();
    const heading = /^##\s+(.+?)(?:\n|$)/.exec(chunk);
    if (heading) {
      const title = heading[1].replace(/\*+/g, "").trim();
      const body = chunk.slice(heading[0].length).trim();
      sections.push({
        id: `s${i}-${title.slice(0, 24).replace(/\W+/g, "-").toLowerCase()}`,
        title,
        body: body || chunk,
        preview: makePreview(body || chunk),
      });
    } else if (chunk) {
      sections.push({
        id: `s${i}-intro`,
        title: "Overview",
        body: chunk,
        preview: makePreview(chunk),
      });
    }
  }

  if (sections.length === 0) {
    return [{ id: "full", title: "Reading", body: text, preview: makePreview(text) }];
  }
  return sections;
}

export default function ReportDigest({
  markdown,
  emptyHint = "Nothing to show yet.",
}: {
  markdown: string;
  emptyHint?: string;
}) {
  const sections = useMemo(() => splitReportSections(markdown), [markdown]);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!sections.length) {
    return <p className="muted text-[14px]">{emptyHint}</p>;
  }

  return (
    <ol className="grid gap-2 m-0 p-0 list-none enter">
      {sections.map((s, i) => {
        const open = openId === s.id;
        const n = String(i + 1).padStart(2, "0");
        return (
          <li key={s.id}>
            <div className={`panel ${open ? "report-open" : ""}`}>
              <button
                type="button"
                className="w-full text-left bg-transparent border-0 p-0 cursor-pointer text-inherit grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 items-start"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : s.id)}
              >
                <span className={`serif text-[1.05rem] leading-snug pt-0.5 ${open ? "text-[var(--gold)]" : "muted"}`}>
                  {n}
                </span>
                <span className="min-w-0 grid gap-1.5">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="serif text-[clamp(1.15rem,3vw,1.35rem)] leading-snug font-medium">
                      {s.title}
                    </span>
                    <span className="see-more shrink-0 text-[12.5px]">{open ? "Close" : "Read"}</span>
                  </span>
                  {!open && s.preview && (
                    <span className="block muted text-[13.5px] leading-relaxed max-w-[38rem] font-[family-name:var(--font-plex)]">
                      {s.preview}
                    </span>
                  )}
                </span>
              </button>
              {open && (
                <div className="mt-4 pt-4 border-t hair pl-0 sm:pl-[calc(2.5rem+0.75rem)] max-w-[40rem]">
                  <Markdown text={s.body} />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
