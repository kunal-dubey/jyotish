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
  /** Sync drafts so blur after auto-advance sees the just-typed digit (e.g. 10–12). */
  const hourDraft = useRef(hour);
  const minuteDraft = useRef(minute);
  const periodDraft = useRef(period);
  /** Which field the user is editing — skip parent→local sync while typing. */
  const focused = useRef<"hour" | "minute" | null>(null);

  useEffect(() => {
    if (focused.current) return;
    const p = parseTime(value);
    if (!p) {
      if (!value) {
        hourDraft.current = "";
        minuteDraft.current = "";
        setHour("");
        setMinute("");
      }
      return;
    }
    const t = to12(p.h24);
    hourDraft.current = String(t.h12);
    minuteDraft.current = pad(p.m);
    periodDraft.current = t.period;
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
    hourDraft.current = next;
    setHour(next);
    if (next.length === 2 && minuteDraft.current.length > 0) {
      commit(next, minuteDraft.current, periodDraft.current);
    }
    if (next.length === 2) {
      minuteRef.current?.focus();
      minuteRef.current?.select();
    }
  }

  function onMinuteChange(raw: string) {
    let next = digitsOnly(raw, 2);
    if (next.length === 2 && Number(next) > 59) next = next.slice(0, 1);
    minuteDraft.current = next;
    setMinute(next);
    if (hourDraft.current !== "" && next.length === 2) {
      commit(hourDraft.current, next, periodDraft.current);
    }
  }

  function blurHour() {
    focused.current = null;
    const hStr = hourDraft.current;
    if (hStr === "") {
      if (minuteDraft.current === "" && value) onChange("");
      return;
    }
    const h = Number(hStr);
    if (!Number.isFinite(h) || h < 1 || h > 12) {
      const fallback = parsed ? String(to12(parsed.h24).h12) : "";
      hourDraft.current = fallback;
      setHour(fallback);
      return;
    }
    const normalized = String(h);
    hourDraft.current = normalized;
    setHour(normalized);
    commit(normalized, minuteDraft.current, periodDraft.current);
  }

  function blurMinute() {
    focused.current = null;
    const mStr = minuteDraft.current;
    if (mStr === "") {
      if (hourDraft.current === "" && value) onChange("");
      return;
    }
    const m = Number(mStr);
    if (!Number.isFinite(m) || m > 59) {
      const fallback = parsed ? pad(parsed.m) : "";
      minuteDraft.current = fallback;
      setMinute(fallback);
      return;
    }
    const next = pad(m);
    minuteDraft.current = next;
    setMinute(next);
    commit(hourDraft.current, next, periodDraft.current);
  }

  function setMeridiem(next: "AM" | "PM") {
    periodDraft.current = next;
    setPeriod(next);
    commit(hourDraft.current, minuteDraft.current, next);
  }

  return (
    <div className="time-field" role="group" aria-label="Time of birth">
      <div className="time-field-row">
        <input
          ref={hourRef}
          className="time-field-digit"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="—"
          aria-label="Hour"
          value={hour}
          onFocus={() => {
            focused.current = "hour";
          }}
          onChange={(e) => onHourChange(e.target.value)}
          onBlur={blurHour}
        />
        <span className="time-field-colon" aria-hidden>
          :
        </span>
        <input
          ref={minuteRef}
          className="time-field-digit"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="—"
          aria-label="Minute"
          value={minute}
          onFocus={() => {
            focused.current = "minute";
          }}
          onChange={(e) => onMinuteChange(e.target.value)}
          onBlur={blurMinute}
        />
        <div className="choice time-field-period" role="radiogroup" aria-label="AM or PM">
          {(["AM", "PM"] as const).map((p) => (
            <label key={p}>
              <input
                type="radio"
                name="time-period"
                checked={period === p}
                onChange={() => setMeridiem(p)}
              />
              {p}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
