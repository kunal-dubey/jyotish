"use client";
import { useMemo, useState } from "react";
import { CHART_TOPICS, topicGroups, type ChartTopic } from "@/lib/modules";
import { buildRightNow } from "@/lib/rightNow";
import type { LoadedReading, ReadingModule } from "./api";

type AtlasView = "now" | "explore";

export default function ModulesPanel({
  r,
}: {
  r: LoadedReading;
  onUnlockHint?: () => void;
  onContinueToPast?: () => void;
}) {
  const modulesById = useMemo(() => {
    const m = new Map<string, ReadingModule>();
    for (const mod of r.modules ?? []) m.set(mod.id, mod);
    return m;
  }, [r.modules]);

  const rightNow = useMemo(
    () => buildRightNow(r.chart, r.intake, r.outputs?.freeCounsel),
    [r.chart, r.intake, r.outputs?.freeCounsel],
  );

  const included = useMemo(
    () => CHART_TOPICS.filter((t) => t.access === "free"),
    [],
  );
  const groups = useMemo(() => topicGroups(included), [included]);

  const [view, setView] = useState<AtlasView>("now");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "foundations");
  const group = groups.find((g) => g.id === groupId) ?? groups[0];
  const [topicId, setTopicId] = useState<string | null>(null);
  const topic = topicId
    ? included.find((t) => t.id === topicId) ?? group?.topics.find((t) => t.id === topicId)
    : undefined;

  const name = r.intake.callName || r.intake.name;
  const placement = topic?.placementId ? modulesById.get(topic.placementId) : undefined;
  const reading = topic?.readingId ? modulesById.get(topic.readingId) : undefined;
  const fact = topic?.factId ? modulesById.get(topic.factId) : undefined;
  const subtitle = fact?.subtitle ?? reading?.subtitle ?? placement?.subtitle;

  function selectGroup(id: string) {
    setView("explore");
    setGroupId(id);
    setTopicId(null);
  }

  function selectTopic(id: string) {
    setView("explore");
    setTopicId(id);
  }

  return (
    <div className="grid gap-8 enter min-w-0">
      <aside className="why" aria-label="How to read what follows">
        <p>
          What the chart states (sign, house, period dates) is data. The story built from it is interpretation. Prefer
          the plain reading. When two readings compete, both can stand. The past-check later is the only honest measure
          of how much weight the forward reports deserve.
        </p>
      </aside>

      <nav className="tab-seg" aria-label="Atlas views">
        <button
          type="button"
          aria-current={view === "now" ? "true" : undefined}
          onClick={() => setView("now")}
        >
          Right now
        </button>
        <button
          type="button"
          aria-current={view === "explore" ? "true" : undefined}
          onClick={() => {
            setView("explore");
            setTopicId(null);
          }}
        >
          Explore life areas
        </button>
      </nav>

      {view === "now" && (
        <section className="grid gap-6">
          <div className="snapshot">
            <div className="snapshot__item">
              <span className="snapshot__label">Running now</span>
              <span className="snapshot__value">{rightNow.period?.meaning ?? rightNow.headline}</span>
            </div>
            {rightNow.sky.slice(0, 2).map((s) => (
              <div key={s.label} className="snapshot__item">
                <span className="snapshot__label">{s.label}</span>
                <span className="snapshot__value">{s.detail}</span>
              </div>
            ))}
          </div>

          {rightNow.period && (
            <details className="disclose">
              <summary>
                Period names & dates
                {rightNow.period.classical ? (
                  <span className="muted" style={{ fontWeight: 400 }}>
                    {" "}
                    · {rightNow.period.classical}
                  </span>
                ) : null}
                <span aria-hidden>▾</span>
              </summary>
              <div className="disclose__body">
                <ul className="how">
                  {rightNow.period.chartDetail.lines.map((line) => (
                    <li key={line}>
                      <p>{line}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}

          <ul className="areas" aria-label="Areas of life">
            {rightNow.areas.map((a) => (
              <li key={a.id} className="area">
                <h3 className="area__h">
                  <button
                    type="button"
                    className="area__trigger"
                    aria-expanded="false"
                    onClick={(e) => {
                      const li = (e.currentTarget as HTMLElement).closest(".area");
                      const list = li?.parentElement;
                      if (!li || !list) return;
                      const willOpen = !li.classList.contains("is-open");
                      list.querySelectorAll(".area.is-open").forEach((other) => {
                        if (other === li) return;
                        other.classList.remove("is-open");
                        const btn = other.querySelector(".area__trigger");
                        const body = other.querySelector(".area__body") as HTMLElement | null;
                        btn?.setAttribute("aria-expanded", "false");
                        if (body) body.hidden = true;
                      });
                      li.classList.toggle("is-open", willOpen);
                      e.currentTarget.setAttribute("aria-expanded", willOpen ? "true" : "false");
                      const body = li.querySelector(".area__body") as HTMLElement | null;
                      if (body) body.hidden = !willOpen;
                    }}
                  >
                    <span>
                      <span className="area__name">{a.area}</span>
                      <span className="area__basis">{a.focus}</span>
                    </span>
                    <svg className="area__chev" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </h3>
                <div className="area__body" hidden>
                  <div className="area__part area__part--practice">
                    <h4>One practice</h4>
                    <p>{a.focus}</p>
                  </div>
                  <div className="area__part">
                    <h4>What to watch</h4>
                    <p>{a.today}</p>
                  </div>
                  <div className="area__part">
                    <h4>What leads it</h4>
                    <p>{a.ledBy}</p>
                  </div>
                  <details className="disclose" style={{ background: "transparent" }}>
                    <summary style={{ minHeight: 44, padding: "8px 0", fontSize: "var(--t-sm)" }}>
                      Chart factors
                      <span aria-hidden>▾</span>
                    </summary>
                    <div className="area__deep-body">
                      <p>{a.chartDetail.summary}</p>
                      {a.chartDetail.lines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </details>
                </div>
              </li>
            ))}
          </ul>

          <p className="small">{rightNow.boundary}</p>
          <button type="button" className="linkbtn" onClick={() => setView("explore")}>
            Explore life areas →
          </button>
        </section>
      )}

      {view === "explore" && topicId == null && (
        <section className="grid gap-6">
          <nav className="atlas-themes" aria-label="Chart themes">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`atlas-theme${groupId === g.id ? " is-on" : ""}`}
                aria-current={groupId === g.id ? "true" : undefined}
                onClick={() => selectGroup(g.id)}
              >
                {g.label}
              </button>
            ))}
          </nav>
          <ul className="atlas-topics" aria-label="Topics in this theme">
            {(group?.topics ?? []).map((t) => (
              <li key={t.id}>
                <button type="button" className="atlas-topic" onClick={() => selectTopic(t.id)}>
                  <span className="atlas-topic__name">{t.label}</span>
                  <span className="atlas-topic__hint">{t.plain}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === "explore" && topic && topicId != null && (
        <article className="atlas-focus">
          <button
            type="button"
            className="linkbtn atlas-focus__back"
            onClick={() => setTopicId(null)}
          >
            ← All topics
          </button>
          <header>
            <p className="atlas-focus__kicker">{topic.groupLabel}</p>
            <h3 className="atlas-focus__title">{topic.label}</h3>
            {topic.classical && <p className="atlas-focus__classical">{topic.classical}</p>}
          </header>

          {topic.readingId && (
            <div className="atlas-focus__section">
              <h4>Counsel</h4>
              <TopicWords reading={reading} name={name} />
            </div>
          )}

          <div className="atlas-focus__section">
            <h4>What this is</h4>
            <p>{topic.plain}</p>
            {subtitle?.relevance && (
              <p className="note text-[13.5px] leading-snug" style={{ marginTop: 8 }}>
                <span className="muted" style={{ display: "block", marginBottom: 2 }}>
                  For {name}
                </span>
                {subtitle.relevance}
              </p>
            )}
          </div>

          {(topic.placementId || topic.factId) && (
            <div className="atlas-focus__section">
              <h4>Chart map</h4>
              <TopicMap topic={topic} fact={fact} placement={placement} chart={r} />
            </div>
          )}
        </article>
      )}

    </div>
  );
}

function TopicMap({
  topic,
  fact,
  placement,
  chart,
}: {
  topic: ChartTopic;
  fact?: ReadingModule;
  placement?: ReadingModule;
  chart: LoadedReading;
}) {
  const mod = fact ?? placement;
  if (!mod) return <p className="muted text-[14px]">Map not available yet.</p>;

  if (mod.id === "chart_frame") {
    const a = chart.chart.ascendant;
    return (
      <div className="grid gap-3 text-[14px] leading-relaxed max-w-[36rem]">
        <p>
          Rising sign <strong className="font-medium">{a.sign}</strong> at {a.deg}, ruled by {a.lord} ({a.element}{" "}
          element). The twelve houses count from this rising sign.
        </p>
        <p className="muted text-[13px]">
          Special support planet (yogakaraka):{" "}
          {chart.chart.yogakaraka.length ? chart.chart.yogakaraka.join(", ") : "none for this rising sign"}.
        </p>
        <p className="muted text-[13px]">Open the Chart step in the rail for the full table and diagram.</p>
      </div>
    );
  }

  if (mod.id === "panchanga") {
    const p = chart.chart.panchanga;
    const t = chart.chart.tithi;
    if (!p) {
      return (
        <p className="text-[14px]">
          Lunar day: <strong className="font-medium">{t.name}</strong> ({t.paksha}).
        </p>
      );
    }
    return (
      <dl className="grid gap-2.5 text-[14px] max-w-[36rem]">
        <div>
          <dt className="muted text-[12px]">Lunar day (tithi)</dt>
          <dd>
            {p.tithi.name} · {p.tithi.paksha}
          </dd>
        </div>
        <div>
          <dt className="muted text-[12px]">Birth star (nakshatra)</dt>
          <dd>
            {p.nakshatra.name}, pada {p.nakshatra.pada} · lord {p.nakshatra.lord}
          </dd>
        </div>
        <div>
          <dt className="muted text-[12px]">Yoga · half-day (karana) · weekday</dt>
          <dd>
            {p.yoga.name} · {p.karana.name} · {p.vara.weekday}
          </dd>
        </div>
        {p.dagdha_rashi.signs.length > 0 && (
          <div>
            <dt className="muted text-[12px]">Signs under strain that day (dagdha)</dt>
            <dd>
              {p.dagdha_rashi.signs.join(", ")}
              {p.dagdha_rashi.planets_affected.length
                ? ` — planets there: ${p.dagdha_rashi.planets_affected.join(", ")}`
                : ""}
            </dd>
          </div>
        )}
      </dl>
    );
  }

  if (mod.id === "sensitivity") {
    const s = chart.chart.sensitivity;
    return (
      <div className="grid gap-2 text-[14px] leading-relaxed max-w-[36rem]">
        <p>How long key layers survive if the birth clock is off by a few minutes:</p>
        <ul className="list-disc pl-5 grid gap-1">
          <li>
            Rising sign: {s.lagna.minutes_earlier_survives ?? "—"} min earlier / {s.lagna.minutes_later_survives ?? "—"}{" "}
            min later
          </li>
          <li>
            Partnership chart rising: {s.navamsa_lagna.minutes_earlier_survives ?? "—"} /{" "}
            {s.navamsa_lagna.minutes_later_survives ?? "—"} min
          </li>
          <li>
            Moon&apos;s star: {s.moon_nakshatra.minutes_earlier_survives ?? "—"} /{" "}
            {s.moon_nakshatra.minutes_later_survives ?? "—"} min
          </li>
        </ul>
        {s.time_critical && (
          <p className="note note-warn text-[13px]">
            The rising sign flips within about ten minutes — treat finer maps cautiously until the time is confirmed.
          </p>
        )}
      </div>
    );
  }

  const key = topic.id;
  const slice = chart.chart.vargas?.[key];
  if (key === "d1") {
    return (
      <div className="overflow-x-auto">
        <p className="text-[13px] muted mb-2">Planets in the main chart (sign and house from the rising sign).</p>
        <table className="text-[12.5px] w-full min-w-[20rem]">
          <thead>
            <tr className="muted text-left">
              <th className="py-1 pr-2">Planet</th>
              <th className="py-1 pr-2">Sign</th>
              <th className="py-1">House</th>
            </tr>
          </thead>
          <tbody>
            {chart.chart.planets.map((p) => (
              <tr key={p.name} className=" ">
                <td className="py-1 pr-2">{p.name}</td>
                <td className="py-1 pr-2">{p.sign}</td>
                <td className="py-1">{p.house}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (!slice && key === "d9") {
    return (
      <div className="overflow-x-auto">
        <p className="text-[13px] muted mb-2">
          Partnership-chart rising: {chart.chart.ascendant.navamsa}. * = same sign in main chart (vargottama).
        </p>
        <table className="text-[12.5px] w-full min-w-[16rem]">
          <thead>
            <tr className="muted text-left">
              <th className="py-1 pr-2">Planet</th>
              <th className="py-1">Sign in this map</th>
            </tr>
          </thead>
          <tbody>
            {chart.chart.planets.map((p) => (
              <tr key={p.name} className=" ">
                <td className="py-1 pr-2">
                  {p.name}
                  {p.vargottama ? " *" : ""}
                </td>
                <td className="py-1">{p.navamsa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (!slice) {
    return <p className="muted text-[14px]">Placements for this map are not available on this chart yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      {slice.lagna && (
        <p className="text-[13px] muted mb-2">
          This map&apos;s rising tone: {slice.lagna}
          {slice.lagna_lord ? ` (ruled by ${slice.lagna_lord})` : ""}.
        </p>
      )}
      <table className="text-[12.5px] w-full min-w-[16rem]">
        <thead>
          <tr className="muted text-left">
            <th className="py-1 pr-2">Planet</th>
            <th className="py-1">Sign in this map</th>
          </tr>
        </thead>
        <tbody>
          {slice.planets.map((p) => (
            <tr key={p.name} className=" ">
              <td className="py-1 pr-2">{p.name}</td>
              <td className="py-1">{p.sign}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopicWords({ reading, name }: { reading?: ReadingModule; name: string }) {
  const card = reading?.reading;
  if (!card) {
    return <p className="muted text-[14px]">A plain-language take for this area is not ready yet.</p>;
  }
  if (card.ledBy && card.today && card.focus) {
    return (
      <div className="grid gap-4 text-[14px] leading-relaxed max-w-[36rem]">
        <p className="font-medium">{card.headline}</p>
        <dl className="grid gap-3">
          <div>
            <dt className="muted text-[11px]">One practice</dt>
            <dd className="mt-0.5 font-medium">{card.focus}</dd>
          </div>
          <div>
            <dt className="muted text-[11px]">What to watch</dt>
            <dd className="mt-0.5">{card.today}</dd>
          </div>
          <div>
            <dt className="muted text-[11px]">What leads it</dt>
            <dd className="mt-0.5">{card.ledBy}</dd>
          </div>
        </dl>
        {card.chartDetail && (
          <details className="text-[13px]">
            <summary className="see-more cursor-pointer list-none w-fit [&::-webkit-details-marker]:hidden">
              {card.chartDetail.summary}
            </summary>
            <ul className="mt-2 grid gap-1.5 muted leading-relaxed pl-0">
              {card.chartDetail.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        )}
        <p className="muted text-[12.5px]">
          For {name} · confidence {card.confidence}
          {card.confidence === "low" ? " — birth time may be soft for this fine map." : ""}.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 text-[14px] leading-relaxed max-w-[36rem]">
      <p className="font-medium">{card.headline}</p>
      <ul className="list-disc pl-5 grid gap-1.5">
        {card.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p className="muted text-[12.5px]">
        Confidence for {name}: {card.confidence}
        {card.confidence === "low" ? " — birth time may be soft for this fine map." : ""}.
      </p>
    </div>
  );
}
