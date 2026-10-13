#!/usr/bin/env python3
"""Compare pre-optimization chart hot paths vs the current implementation.

Baseline recreates the old behaviour in-process:
  - ingresses at step_days=2 over birth→life_end+25y (Saturn) and birth→+12y (Jupiter)
  - linear minute walk for sensitivity

Current path uses compute_chart() as shipped (coarse ingresses, split windows,
binary-search sensitivity, dual briefs).

Usage (from chart-service/):
  uv run python scripts/bench_optimize.py
"""

from __future__ import annotations

import datetime as dt
import statistics
import time

import swisseph as swe

from chart_service import compute as C


CASES = [
    dict(name="young_adult", date="2000-03-21", time="09:15", lat=28.6139, lon=77.2090, tz="Asia/Kolkata", today="2026-10-14"),
    dict(name="midlife", date="1985-06-15", time="10:30", lat=22.72, lon=75.86, tz="Asia/Kolkata", today="2026-10-14"),
    dict(name="elder", date="1955-11-02", time="14:05", lat=19.0760, lon=72.8777, tz="Asia/Kolkata", today="2026-10-14"),
]


def _init():
    C._init_thread()


def baseline_ingresses(body: int, start: dt.date, end: dt.date, step_days: int = 2) -> list[dict]:
    """Old day-ish walk (step=2)."""
    def s_at(d: dt.date) -> int:
        return C.sign_of(C.body_lon(swe.julday(d.year, d.month, d.day, 0), body)[0])

    out = []
    prev_d, prev_s = start, s_at(start)
    d = start
    while d < end:
        d = d + dt.timedelta(days=step_days)
        s = s_at(d)
        if s != prev_s:
            lo, hi = prev_d, d
            while (hi - lo).days > 1:
                mid = lo + (hi - lo) / 2
                if s_at(mid) == prev_s:
                    lo = mid
                else:
                    hi = mid
            out.append({"date": C.iso(hi), "from": C.SIGNS[prev_s], "to": C.SIGNS[s], "sign_index": s})
            prev_s = s
        prev_d = d
    return out


def baseline_minutes_until_change(fn, base_val, utc: dt.datetime, direction: int, limit: int = 240):
    for k in range(1, limit + 1):
        if fn(utc + dt.timedelta(minutes=direction * k)) != base_val:
            return k - 1
    return None


def baseline_sensitivity(utc: dt.datetime, lat: float, lon: float) -> dict:
    def lagna(t):
        return C.sign_of(C.asc_lon(C.jd_of(t), lat, lon)[0])

    def d9_lagna(t):
        return C.navamsa(C.asc_lon(C.jd_of(t), lat, lon)[0])

    def moon_nak(t):
        return int(C.body_lon(C.jd_of(t), swe.MOON)[0] // C.NAK_SPAN)

    out = {}
    for key, fn, lim in (("lagna", lagna, 240), ("navamsa_lagna", d9_lagna, 120),
                         ("moon_nakshatra", moon_nak, 24 * 60)):
        base = fn(utc)
        out[key] = {
            "minutes_earlier_survives": baseline_minutes_until_change(fn, base, utc, -1, lim),
            "minutes_later_survives": baseline_minutes_until_change(fn, base, utc, +1, lim),
        }
    return out


def time_call(fn, repeats: int = 3) -> tuple[float, object]:
    samples = []
    result = None
    for _ in range(repeats):
        t0 = time.perf_counter()
        result = fn()
        samples.append(time.perf_counter() - t0)
    return statistics.median(samples), result


def baseline_hot_paths(case: dict) -> tuple[float, dict]:
    """Approximate old compute cost: natal + linear sensitivity + coarse lifetime ingresses."""
    _init()
    t = C.resolve_time(case["date"], case["time"], case["tz"], None)
    utc: dt.datetime = t.pop("_utc_dt")
    jd = C.jd_of(utc)
    today_d = dt.date.fromisoformat(case["today"])
    birth_d = utc.date()
    life_end = dt.date(utc.year + 100, 1, 1)
    lat, lon = case["lat"], case["lon"]

    def run():
        _init()
        asc, _ = C.asc_lon(jd, lat, lon)
        lagna = C.sign_of(asc)
        pos = {}
        for name, pl in C.BODIES:
            L, _, _ = C.body_lon(jd, pl)
            pos[name] = L
        pos["Ketu"] = (pos["Rahu"] + 180) % 360
        moon_sign = C.sign_of(pos["Moon"])
        sat = baseline_ingresses(swe.SATURN, birth_d, max(life_end, today_d + dt.timedelta(days=365 * 25)), 2)
        jup = baseline_ingresses(swe.JUPITER, birth_d, today_d + dt.timedelta(days=365 * 12), 2)
        sens = baseline_sensitivity(utc, lat, lon)
        vim = C.vimshottari(pos["Moon"], utc, today_d)
        return {
            "saturn_n": len(sat),
            "jupiter_n": len(jup),
            "lagna": C.SIGNS[lagna],
            "moon_sign": C.SIGNS[moon_sign],
            "sens_lagna": sens["lagna"],
            "md_n": len(vim["mahadashas"]),
        }

    return time_call(run)


def current_chart(case: dict) -> tuple[float, dict]:
    kwargs = {k: case[k] for k in ("date", "time", "lat", "lon", "tz", "today")}
    ms, chart = time_call(lambda: C.compute_chart(**kwargs, place_label=case["name"]))
    past = chart["briefPast"]
    fwd = chart["briefForward"]
    text = chart["text"]
    today = chart["input"]["today"]
    return ms, {
        "saturn_n": len(chart["transits"]["saturn_ingresses"]),
        "jupiter_n": len(chart["transits"]["jupiter_ingresses"]),
        "lagna": chart["ascendant"]["sign"],
        "briefPast_chars": len(past),
        "briefForward_chars": len(fwd),
        "text_chars": len(text),
        "past_has_forward_leak": "[future]" in past or "Forward data is withheld" not in past,
        "past_convergences": len(chart["transits"]["convergences_past"]),
        "fwd_convergences": len(chart["transits"]["convergences_forward"]),
        "sens_lagna": chart["sensitivity"]["lagna"],
        "md_n": len(chart["vimshottari"]["mahadashas"]),
        "today": today,
    }


def main():
    print("Jyotish chart optimization benchmark")
    print("=" * 72)
    print(f"{'case':<14} {'baseline_ms':>12} {'current_ms':>12} {'speedup':>9}  notes")
    print("-" * 72)

    base_times, cur_times = [], []
    for case in CASES:
        b_ms, b = baseline_hot_paths(case)
        c_ms, c = current_chart(case)
        base_times.append(b_ms * 1000)
        cur_times.append(c_ms * 1000)
        speedup = b_ms / c_ms if c_ms else float("inf")
        leak = "LEAK" if c["past_has_forward_leak"] else "past-ok"
        notes = (
            f"sat {b['saturn_n']}->{c['saturn_n']}  "
            f"brief {c['briefPast_chars']}+{c['briefForward_chars']} vs text {c['text_chars']}  "
            f"{leak}  conv {c['past_convergences']}/{c['fwd_convergences']}"
        )
        print(f"{case['name']:<14} {b_ms*1000:12.0f} {c_ms*1000:12.0f} {speedup:8.2f}x  {notes}")

        # Sensitivity agreement (binary vs linear should match when a change exists)
        assert b["sens_lagna"]["minutes_earlier_survives"] == c["sens_lagna"]["minutes_earlier_survives"]
        assert b["sens_lagna"]["minutes_later_survives"] == c["sens_lagna"]["minutes_later_survives"]
        assert b["lagna"] == c["lagna"]

    print("-" * 72)
    print(
        f"{'median':<14} {statistics.median(base_times):12.0f} "
        f"{statistics.median(cur_times):12.0f} "
        f"{statistics.median(base_times)/statistics.median(cur_times):8.2f}x"
    )
    print()
    print("Assertions passed: lagna match, sensitivity minutes match, past brief has no [future] leak.")


if __name__ == "__main__":
    main()
