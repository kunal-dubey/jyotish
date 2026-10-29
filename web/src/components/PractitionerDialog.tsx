"use client";
import { useEffect, useMemo, useRef } from "react";
import { chartSvg, navamsaSvg, regionalStyle, type ChartStyle } from "@/lib/chartSvg";
import { exportChartCsv, exportChartJson } from "@/lib/chartExport";
import type { Chart } from "@/lib/types";

function mins(n: number | null) {
  return n == null ? "more than the search window" : `${n} min`;
}

export default function PractitionerDialog({
  open,
  chart,
  name,
  placeLabel,
  onClose,
}: {
  open: boolean;
  chart: Chart;
  name: string;
  placeLabel: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const style: ChartStyle = regionalStyle(placeLabel);
  const d1 = useMemo(() => chartSvg(chart, style), [chart, style]);
  const d9 = useMemo(() => navamsaSvg(chart, style), [chart, style]);
  const combust = useMemo(
    () => new Map((chart.combustion ?? []).map((x) => [x.planet, x])),
    [chart.combustion],
  );
  const nl = chart.sensitivity.navamsa_lagna;
  const mn = chart.sensitivity.moon_nakshatra;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="dialog dialog--chart"
      aria-labelledby="practitioner-dialog-title"
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="dialog__in">
        <div className="dialog__head">
          <h2 id="practitioner-dialog-title" className="dialog__title">
            Practitioner table
          </h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="dialog__lede">
          Dense placements, navamsa, locked settings, and export. The main chart view stays plain.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <figure className="min-w-0">
            <div className="panel" style={{ padding: 12 }} dangerouslySetInnerHTML={{ __html: d1 }} />
            <figcaption className="text-[13px] muted mt-2">
              D1 · {style === "south" ? "South" : "North"} Indian
            </figcaption>
          </figure>
          <figure className="min-w-0">
            <div className="panel" style={{ padding: 12 }} dangerouslySetInnerHTML={{ __html: d9 }} />
            <figcaption className="text-[13px] muted mt-2">
              D9 Navamsa · lagna {chart.ascendant.navamsa}
              {chart.vargas?.d9?.lagna_lord ? ` · lord ${chart.vargas.d9.lagna_lord}` : ""}
            </figcaption>
          </figure>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="panel" style={{ padding: "14px 16px" }}>
            <p className="small muted" style={{ margin: 0 }}>
              Lagna
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "var(--t-sm)", fontWeight: 600 }}>
              {chart.ascendant.sign} {chart.ascendant.deg}
            </p>
            <p className="small muted" style={{ margin: "2px 0 0" }}>
              {chart.ascendant.nakshatra} p{chart.ascendant.pada} · {chart.ascendant.lord}
            </p>
          </div>
          <div className="panel" style={{ padding: "14px 16px" }}>
            <p className="small muted" style={{ margin: 0 }}>
              Navamsa lagna
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "var(--t-sm)", fontWeight: 600 }}>
              {chart.ascendant.navamsa}
            </p>
            <p className="small muted" style={{ margin: "2px 0 0" }}>
              window {mins(nl.minutes_earlier_survives)} / {mins(nl.minutes_later_survives)}
            </p>
          </div>
          <div className="panel" style={{ padding: "14px 16px" }}>
            <p className="small muted" style={{ margin: 0 }}>
              Yogakaraka
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "var(--t-sm)", fontWeight: 600 }}>
              {chart.yogakaraka.length ? chart.yogakaraka.join(", ") : "—"}
            </p>
          </div>
          <div className="panel" style={{ padding: "14px 16px" }}>
            <p className="small muted" style={{ margin: 0 }}>
              Moon nakshatra
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "var(--t-sm)", fontWeight: 600 }}>
              {chart.vimshottari.moon_nakshatra}
            </p>
            <p className="small muted" style={{ margin: "2px 0 0" }}>
              window {mins(mn.minutes_earlier_survives)} / {mins(mn.minutes_later_survives)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="tbl tbl--dense">
            <thead>
              <tr>
                <th>Planet</th>
                <th>Sign°</th>
                <th>H</th>
                <th>Nak</th>
                <th>Pada</th>
                <th>D9</th>
                <th>Dig</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {chart.planets.map((p) => {
                const flags = [
                  p.retrograde ? "R" : null,
                  p.vargottama ? "Vg" : null,
                  combust.has(p.name) ? `C${combust.get(p.name)!.distance}°` : null,
                ].filter(Boolean);
                return (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td>
                      {p.sign} {p.deg}
                    </td>
                    <td>{p.house}</td>
                    <td>{p.nakshatra}</td>
                    <td>{p.pada}</td>
                    <td>{p.navamsa}</td>
                    <td>{p.dignity ?? "—"}</td>
                    <td className="muted">{flags.length ? flags.join(" · ") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <dl className="meta-grid">
          <dt>Ayanamsa</dt>
          <dd>
            Lahiri {chart.settings.ayanamsa_value}° <span className="muted">(locked)</span>
          </dd>
          <dt>Nodes</dt>
          <dd>
            Mean used. True {chart.nodes.true.sign} {chart.nodes.true.deg} · {chart.nodes.true.nakshatra} p
            {chart.nodes.true.pada}
            {chart.nodes.padas_differ ? " · pada differs" : " · same pada"}
            {chart.nodes.signs_differ ? " · sign differs" : ""}
          </dd>
          <dt>Houses</dt>
          <dd>Whole sign</dd>
          <dt>Zodiac</dt>
          <dd>Sidereal</dd>
          <dt>Universal time</dt>
          <dd>{chart.time.utc.replace("T", " ").replace("Z", " UT")}</dd>
          <dt>Coordinates</dt>
          <dd>
            {chart.input.lat.toFixed(4)}, {chart.input.lon.toFixed(4)}
          </dd>
        </dl>

        <div className="dialog__actions" style={{ justifyContent: "space-between" }}>
          <div className="btn-row" style={{ flexWrap: "wrap" }}>
            <button type="button" className="btn btn--ghost" onClick={() => exportChartJson(chart, name)}>
              Export JSON
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => exportChartCsv(chart, name)}>
              Export CSV
            </button>
          </div>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
