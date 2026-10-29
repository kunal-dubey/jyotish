"use client";
import { useEffect, useMemo, useState } from "react";
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
  const [details, setDetails] = useState(false);
  const [practitionerOpen, setPractitionerOpen] = useState(false);
  useEffect(() => {
    if (startEditing) setEditing(true);
  }, [startEditing]);
  const c = r.chart;
  const style = regionalStyle(r.intake.place.label);
  const svg = useMemo(() => chartSvg(c, style), [c, style]);
  const lg = c.sensitivity.lagna,
    nl = c.sensitivity.navamsa_lagna,
    mn = c.sensitivity.moon_nakshatra;
  const hasDownstream = r.status !== "chart" && r.status !== "confirmed";
  const name = r.intake.callName || r.intake.name;

  if (editing) {
    return (
      <IntakeForm
        initial={r.intake}
        onCancel={() => setEditing(false)}
        onSubmitEdit={async (intake: Intake) => {
          if (hasDownstream && !confirm("Changing birth data discards every report written so far. Continue?")) return;
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
    <div className="grid gap-6 sm:gap-8 enter min-w-0">
      <div className="grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] gap-6 md:gap-12 items-start">
        <figure className="panel max-w-full overflow-x-auto">
          <div className="min-w-0" dangerouslySetInnerHTML={{ __html: svg }} />
          <figcaption className="text-[13px] muted mt-2">
            {style === "south" ? "South" : "North"} Indian style. Retrograde marked.
          </figcaption>
        </figure>

        <div className="grid gap-5 min-w-0">
          <div>
            <h2 className="stage-title" style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>
              {c.ascendant.sign} rising
            </h2>
            <p className="muted mt-2 text-[15px]">
              {c.ascendant.deg} · {c.ascendant.nakshatra} pada {c.ascendant.pada}
            </p>
            <p className="muted mt-1 text-[13px]">
              Ruled by {c.ascendant.lord}
              {c.yogakaraka.length ? ` · yogakaraka ${c.yogakaraka.join(", ")}` : ""}
            </p>
          </div>

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
          </dl>

          {c.sensitivity.time_critical && (
            <p className="note note-warn">
              <strong>Time-sensitive.</strong> The rising sign changes within ten minutes of the recorded time.
            </p>
          )}
          {c.time.notes.slice(0, details ? undefined : 1).map((n, k) => (
            <p key={k} className="note note-warn">
              {n}
            </p>
          ))}

          <div className="grid gap-2 justify-items-start">
            <button type="button" className="see-more" onClick={() => setDetails((d) => !d)}>
              {details ? "Hide chart detail" : "Show chart detail (planets, periods, sensitivity)"}
            </button>
            <button type="button" className="see-more" onClick={() => setPractitionerOpen(true)}>
              Open practitioner table
            </button>
          </div>
        </div>
      </div>

      {details && (
        <div className="grid gap-8 enter" data-ui>
          <dl className="meta-grid panel">
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

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="overflow-x-auto">
              <h3 className="text-[14px] font-medium mb-2">Planets</h3>
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
            <div className="grid gap-6">
              <div className="overflow-x-auto">
                <h3 className="text-[14px] font-medium mb-2">If the time is off</h3>
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
                <h3 className="text-[14px] font-medium mb-2">Major periods</h3>
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
        </div>
      )}

      <div className="pt-2 grid gap-4 sm:flex sm:flex-wrap sm:items-center">
        {r.status === "chart" ? (
          <>
            <div className="max-w-[34rem] min-w-0">
              <p className="text-[15px] leading-relaxed">
                A chart on a mistyped year looks coherent and is completely wrong. Check the moment and place before any
                writing begins.
              </p>
            </div>
            <div className="btn-row btn-row-stack sm:ml-auto sm:flex-row">
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(true)}>
                Correct Details
              </button>
              <button type="button" className="btn btn--primary" onClick={confirmData} disabled={busy}>
                Confirm Chart
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted text-[14px]">Chart confirmed. The atlas is open.</p>
            <button type="button" className="btn btn--ghost sm:ml-auto" onClick={() => setEditing(true)}>
              Edit Details
            </button>
          </>
        )}
        {err && <p className="note note-bad w-full">{err}</p>}
      </div>

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
