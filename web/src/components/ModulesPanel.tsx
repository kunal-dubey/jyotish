"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CHART_TOPICS, topicGroups, type ChartTopic } from "@/lib/modules";
import { buildRightNow } from "@/lib/rightNow";
import type { LoadedReading, ReadingModule } from "./api";

type AtlasView = "now" | "explore";
type DepthPanel = "factors" | "period" | null;
type TopicPanel = "counsel" | "map" | "classical" | "forYou" | null;

export default function ModulesPanel({
  r,
  onUnlockHint,
  onContinueToPast,
}: {
  r: LoadedReading;
  onUnlockHint?: () => void;
  onContinueToPast?: () => void;
}) {
  const showFullTease = !r.canAccessPaid;
  const modulesById = useMemo(() => {
    const m = new Map<string, ReadingModule>();
    for (const mod of r.modules ?? []) m.set(mod.id, mod);
    return m;
  }, [r.modules]);

  const rightNow = useMemo(
    () => buildRightNow(r.chart, r.intake, r.outputs?.freeCounsel),
    [r.chart, r.intake, r.outputs?.freeCounsel],
  );

  const included = useMemo(() => CHART_TOPICS.filter((t) => t.access === "free"), []);
  const groups = useMemo(() => topicGroups(included), [included]);
  const areas = rightNow.areas;

  const [view, setView] = useState<AtlasView>("now");
  const [areaId, setAreaId] = useState(areas[0]?.id ?? "");
  const [depth, setDepth] = useState<DepthPanel>(null);
  const [showIndex, setShowIndex] = useState(false);
  const [showLeads, setShowLeads] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "foundations");
  const group = groups.find((g) => g.id === groupId) ?? groups[0];
  const groupTopics = group?.topics ?? [];
  const [topicId, setTopicId] = useState<string | null>(null);
  const [topicPanel, setTopicPanel] = useState<TopicPanel>(null);
  const topic = topicId
    ? (included.find((t) => t.id === topicId) ?? groupTopics.find((t) => t.id === topicId))
    : undefined;
  const topicIndex = Math.max(0, groupTopics.findIndex((t) => t.id === topicId));

  const areaIndex = Math.max(0, areas.findIndex((a) => a.id === areaId));
  const openArea = areas[areaIndex] ?? areas[0];
  const indexRef = useRef<HTMLElement>(null);
  const themeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!areas.length) return;
    if (!areas.some((a) => a.id === areaId)) setAreaId(areas[0].id);
  }, [areas, areaId]);

  useEffect(() => {
    setDepth(null);
    setShowLeads(false);
    setShowMore(false);
  }, [areaId]);

  useEffect(() => {
    if (!showIndex || !indexRef.current) return;
    const current = indexRef.current.querySelector<HTMLElement>(".atlas-tab.is-current");
    current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [areaId, showIndex]);

  useEffect(() => {
    setTopicPanel(null);
  }, [topicId]);

  useEffect(() => {
    if (!showThemes || !themeRef.current) return;
    const current = themeRef.current.querySelector<HTMLElement>(".atlas-theme.is-on");
    current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [groupId, showThemes]);

  useEffect(() => {
    if (view !== "explore") return;
    const topics = groups.find((g) => g.id === groupId)?.topics ?? [];
    if (topicId && topics.some((t) => t.id === topicId)) return;
    if (topics[0]) setTopicId(topics[0].id);
  }, [view, groupId, topicId, groups]);

  const name = r.intake.callName || r.intake.name;
  const placement = topic?.placementId ? modulesById.get(topic.placementId) : undefined;
  const reading = topic?.readingId ? modulesById.get(topic.readingId) : undefined;
  const fact = topic?.factId ? modulesById.get(topic.factId) : undefined;
  const subtitle = fact?.subtitle ?? reading?.subtitle ?? placement?.subtitle;
  const periodLine = rightNow.period?.meaning ?? rightNow.headline;

  function selectArea(id: string) {
    setAreaId(id);
    setView("now");
    setTopicId(null);
    setTopicPanel(null);
    setShowIndex(false);
    setShowThemes(false);
  }

  function stepArea(delta: number) {
    if (!areas.length) return;
    const next = (areaIndex + delta + areas.length) % areas.length;
    setAreaId(areas[next].id);
  }

  function selectGroup(id: string) {
    setView("explore");
    setGroupId(id);
    const nextGroup = groups.find((g) => g.id === id);
    setTopicId(nextGroup?.topics[0]?.id ?? null);
    setTopicPanel(null);
    setShowThemes(false);
  }

  function selectTopic(id: string) {
    setView("explore");
    setTopicId(id);
    setTopicPanel(null);
  }

  function stepTopic(delta: number) {
    if (!groupTopics.length) return;
    const next = (topicIndex + delta + groupTopics.length) % groupTopics.length;
    setTopicId(groupTopics[next].id);
  }

  function openMaps() {
    const first = groupTopics[0] ?? groups[0]?.topics[0];
    setView("explore");
    setTopicId(first?.id ?? null);
    setTopicPanel(null);
    setDepth(null);
    setShowMore(false);
    setShowThemes(false);
    setShowIndex(false);
  }

  function backToNow() {
    setView("now");
    setTopicId(null);
    setTopicPanel(null);
    setShowThemes(false);
    setShowIndex(false);
  }

  function toggleDepth(panel: Exclude<DepthPanel, null>) {
    setDepth((d) => (d === panel ? null : panel));
  }

  function toggleTopicPanel(panel: Exclude<TopicPanel, null>) {
    setTopicPanel((p) => (p === panel ? null : panel));
  }

  return (
    <div className="stage-body enter">
      {view === "now" && openArea && (
        <div className="atlas-shell">
          <article className="atlas-reader" key={openArea.id}>
            {periodLine ? (
              <p className="atlas-note" role="note">
                <span className="atlas-note__label">Running now</span>
                <span className="atlas-note__text">{periodLine}</span>
              </p>
            ) : null}

            <nav className="atlas-crumb" aria-label="Location">
              <button
                type="button"
                className={`atlas-crumb__link${showIndex ? " is-on" : ""}`}
                aria-expanded={showIndex}
                aria-haspopup="listbox"
                onClick={() => setShowIndex((v) => !v)}
              >
                Areas
              </button>
              <span className="atlas-crumb__sep" aria-hidden>
                ›
              </span>
              <span className="atlas-crumb__here">{openArea.area}</span>
              <span className="atlas-crumb__hint">Click the trail to switch sections</span>
            </nav>

            {showIndex && (
              <nav ref={indexRef} className="atlas-more atlas-crumb-menu" aria-label="Areas of life">
                {areas.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`linkbtn${a.id === openArea.id ? " is-on" : ""}`}
                    aria-current={a.id === openArea.id ? "true" : undefined}
                    onClick={() => selectArea(a.id)}
                  >
                    {a.area}
                  </button>
                ))}
              </nav>
            )}

            <header className="atlas-reader__head">
              <h3 className="atlas-reader__title">{openArea.area}</h3>
              <p className="atlas-reader__practice">{openArea.focus}</p>
            </header>

            <div className="atlas-reader__body">
              <p className="atlas-reader__watch">{openArea.today}</p>

              {showLeads && (
                <div className="atlas-reader__section" aria-live="polite">
                  <h4>What leads it</h4>
                  <p>{openArea.ledBy}</p>
                </div>
              )}

              {depth === "factors" && (
                <div className="atlas-depth" aria-live="polite">
                  <p>{openArea.chartDetail.summary}</p>
                  {openArea.chartDetail.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}

              {depth === "period" && rightNow.period && (
                <div className="atlas-depth" aria-live="polite">
                  {rightNow.period.classical ? <p>{rightNow.period.classical}</p> : null}
                  {rightNow.period.chartDetail.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
            </div>

            <footer className="atlas-reader__foot">
              <div className="atlas-foot__primary">
                <div className="atlas-links" role="group" aria-label="More detail">
                  <button
                    type="button"
                    className={`linkbtn${showLeads ? " is-on" : ""}`}
                    aria-pressed={showLeads}
                    onClick={() => setShowLeads((v) => !v)}
                  >
                    {showLeads ? "Hide what leads it" : "What leads it"}
                  </button>
                  <button
                    type="button"
                    className={`linkbtn${depth === "factors" ? " is-on" : ""}`}
                    aria-pressed={depth === "factors"}
                    onClick={() => toggleDepth("factors")}
                  >
                    {depth === "factors" ? "Hide chart factors" : "Chart factors"}
                  </button>
                  <button
                    type="button"
                    className={`linkbtn${showMore ? " is-on" : ""}`}
                    aria-expanded={showMore}
                    onClick={() => setShowMore((v) => !v)}
                  >
                    {showMore ? "Less" : "More"}
                  </button>
                </div>

                <div className="atlas-nav">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm atlas-nav__btn"
                    aria-label="Previous area"
                    onClick={() => stepArea(-1)}
                  >
                    ‹
                  </button>
                  <span className="atlas-nav__pos">
                    {areaIndex + 1} / {areas.length}
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm atlas-nav__btn"
                    aria-label="Next area"
                    onClick={() => stepArea(1)}
                  >
                    ›
                  </button>
                </div>
              </div>

              {showMore && (
                <div className="atlas-more" role="group" aria-label="Further detail">
                  {rightNow.period && (
                    <button
                      type="button"
                      className={`linkbtn${depth === "period" ? " is-on" : ""}`}
                      aria-pressed={depth === "period"}
                      onClick={() => toggleDepth("period")}
                    >
                      {depth === "period" ? "Hide period detail" : "Period detail"}
                    </button>
                  )}
                  <button type="button" className="linkbtn" onClick={openMaps}>
                    More maps
                  </button>
                </div>
              )}
            </footer>
            {showFullTease ? (
              <p className="atlas-tease muted text-[13px]">
                More with the full reading —{" "}
                <button
                  type="button"
                  className="linkbtn"
                  onClick={() => (onContinueToPast ? onContinueToPast() : onUnlockHint?.())}
                >
                  past-check and Reports
                </button>
                .
              </p>
            ) : null}
          </article>
        </div>
      )}

      {view === "explore" && topic && (
        <div className="maps-shell enter">
          <article className="atlas-reader maps-reader" key={topic.id}>
            <nav className="atlas-crumb" aria-label="Location">
              <button type="button" className="atlas-crumb__link" onClick={backToNow}>
                Chart maps
              </button>
              <span className="atlas-crumb__sep" aria-hidden>
                ›
              </span>
              <button
                type="button"
                className={`atlas-crumb__link${showThemes ? " is-on" : ""}`}
                aria-expanded={showThemes}
                aria-haspopup="listbox"
                onClick={() => setShowThemes((v) => !v)}
              >
                {topic.groupLabel}
              </button>
              <span className="atlas-crumb__sep" aria-hidden>
                ›
              </span>
              <span className="atlas-crumb__here">{topic.label}</span>
              <span className="atlas-crumb__hint">Click the trail to switch sections</span>
            </nav>

            {showThemes && (
              <nav ref={themeRef} className="atlas-more atlas-crumb-menu" aria-label="Chart themes">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`linkbtn${groupId === g.id ? " is-on" : ""}`}
                    aria-current={groupId === g.id ? "true" : undefined}
                    onClick={() => selectGroup(g.id)}
                  >
                    {g.label}
                  </button>
                ))}
              </nav>
            )}

            <header className="atlas-reader__head">
              <h3 className="atlas-reader__title">{topic.label}</h3>
            </header>

            <div className="atlas-reader__body">
              <p className="atlas-reader__watch">{topic.plain}</p>

              {topicPanel === "counsel" && topic.readingId && (
                <div className="atlas-depth" aria-live="polite">
                  <TopicWords reading={reading} name={name} />
                </div>
              )}

              {topicPanel === "map" && (topic.placementId || topic.factId) && (
                <div className="atlas-depth" aria-live="polite">
                  <TopicMap topic={topic} fact={fact} placement={placement} chart={r} />
                </div>
              )}

              {topicPanel === "classical" && topic.classical && (
                <div className="atlas-depth" aria-live="polite">
                  <p>{topic.classical}</p>
                </div>
              )}

              {topicPanel === "forYou" && subtitle?.relevance && (
                <div className="atlas-depth" aria-live="polite">
                  <p>
                    <span className="muted" style={{ display: "block", marginBottom: 4 }}>
                      For {name}
                    </span>
                    {subtitle.relevance}
                  </p>
                </div>
              )}
            </div>

            <footer className="atlas-reader__foot">
              <div className="atlas-foot__primary">
                <div className="atlas-links" role="group" aria-label="Topic detail">
                  {topic.readingId && (
                    <button
                      type="button"
                      className={`linkbtn${topicPanel === "counsel" ? " is-on" : ""}`}
                      aria-pressed={topicPanel === "counsel"}
                      onClick={() => toggleTopicPanel("counsel")}
                    >
                      {topicPanel === "counsel" ? "Hide counsel" : "Counsel"}
                    </button>
                  )}
                  {(topic.placementId || topic.factId) && (
                    <button
                      type="button"
                      className={`linkbtn${topicPanel === "map" ? " is-on" : ""}`}
                      aria-pressed={topicPanel === "map"}
                      onClick={() => toggleTopicPanel("map")}
                    >
                      {topicPanel === "map" ? "Hide chart map" : "Chart map"}
                    </button>
                  )}
                  {topic.classical && (
                    <button
                      type="button"
                      className={`linkbtn${topicPanel === "classical" ? " is-on" : ""}`}
                      aria-pressed={topicPanel === "classical"}
                      onClick={() => toggleTopicPanel("classical")}
                    >
                      {topicPanel === "classical" ? "Hide classical name" : "Classical name"}
                    </button>
                  )}
                  {subtitle?.relevance && (
                    <button
                      type="button"
                      className={`linkbtn${topicPanel === "forYou" ? " is-on" : ""}`}
                      aria-pressed={topicPanel === "forYou"}
                      onClick={() => toggleTopicPanel("forYou")}
                    >
                      {topicPanel === "forYou" ? `Hide for ${name}` : `For ${name}`}
                    </button>
                  )}
                </div>

                <div className="atlas-nav">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm atlas-nav__btn"
                    aria-label="Previous topic"
                    onClick={() => stepTopic(-1)}
                  >
                    ‹
                  </button>
                  <span className="atlas-nav__pos">
                    {topicIndex + 1} / {groupTopics.length}
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm atlas-nav__btn"
                    aria-label="Next topic"
                    onClick={() => stepTopic(1)}
                  >
                    ›
                  </button>
                </div>
              </div>
            </footer>
          </article>
        </div>
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
          <details className="disclose disclose--quiet">
            <summary>
              {card.chartDetail.summary}
              <span aria-hidden>▾</span>
            </summary>
            <div className="disclose__body">
              <ul className="grid gap-1.5 muted leading-relaxed pl-0">
                {card.chartDetail.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
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
