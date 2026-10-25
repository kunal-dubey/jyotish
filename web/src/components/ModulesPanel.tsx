"use client";
import { useMemo, useState } from "react";
import { CHART_TOPICS, topicGroups, type ChartTopic } from "@/lib/modules";
import { buildRightNow } from "@/lib/rightNow";
import type { LoadedReading, ReadingModule } from "./api";

type Tab = "about" | "map" | "words";
type AtlasView = "now" | "explore";

export default function ModulesPanel({
  r,
  onUnlockHint,
  onContinueToPast,
}: {
  r: LoadedReading;
  onUnlockHint?: () => void;
  /** Primary CTA: leave atlas for the blind past-check step. */
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
  const [topicId, setTopicId] = useState(group?.topics[0]?.id ?? "rising");
  const topic =
    group?.topics.find((t) => t.id === topicId) ??
    group?.topics[0] ??
    included[0];
  const [tab, setTab] = useState<Tab>(() => {
    const first = groups[0]?.topics[0];
    return first?.readingId ? "words" : "about";
  });

  const name = r.intake.callName || r.intake.name;
  const placement = topic?.placementId ? modulesById.get(topic.placementId) : undefined;
  const reading = topic?.readingId ? modulesById.get(topic.readingId) : undefined;
  const fact = topic?.factId ? modulesById.get(topic.factId) : undefined;
  const subtitle = fact?.subtitle ?? reading?.subtitle ?? placement?.subtitle;

  function preferTab(t: ChartTopic | undefined): Tab {
    if (t?.readingId) return "words";
    return "about";
  }

  function selectGroup(id: string) {
    setView("explore");
    setGroupId(id);
    const g = groups.find((x) => x.id === id);
    const first = g?.topics[0];
    if (first) {
      setTopicId(first.id);
      setTab(preferTab(first));
    }
  }

  function selectTopic(id: string) {
    setView("explore");
    setTopicId(id);
    const t = included.find((x) => x.id === id) ?? group?.topics.find((x) => x.id === id);
    setTab(preferTab(t));
  }

  return (
    <div className="grid gap-8 enter min-w-0">
      <nav className="flex flex-wrap gap-2" aria-label="Atlas views">
        <button
          type="button"
          aria-current={view === "now" ? "true" : undefined}
          className={`text-[13px] px-3.5 py-1.5 rounded-full border hair transition-colors ${
            view === "now"
              ? "bg-[var(--accent-wash)] border-[var(--accent)] text-[var(--ink)]"
              : "muted hover:text-[var(--ink)]"
          }`}
          onClick={() => setView("now")}
        >
          Right now
        </button>
        <button
          type="button"
          aria-current={view === "explore" ? "true" : undefined}
          className={`text-[13px] px-3.5 py-1.5 rounded-full border hair transition-colors ${
            view === "explore"
              ? "bg-[var(--accent-wash)] border-[var(--accent)] text-[var(--ink)]"
              : "muted hover:text-[var(--ink)]"
          }`}
          onClick={() => setView("explore")}
        >
          Explore life areas
        </button>
      </nav>

      {view === "now" && (
        <section className="panel-soft px-4 sm:px-5 py-5 sm:py-6 grid gap-5 max-w-[42rem]">
          <header>
            <p className="eyebrow">Included · snapshot</p>
            <h3 className="serif text-[clamp(1.4rem,3.5vw,1.9rem)] leading-tight mt-1">{rightNow.headline}</h3>
            <p className="muted mt-3 text-[14px] leading-relaxed">{rightNow.plain}</p>
          </header>

          {rightNow.period && (
            <div className="grid gap-2">
              <p className="eyebrow text-[11px]">{rightNow.period.label}</p>
              <p className="text-[14px] leading-relaxed">{rightNow.period.meaning}</p>
              <details className="text-[13px]">
                <summary className="see-more cursor-pointer list-none w-fit [&::-webkit-details-marker]:hidden">
                  Period names & dates
                </summary>
                <ul className="mt-2 grid gap-1 muted pl-0">
                  {rightNow.period.chartDetail.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          {rightNow.sky.length > 0 && (
            <div className="grid gap-3">
              <p className="eyebrow text-[11px]">Weather around you</p>
              {rightNow.sky.map((s) => (
                <div key={s.label} className="grid gap-1">
                  <p className="text-[14px] font-medium">{s.label}</p>
                  <p className="text-[13.5px] muted leading-relaxed">{s.detail}</p>
                  {s.chartDetail && (
                    <details className="text-[12.5px]">
                      <summary className="see-more cursor-pointer list-none w-fit [&::-webkit-details-marker]:hidden">
                        Chart name
                      </summary>
                      <p className="mt-1 muted">{s.chartDetail}</p>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4">
            <p className="eyebrow text-[11px]">Life areas</p>
            {rightNow.areas.map((a) => (
              <article key={a.id} className="border-t hair pt-4 first:border-0 first:pt-0 grid gap-2.5">
                <h4 className="text-[15px] font-medium">{a.area}</h4>
                <dl className="grid gap-2.5 text-[13.5px] leading-relaxed">
                  <div>
                    <dt className="muted text-[11px] uppercase tracking-wide">Led by</dt>
                    <dd className="mt-0.5">{a.ledBy}</dd>
                  </div>
                  <div>
                    <dt className="muted text-[11px] uppercase tracking-wide">In this chapter</dt>
                    <dd className="mt-0.5">{a.today}</dd>
                  </div>
                  <div>
                    <dt className="muted text-[11px] uppercase tracking-wide">Focus</dt>
                    <dd className="mt-0.5 font-medium">{a.focus}</dd>
                  </div>
                </dl>
                <details className="text-[13px]">
                  <summary className="see-more cursor-pointer list-none w-fit [&::-webkit-details-marker]:hidden">
                    {a.chartDetail.summary}
                  </summary>
                  <ul className="mt-2 grid gap-1.5 muted leading-relaxed pl-0">
                    {a.chartDetail.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </details>
                <button
                  type="button"
                  className="see-more w-fit text-[12.5px]"
                  onClick={() => {
                    const groupFor =
                      a.id === "work"
                        ? "work"
                        : a.id === "partnership"
                          ? "path"
                          : a.id === "money" || a.id === "mind"
                            ? "resources"
                            : a.id === "drive"
                              ? "bonds"
                              : a.id === "learning"
                                ? "inner"
                                : "foundations";
                    setGroupId(groupFor);
                    const topicMap: Record<string, string> = {
                      work: "d10",
                      partnership: "d9",
                      mind: "d4",
                      money: "d2",
                      drive: "d3",
                      learning: "d24",
                    };
                    setTopicId(topicMap[a.id] ?? "rising");
                    setTab("words");
                    setView("explore");
                  }}
                >
                  More on this area →
                </button>
              </article>
            ))}
          </div>

          <p className="note text-[13px] leading-snug">{rightNow.boundary}</p>

          <div className="btn-row flex-wrap">
            <button type="button" className="btn" onClick={() => setView("explore")}>
              Explore life areas
            </button>
            {(onContinueToPast || onUnlockHint) && (
              <button type="button" className="btn btn-primary" onClick={() => (onContinueToPast ?? onUnlockHint)?.()}>
                {r.canAccessPaid ? "Continue to past-check →" : "Next: past-check →"}
              </button>
            )}
          </div>
        </section>
      )}

      {view === "explore" && (
        <>
          <nav className="flex flex-wrap gap-2" aria-label="Chart themes">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-current={groupId === g.id ? "true" : undefined}
                className={`text-[13px] px-3.5 py-1.5 rounded-full border hair transition-colors ${
                  groupId === g.id
                    ? "bg-[var(--accent-wash)] border-[var(--accent)] text-[var(--ink)]"
                    : "muted hover:text-[var(--ink)]"
                }`}
                onClick={() => selectGroup(g.id)}
              >
                {g.label}
              </button>
            ))}
          </nav>

          <div className="grid lg:grid-cols-[13rem_minmax(0,1fr)] gap-6 lg:gap-10 min-w-0">
            <nav className="grid gap-1 self-start" aria-label="Topics in this theme">
              {(group?.topics ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTopic(t.id)}
                  className={`text-left px-3 py-2.5 rounded-[10px] text-[13.5px] leading-snug transition-colors ${
                    topic?.id === t.id ? "bg-[var(--accent-wash)] text-[var(--ink)]" : "muted hover:text-[var(--ink)]"
                  }`}
                  aria-current={topic?.id === t.id ? "page" : undefined}
                >
                  <span className="block font-medium text-[var(--ink)]">{t.label}</span>
                  {t.classical && <span className="block text-[11.5px] muted mt-0.5">{t.classical}</span>}
                </button>
              ))}
            </nav>

            {topic && (
              <article className="panel-soft px-4 sm:px-5 py-4 sm:py-5 min-w-0 grid gap-4">
                <header className="max-w-[36rem]">
                  <p className="eyebrow">{topic.groupLabel}</p>
                  <h3 className="serif text-[clamp(1.35rem,3.5vw,1.85rem)] leading-tight mt-1">{topic.label}</h3>
                  {topic.classical && <p className="text-[12.5px] muted mt-1">{topic.classical}</p>}
                </header>

                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Topic views">
                  {(
                    [
                      { id: "words" as const, name: "Counsel", show: !!topic.readingId },
                      { id: "about" as const, name: "What this is" },
                      { id: "map" as const, name: "Chart map", show: !!(topic.placementId || topic.factId) },
                    ] as { id: Tab; name: string; show?: boolean }[]
                  )
                    .filter((x) => x.show !== false)
                    .map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === x.id}
                        className={`text-[13px] px-3.5 py-1.5 rounded-full border hair transition-colors ${
                          tab === x.id
                            ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--paper)]"
                            : "muted hover:text-[var(--ink)]"
                        }`}
                        onClick={() => setTab(x.id)}
                      >
                        {x.name}
                      </button>
                    ))}
                </div>

                {tab === "words" && topic.readingId && <TopicWords reading={reading} name={name} />}

                {tab === "about" && (
                  <div className="grid gap-3 max-w-[36rem] text-[14.5px] leading-relaxed">
                    <p>{topic.plain}</p>
                    {subtitle?.relevance && (
                      <p className="note text-[13.5px] leading-snug">
                        <span className="eyebrow text-[11px] block mb-1.5">For {name}</span>
                        {subtitle.relevance}
                      </p>
                    )}
                    {topic.placementId || topic.factId ? (
                      <button type="button" className="see-more w-fit" onClick={() => setTab("map")}>
                        See where planets sit →
                      </button>
                    ) : null}
                  </div>
                )}

                {tab === "map" && <TopicMap topic={topic} fact={fact} placement={placement} chart={r} />}
              </article>
            )}
          </div>
        </>
      )}

      {/* Next: blind past-check */}
      <section className="grid gap-4 pt-2 border-t hair">
        <div className="max-w-[40rem]">
          <p className="eyebrow text-[var(--gold)]">Next in the path</p>
          <h3 className="serif text-[clamp(1.25rem,3vw,1.6rem)] leading-tight mt-1">Blind past-check</h3>
          <p className="muted mt-2 text-[14px] leading-relaxed">
            The atlas stays yours. The next step tests the chart against periods you already lived — you score each
            claim. Only after that do forward reports and guidance open.
          </p>
        </div>
        <ol className="grid gap-2 max-w-[36rem] text-[13.5px] leading-snug">
          {[
            { t: "Blind past-check", d: "Generate claims about your past; mark each right, wrong, or unclear." },
            { t: "Forward reports", d: "Timeline and vocation written with that score in hand." },
            { t: "Decade guidance", d: "Same substance in plain language." },
            { t: "Living protocol", d: "One HTML page that stays current when you reopen it." },
          ].map((x) => (
            <li key={x.t} className="panel-soft px-4 py-3">
              <p className="font-medium text-[14px]">{x.t}</p>
              <p className="muted mt-1">{x.d}</p>
            </li>
          ))}
        </ol>
        <div className="btn-row flex-wrap">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => (onContinueToPast ?? onUnlockHint)?.()}
          >
            {r.canAccessPaid ? "Continue to blind past-check →" : "See how the past-check works →"}
          </button>
        </div>
        {r.canAccessPaid
          ? null
          : process.env.NODE_ENV !== "production" && (
              <p className="note text-[12.5px] max-w-[36rem]">
                QA: flip plan in the header, or sign in as <code className="text-[12px]">paid@test.local</code>.
              </p>
            )}
      </section>
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
              <tr key={p.name} className="border-t hair">
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
              <tr key={p.name} className="border-t hair">
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
            <tr key={p.name} className="border-t hair">
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
            <dt className="muted text-[11px] uppercase tracking-wide">Led by</dt>
            <dd className="mt-0.5">{card.ledBy}</dd>
          </div>
          <div>
            <dt className="muted text-[11px] uppercase tracking-wide">In this chapter</dt>
            <dd className="mt-0.5">{card.today}</dd>
          </div>
          <div>
            <dt className="muted text-[11px] uppercase tracking-wide">Focus</dt>
            <dd className="mt-0.5 font-medium">{card.focus}</dd>
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
