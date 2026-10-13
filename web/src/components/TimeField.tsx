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

function digitsOnly(raw: string, max: number) {
  return raw.replace(/\D/g, "").slice(0, max);
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
  /** Which field the user is editing — skip parent→local sync while typing. */
  const focused = useRef<"hour" | "minute" | null>(null);

  // Sync from parent only when neither field is being typed into.
  useEffect(() => {
    if (focused.current) return;
    const p = parseTime(value);
    if (!p) {
      if (!value) {
        setHour("");
        setMinute("");
      }
      return;
    }
    const t = to12(p.h24);
    setHour(String(t.h12));
    setMinute(pad(p.m));
    setPeriod(t.period);
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
    const next = `${pad(from12(h12, per))}:${pad(m)}`;
    if (next !== value) onChange(next);
  }

  function onHourChange(raw: string) {
    let next = digitsOnly(raw, 2);
    if (next.length === 2 && Number(next) > 12) next = next.slice(0, 1);
    if (next.length === 1 && next === "0") next = "";
    setHour(next);
    // Only commit once both parts look complete — never rewrite minutes while typing hour.
    if (next.length === 2 && minute.length > 0) commit(next, minute, period);
    if (next.length === 2) {
      minuteRef.current?.focus();
      minuteRef.current?.select();
    }
  }

  function onMinuteChange(raw: string) {
    let next = digitsOnly(raw, 2);
    if (next.length === 2 && Number(next) > 59) next = next.slice(0, 1);
    setMinute(next);
    // Commit with unpadded digits; pad only on blur so "3"+"5" can become "35".
    if (hour !== "" && next.length === 2) commit(hour, next, period);
    if (next.length === 2) periodRef.current?.focus();
  }

  function blurHour() {
    focused.current = null;
    if (hour === "") {
      if (minute === "" && value) onChange("");
      return;
    }
    const h = Number(hour);
    if (!Number.isFinite(h) || h < 1 || h > 12) {
      setHour(parsed ? String(to12(parsed.h24).h12) : "");
      return;
    }
    setHour(String(h));
    commit(String(h), minute, period);
  }

  function blurMinute() {
    focused.current = null;
    if (minute === "") {
      if (hour === "" && value) onChange("");
      return;
    }
    const m = Number(minute);
    if (!Number.isFinite(m) || m > 59) {
      setMinute(parsed ? pad(parsed.m) : "");
      return;
    }
    const next = pad(m);
    setMinute(next);
    commit(hour, next, period);
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
            onFocus={() => {
              focused.current = "hour";
            }}
            onChange={(e) => onHourChange(e.target.value)}
            onBlur={blurHour}
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
            onFocus={() => {
              focused.current = "minute";
            }}
            onChange={(e) => onMinuteChange(e.target.value)}
            onBlur={blurMinute}
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
        Local clock. Type hour then minutes
        {parsed ? ` · saved as ${pad(parsed.h24)}:${pad(parsed.m)}` : ""}.
      </p>
    </div>
  );
}
