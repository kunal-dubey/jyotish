"use client";
import { useEffect, useRef, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseTime(value: string): { h24: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h24 = Number(match[1]);
  const m = Number(match[2]);
  if (h24 > 23 || m > 59) return null;
  return { h24, m };
}

function to12(h24: number): { h12: number; period: "AM" | "PM" } {
  return {
    period: h24 >= 12 ? "PM" : "AM",
    h12: h24 % 12 === 0 ? 12 : h24 % 12,
  };
}

function from12(h12: number, period: "AM" | "PM"): number {
  const h = Math.min(12, Math.max(1, h12));
  if (period === "AM") return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

/** Hour is complete when two digits are typed, or a single digit 2–9 (can't start 13–19). */
function hourComplete(digits: string): boolean {
  if (digits.length >= 2) return true;
  if (digits.length === 1) {
    const d = Number(digits);
    return d >= 2 && d <= 9;
  }
  return false;
}

/** Minute is complete at two digits, or a first digit 6–9 (can't be 60+). */
function minuteComplete(digits: string): boolean {
  if (digits.length >= 2) return true;
  if (digits.length === 1) {
    const d = Number(digits);
    return d >= 6 && d <= 9;
  }
  return false;
}

export default function TimeField({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const parsed = parseTime(value);
  const initial = parsed ? to12(parsed.h24) : { h12: 0, period: "AM" as const };
  const [hour, setHour] = useState(parsed ? String(initial.h12) : "");
  const [minute, setMinute] = useState(parsed ? pad(parsed.m) : "");
  const [period, setPeriod] = useState<"AM" | "PM">(parsed ? initial.period : "AM");
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);
  const periodRef = useRef<HTMLSelectElement>(null);
  const syncing = useRef(false);

  useEffect(() => {
    const p = parseTime(value);
    if (!p) {
      if (!value) {
        setHour("");
        setMinute("");
      }
      return;
    }
    syncing.current = true;
    const t = to12(p.h24);
    setHour(String(t.h12));
    setMinute(pad(p.m));
    setPeriod(t.period);
    queueMicrotask(() => {
      syncing.current = false;
    });
  }, [value]);

  useEffect(() => {
    if (autoFocus) hourRef.current?.focus();
  }, [autoFocus]);

  function commit(hStr: string, mStr: string, per: "AM" | "PM") {
    if (hStr === "" || mStr === "") {
      if (value) onChange("");
      return;
    }
    const h12 = Number(hStr);
    const m = Number(mStr);
    if (!Number.isFinite(h12) || !Number.isFinite(m) || h12 < 1 || h12 > 12 || m > 59) return;
    onChange(`${pad(from12(h12, per))}:${pad(m)}`);
  }

  function onHourChange(raw: string) {
    const next = raw.replace(/\D/g, "").slice(0, 2);
    // Reject impossible two-digit hours > 12
    if (next.length === 2 && Number(next) > 12) {
      const clamped = next.slice(0, 1);
      setHour(clamped);
      if (hourComplete(clamped)) {
        minuteRef.current?.focus();
        minuteRef.current?.select();
      }
      return;
    }
    setHour(next);
    if (minute) commit(next, minute, period);
    if (hourComplete(next)) {
      minuteRef.current?.focus();
      minuteRef.current?.select();
    }
  }

  function onMinuteChange(raw: string) {
    const next = raw.replace(/\D/g, "").slice(0, 2);
    if (next.length === 2 && Number(next) > 59) {
      const clamped = next.slice(0, 1);
      setMinute(clamped);
      if (minuteComplete(clamped)) {
        periodRef.current?.focus();
      }
      return;
    }
    setMinute(next);
    if (hour) commit(hour, next, period);
    if (minuteComplete(next)) {
      periodRef.current?.focus();
    }
  }

  return (
    <div className="time-simple">
      <div className="time-simple-row">
        <label className="time-simple-unit">
          <span className="time-simple-label">Hour</span>
          <input
            ref={hourRef}
            className="time-simple-input"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="5"
            value={hour}
            onChange={(e) => onHourChange(e.target.value)}
            onBlur={() => {
              if (syncing.current || hour === "") return;
              const h = Number(hour);
              if (!Number.isFinite(h) || h < 1 || h > 12) {
                setHour(parsed ? String(to12(parsed.h24).h12) : "");
                return;
              }
              setHour(String(h));
              commit(String(h), minute, period);
            }}
          />
          <span className="time-simple-hint">1–12</span>
        </label>

        <span className="time-simple-colon" aria-hidden>
          :
        </span>

        <label className="time-simple-unit">
          <span className="time-simple-label">Minute</span>
          <input
            ref={minuteRef}
            className="time-simple-input"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="35"
            value={minute}
            onChange={(e) => onMinuteChange(e.target.value)}
            onBlur={() => {
              if (syncing.current || minute === "") return;
              const m = Number(minute);
              if (!Number.isFinite(m) || m > 59) {
                setMinute(parsed ? pad(parsed.m) : "");
                return;
              }
              const next = pad(m);
              setMinute(next);
              commit(hour, next, period);
            }}
          />
          <span className="time-simple-hint">0–59</span>
        </label>

        <label className="time-simple-unit time-simple-period">
          <span className="time-simple-label">AM / PM</span>
          <select
            ref={periodRef}
            className="time-simple-select"
            value={period}
            aria-label="AM or PM"
            onChange={(e) => {
              const next = e.target.value === "PM" ? "PM" : "AM";
              setPeriod(next);
              commit(hour, minute, next);
            }}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
          <span className="time-simple-hint">required</span>
        </label>
      </div>
      <p className="time-simple-note muted">
        Local clock. The colon separates hour from minute
        {parsed ? ` · saved as ${pad(parsed.h24)}:${pad(parsed.m)}` : ""}.
      </p>
    </div>
  );
}
