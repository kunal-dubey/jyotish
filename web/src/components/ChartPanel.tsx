"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { chartSvg, regionalStyle } from "@/lib/chartSvg";
import type { Intake } from "@/lib/types";
import { api, type LoadedReading } from "./api";
import IntakeForm from "./IntakeForm";
import PractitionerDialog from "./PractitionerDialog";

function mins(n: number | null) {
  return n == null ? "more than the search window" : `${n} min`;
}

export default function ChartPanel({
  r,
  onReading,
  startEditing = false,
}: {
  r: LoadedReading;
  onReading: (r: LoadedReading) => void;
  startEditing?: boolean;
}) {
  const [editing, setEditing] = useState(startEditing);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [practitionerOpen, setPractitionerOpen] = useState(false);
  const detailsRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (startEditing) setEditing(true);
  }, [startEditing]);

  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;
    if (detailsOpen && !el.open) el.showModal();
    if (!detailsOpen && el.open) el.close();
  }, [detailsOpen]);

  const c = r.chart;
  const style = regionalStyle(r.intake.place.label);
  const svg = useMemo(() => chartSvg(c, style), [c, style]);
  const lg = c.sensitivity.lagna,
    nl = c.sensitivity.navamsa_lagna,
    mn = c.sensitivity.moon_nakshatra;
  const hasDownstream = r.status !== "chart" && r.status !== "confirmed";
  const name = r.intake.callName || r.intake.name;
  const confirmed = r.status !== "chart";
  const hasNotes = c.sensitivity.time_critical || c.time.notes.length > 0;

  if (editing) {
    return (
      <IntakeForm
        initial={r.intake}
        onCancel={() => setEditing(false)}
        onSubmitEdit={async (intake: Intake) => {
          if (
            hasDownstream &&
            !confirm(
              "Changing birth data clears confirmation, past-check claims and scores, reports, guidance, and the living page. Continue?",
            )
          )
            return;
          onReading(await api.patch(r.id, { action: "recompute", intake }));
          setEditing(false);
        }}
      />
    );
  }

  async function confirmData() {
    setBusy(true);
    setErr(null);
    try {
      onReading(await api.patch(r.id, { action: "confirm" }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stage-body enter">
      <div className="chart-hero">
        <figure className="chart-hero__figure">
          <div className="min-w-0" dangerouslySetInnerHTML={{ __html: svg }} />
          <figcaption className="text-[13px] muted">
            {style === "south" ? "South" : "North"} Indian style. Retrograde marked.
          </figcaption>
        </figure>

        <div className="chart-hero__aside">
          <div className="chart-hero__copy">
            <div className="chart-hero__title">
              <h3 className="chart-hero__rising">{c.ascendant.sign} rising</h3>
              <div className="chart-hero__meta">
                <p className="chart-hero__sub">
                  For {name} · {r.intake.date} · {r.intake.time}
                </p>
                <p className="chart-hero__sub muted">
                  {r.intake.place.label}. This is the rising sign for that moment — confirm if it looks right before the
                  atlas and past-check.
                </p>
              </div>
            </div>

            <dl className="chart-hero__facts">
              <div className="chart-hero__fact">
                <dt>How sharp is the time?</dt>
                <dd>
                  Rising stays the same about {mins(lg.minutes_earlier_survives)} earlier and{" "}
                  {mins(lg.minutes_later_survives)} later
                </dd>
              </div>
              <div className="chart-hero__fact">
                <dt>Clock offset</dt>
                <dd>{c.time.utc_offset_str}</dd>
              </div>
              <div className="chart-hero__fact">
                <dt>Chart style</dt>
                <dd>{style === "south" ? "South" : "North"} Indian</dd>
              </div>
            </dl>

            {hasNotes && (
              <div className="chart-hero__notes">
                {c.sensitivity.time_critical && (
                  <p className="note note-warn">
                    <strong>Time-sensitive.</strong> The rising sign changes within ten minutes of the recorded time. If
                    the time is approximate, you can edit birth details later.
                  </p>
                )}
                {c.time.notes.slice(0, 1).map((n, k) => (
                  <p key={k} className="note note-warn">
                    {n}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="chart-hero__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setDetailsOpen(true)}>
              Chart details
            </button>
            {!confirmed && (
              <button type="button" className="btn btn--primary" onClick={confirmData} disabled={busy}>
                Confirm this looks right
              </button>
            )}
            {!confirmed && (
              <p className="muted text-[13px] w-full">
                Confirm if this birth data looks right. You can edit later — editing may clear later stages.
              </p>
            )}
            {err && <p className="note note-bad w-full">{err}</p>}
          </div>
        </div>
      </div>

      <dialog
        ref={detailsRef}
        className="dialog dialog--wide"
        aria-labelledby="chart-details-title"
        onClose={() => setDetailsOpen(false)}
        onCancel={() => setDetailsOpen(false)}
      >
        <div className="dialog__in">
          <div className="dialog__head">
            <h2 id="chart-details-title" className="dialog__title">
              Chart details
            </h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={() => setDetailsOpen(false)}>
              ×
            </button>
          </div>
          <p className="dialog__lede">
            Classical placements and sensitivity. Edit birth from the rail if anything is wrong.
          </p>

          <section className="dialog__section" aria-label="Rising">
            <h3 className="dialog__section-title">Rising</h3>
            <dl className="meta-grid">
              <dt>Sign</dt>
              <dd>
                {c.ascendant.sign} {c.ascendant.deg}
              </dd>
              <dt>Nakshatra</dt>
              <dd>
                {c.ascendant.nakshatra} pada {c.ascendant.pada}
              </dd>
              <dt>Lord</dt>
              <dd>
                {c.ascendant.lord}
                {c.yogakaraka.length ? ` · yogakaraka ${c.yogakaraka.join(", ")}` : ""}
              </dd>
            </dl>
          </section>

          <section className="dialog__section" aria-label="Moment and settings">
            <h3 className="dialog__section-title">Moment & settings</h3>
            <dl className="meta-grid">
              <dt>Moment</dt>
              <dd>
                {r.intake.date} {r.intake.time} · {r.intake.place.label}
              </dd>
              <dt>Time offset</dt>
              <dd>
                {c.time.utc_offset_str} <span className="muted">from {c.time.offset_source}</span>
              </dd>
              <dt>Rising window</dt>
              <dd>
                {mins(lg.minutes_earlier_survives)} earlier · {mins(lg.minutes_later_survives)} later
              </dd>
              <dt>Universal time</dt>
              <dd>{c.time.utc.replace("T", " ").replace("Z", " UT")}</dd>
              <dt>Coordinates</dt>
              <dd>
                {c.input.lat.toFixed(4)}, {c.input.lon.toFixed(4)}
              </dd>
              <dt>Navamsa lagna</dt>
              <dd>
                {c.ascendant.navamsa} · {mins(nl.minutes_earlier_survives)} / {mins(nl.minutes_later_survives)}
              </dd>
              <dt>Moon nakshatra</dt>
              <dd>
                {c.vimshottari.moon_nakshatra} · {mins(mn.minutes_earlier_survives)} / {mins(mn.minutes_later_survives)}
              </dd>
              <dt>Nodes</dt>
              <dd>
                Mean used. True node {c.nodes.padas_differ ? "differs in pada" : "same pada"} ({c.nodes.true.nakshatra}{" "}
                {c.nodes.true.pada}).
              </dd>
              <dt>Settings</dt>
              <dd>Lahiri {c.settings.ayanamsa_value}°, whole-sign</dd>
            </dl>
          </section>

          {c.time.notes.length > 1 && (
            <div className="grid gap-3">
              {c.time.notes.slice(1).map((n, k) => (
                <p key={k} className="note note-warn">
                  {n}
                </p>
              ))}
            </div>
          )}

          <section className="dialog__section" aria-label="Planets and periods">
            <h3 className="dialog__section-title">Planets & periods</h3>
            <div className="grid lg:grid-cols-2 gap-10">
              <div className="overflow-x-auto">
                <h4 className="text-[14px] font-medium mb-3">Planets</h4>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Planet</th>
                      <th>Sign</th>
                      <th>House</th>
                      <th>Nakshatra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.planets.map((p) => (
                      <tr key={p.name}>
                        <td>{p.name}</td>
                        <td>
                          {p.sign} {p.deg}
                        </td>
                        <td>{p.house}</td>
                        <td>
                          {p.nakshatra} {p.pada}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-8">
                <div className="overflow-x-auto">
                  <h4 className="text-[14px] font-medium mb-3">If the time is off</h4>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Shift</th>
                        <th>Ascendant</th>
                        <th>Navamsa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.sensitivity.table.map((t) => (
                        <tr key={t.offset_min} className={t.offset_min === 0 ? "now" : ""}>
                          <td>{t.offset_min > 0 ? `+${t.offset_min}` : t.offset_min} min</td>
                          <td>
                            {t.sign} {t.deg}
                          </td>
                          <td>{t.navamsa}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="overflow-x-auto">
                  <h4 className="text-[14px] font-medium mb-3">Major periods</h4>
                  <table className="tbl">
                    <tbody>
                      {c.vimshottari.mahadashas.slice(0, 6).map((m) => (
                        <tr key={m.start} className={m.status === "current" ? "now" : ""}>
                          <td>{m.lord}</td>
                          <td>
                            {m.start} → {m.end}
                          </td>
                          <td className="muted">
                            age {m.age_start.toFixed(1)}–{m.age_end.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <div className="dialog__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setDetailsOpen(false);
                setPractitionerOpen(true);
              }}
            >
              Practitioner table
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setDetailsOpen(false)}>
              Done
            </button>
          </div>
        </div>
      </dialog>

      <PractitionerDialog
        open={practitionerOpen}
        chart={c}
        name={name}
        placeLabel={r.intake.place.label}
        onClose={() => setPractitionerOpen(false)}
      />
    </div>
  );
}
