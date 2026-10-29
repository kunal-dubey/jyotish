"use client";
import { useEffect, useRef, useState } from "react";
import type { Intake, TimeSource } from "@/lib/types";
import { api, type AuthUser, type LoadedReading } from "./api";

type Place = Intake["place"];

const SOURCES: { v: TimeSource; label: string }[] = [
  { v: "certificate", label: "Birth certificate" },
  { v: "hospital_record", label: "Hospital record" },
  { v: "parent_memory", label: "A parent's memory" },
  { v: "rounded", label: "Rounded figure" },
  { v: "guess", label: "A guess" },
  { v: "other", label: "Other" },
];

export default function NewReadingDialog({
  open,
  user,
  onAuthed,
  onCreated,
  onClose,
}: {
  open: boolean;
  user: AuthUser | null;
  onAuthed: (u: AuthUser) => void;
  onCreated: (r: LoadedReading) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [timeSource, setTimeSource] = useState<TimeSource | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!placeQuery.trim() || place?.label === placeQuery) return;
    timer.current = setTimeout(async () => {
      try {
        setResults((await api.geocode(placeQuery)).results);
      } catch (e) {
        setErr((e as Error).message);
      }
    }, 350);
  }, [placeQuery, place]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim() || !date || !time || !place) {
      setErr("Name, date, time, and place are required.");
      return;
    }
    if (!timeSource) {
      setErr("Say how the birth time is known — it sets how much weight the rising sign can carry.");
      return;
    }
    setBusy(true);
    try {
      if (!user) {
        if (!email.trim() || password.length < 8) {
          throw new Error("Add an email and password (at least 8 characters) to save the reading.");
        }
        onAuthed(await api.register(email, password, name.trim()));
      }
      const intake = {
        name: name.trim(),
        callName: name.trim().split(/\s+/)[0] || name.trim(),
        date,
        time,
        place,
        timeSource,
        utcOffsetOverride: null,
      } as Intake;
      onCreated(await api.create(intake));
      onClose();
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="reading-dialog-title"
      onClose={onClose}
      onCancel={onClose}
    >
      <form className="dialog__in" onSubmit={submit} noValidate>
        <div className="dialog__head">
          <h2 id="reading-dialog-title" className="dialog__title">
            Start a reading
          </h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="dialog__lede">A name, a birth moment and a place. The chart is cast from these four fields.</p>
        {err && (
          <div className="form-error" role="alert">
            {err}
          </div>
        )}
        <div className="field">
          <label htmlFor="f-name">
            Full name <span className="req">required</span>
          </label>
          <input id="f-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="f-date">
              Birth date <span className="req">required</span>
            </label>
            <input id="f-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="f-time">
              Birth time <span className="req">required</span>
            </label>
            <input id="f-time" className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <p className="field__help">It sets your rising sign, which changes about every two hours.</p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="f-place">
            Birth place <span className="req">required</span>
          </label>
          <input
            id="f-place"
            className="input"
            value={placeQuery}
            onChange={(e) => {
              setPlaceQuery(e.target.value);
              setPlace(null);
            }}
            autoComplete="off"
          />
          <p className="field__help">City, region, country. Pick a match from the list.</p>
          {results.length > 0 && !place && (
            <ul className="reading-list" style={{ marginTop: 8 }}>
              {results.slice(0, 5).map((p) => (
                <li key={p.label}>
                  <button
                    type="button"
                    className="reading-row"
                    style={{ width: "100%", textAlign: "left", cursor: "pointer", border: 0 }}
                    onClick={() => {
                      setPlace(p);
                      setPlaceQuery(p.label);
                      setResults([]);
                    }}
                  >
                    <span className="reading-row__name" style={{ fontSize: "var(--t-body)" }}>
                      {p.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: "var(--t-sm)", fontWeight: 500, marginBottom: 8 }}>
            How is the birth time known? <span className="req">required</span>
          </legend>
          <div className="choice" role="radiogroup" aria-label="How the birth time is known">
            {SOURCES.map((s) => (
              <label key={s.v}>
                <input
                  type="radio"
                  name="time-source"
                  value={s.v}
                  checked={timeSource === s.v}
                  onChange={() => setTimeSource(s.v)}
                />
                {s.label}
              </label>
            ))}
          </div>
          <p className="field__help">A certificate or hospital record carries more weight than a rounded figure or a guess.</p>
        </fieldset>
        {!user && (
          <div className="field-row">
            <div className="field">
              <label htmlFor="f-email">
                Email <span className="req">required</span>
              </label>
              <input
                id="f-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="f-pass">
                Password <span className="req">required</span>
              </label>
              <input
                id="f-pass"
                className="input"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
        )}
        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "Creating…" : "Create reading"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
