"use client";
import { useMemo, useState } from "react";
import { chartSvg, regionalStyle } from "@/lib/chartSvg";
import type { Intake } from "@/lib/types";
import { api, type LoadedReading } from "./api";
import IntakeForm from "./IntakeForm";

function mins(n: number | null) {
  return n == null ? "more than the search window" : `${n} min`;
}

export default function ChartPanel({ r, onReading }: { r: LoadedReading; onReading: (r: LoadedReading) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const c = r.chart;
  const svg = useMemo(() => chartSvg(c, regionalStyle(r.intake.place.label)), [c, r.intake.place.label]);
  const lg = c.sensitivity.lagna,
    nl = c.sensitivity.navamsa_lagna,
    mn = c.sensitivity.moon_nakshatra;
  const hasDownstream = r.status !== "chart" && r.status !== "confirmed";

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
    <div className="grid gap-8 enter">
      <div className="grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] gap-8 md:gap-12 items-start">
        <figure className="panel">
          <div dangerouslySetInnerHTML={{ __html: svg }} />
          <figcaption className="text-[12.5px] muted mt-2">
            {regionalStyle(r.intake.place.label) === "south" ? "South" : "North"} Indian style. ʳ marks retrograde.
          </figcaption>
        </figure>

        <div className="grid gap-5">
          <div>
            <p className="eyebrow">The chart</p>
            <h2 className="serif text-[clamp(1.85rem,3.5vw,2.35rem)] leading-tight mt-1">
              {c.ascendant.sign} rising, {c.ascendant.deg}
            </h2>
            <p className="muted mt-1">
              {c.ascendant.nakshatra} pada {c.ascendant.pada} · lord {c.ascendant.lord} · navamsa {c.ascendant.navamsa}
            </p>
          </div>

          <dl className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-[14px]">
            <dt className="muted">Moment</dt>
            <dd>
              {r.intake.date} {r.intake.time} · {r.intake.place.label}
            </dd>
            <dt className="muted">Offset</dt>
            <dd>
              {c.time.utc_offset_str} <span className="muted">from {c.time.offset_source}</span>
            </dd>
            <dt className="muted">Lagna window</dt>
            <dd>
              {mins(lg.minutes_earlier_survives)} earlier · {mins(lg.minutes_later_survives)} later
            </dd>
          </dl>

          {c.sensitivity.time_critical && (
            <p className="note note-warn">
              <strong>Time-critical.</strong> The rising sign changes within ten minutes of the recorded time.
            </p>
          )}
          {c.time.notes.slice(0, details ? undefined : 1).map((n, k) => (
            <p key={k} className="note note-warn">
              {n}
            </p>
          ))}

          <button type="button" className="see-more justify-self-start" onClick={() => setDetails((d) => !d)}>
            {details ? "Hide technical detail" : "See planets, dashas & sensitivity"}
          </button>
        </div>
      </div>

      {details && (
        <div className="grid gap-8 enter">
          <dl className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-[14px] panel">
            <dt className="muted">Universal time</dt>
            <dd>{c.time.utc.replace("T", " ").replace("Z", " UT")}</dd>
            <dt className="muted">Coordinates</dt>
            <dd>
              {c.input.lat.toFixed(4)}, {c.input.lon.toFixed(4)}
            </dd>
            <dt className="muted">Navamsa lagna</dt>
            <dd>
              {mins(nl.minutes_earlier_survives)} / {mins(nl.minutes_later_survives)}
            </dd>
            <dt className="muted">Moon nakshatra</dt>
            <dd>
              {c.vimshottari.moon_nakshatra} · {mins(mn.minutes_earlier_survives)} / {mins(mn.minutes_later_survives)}
            </dd>
            <dt className="muted">Nodes</dt>
            <dd>
              Mean used. True node {c.nodes.padas_differ ? "differs in pada" : "same pada"} ({c.nodes.true.nakshatra}{" "}
              {c.nodes.true.pada}).
            </dd>
            <dt className="muted">Settings</dt>
            <dd>Lahiri {c.settings.ayanamsa_value}°, whole-sign</dd>
          </dl>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="overflow-x-auto">
              <h3 className="eyebrow mb-2">Planets</h3>
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
                <h3 className="eyebrow mb-2">If the time is off</h3>
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
                        <td>
                          {t.offset_min > 0 ? `+${t.offset_min}` : t.offset_min} min
                        </td>
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
                <h3 className="eyebrow mb-2">Mahadashas</h3>
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

      <div className="border-t hair pt-8 flex flex-wrap items-center gap-4">
        {r.status === "chart" ? (
          <>
            <div className="max-w-[34rem]">
              <p className="eyebrow text-[var(--gold)]">Hard stop 1 · Confirm</p>
              <p className="mt-1 text-[14.5px]">
                A chart on a mistyped year is coherent and completely wrong. Check the moment and place before any model
                writing begins.
              </p>
            </div>
            <div className="flex gap-3 ml-auto">
              <button type="button" className="btn" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmData} disabled={busy}>
                Looks right — continue
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted text-[13.5px]">Confirmed {r.confirmedAt?.slice(0, 10)}.</p>
            <button type="button" className="btn btn-quiet ml-auto" onClick={() => setEditing(true)}>
              Correct birth data
            </button>
          </>
        )}
        {err && <p className="note note-bad w-full">{err}</p>}
      </div>
    </div>
  );
}
