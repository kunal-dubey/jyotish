"""Sidereal (Lahiri) whole-sign natal computation.

Follows the reference script in jyotish-protocol-prompt.md, with two corrections:
- Antardashas of the birth mahadasha are laid out from the period's notional start
  (before birth) rather than squeezed into the remaining balance.
- Time-zone offsets come from the IANA database for the birth date, not a fixed number.
"""

from __future__ import annotations

import datetime as dt
import os
from zoneinfo import ZoneInfo

import swisseph as swe

SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio",
         "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
NAKS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya",
        "Ashlesha", "Magha", "P.Phalguni", "U.Phalguni", "Hasta", "Chitra", "Swati", "Vishakha",
        "Anuradha", "Jyeshtha", "Mula", "P.Ashadha", "U.Ashadha", "Shravana", "Dhanishta",
        "Shatabhisha", "P.Bhadra", "U.Bhadra", "Revati"]
LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
YEARS = {"Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7, "Rahu": 18,
         "Jupiter": 16, "Saturn": 19, "Mercury": 17}
SIGNLORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars",
            "Jupiter", "Saturn", "Saturn", "Jupiter"]
EXALT = {"Sun": (0, 10), "Moon": (1, 3), "Mars": (9, 28), "Mercury": (5, 15),
         "Jupiter": (3, 5), "Venus": (11, 27), "Saturn": (6, 20)}
COMBUST = {"Moon": 12, "Mars": 17, "Mercury": 14, "Jupiter": 11, "Venus": 10, "Saturn": 15}
ELEMENTS = ["Fire", "Earth", "Air", "Water"]
TITHIS = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami",
          "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"]
BODIES = [("Sun", swe.SUN), ("Moon", swe.MOON), ("Mars", swe.MARS), ("Mercury", swe.MERCURY),
          ("Jupiter", swe.JUPITER), ("Venus", swe.VENUS), ("Saturn", swe.SATURN),
          ("Rahu", swe.MEAN_NODE)]
YR = 365.25
NAK_SPAN = 360 / 27

FLG = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED


def _init_thread() -> None:
    """Swiss Ephemeris keeps sidereal mode and ephemeris path per thread, and the web
    server computes on worker threads, so set both at the start of every computation."""
    if os.environ.get("SE_EPHE_PATH"):
        swe.set_ephe_path(os.environ["SE_EPHE_PATH"])
    swe.set_sid_mode(swe.SIDM_LAHIRI, 0, 0)


# ---------- small helpers ----------

def sign_of(lon: float) -> int:
    return int(lon // 30) % 12


def dms(lon: float) -> str:
    total = round((lon % 30) * 3600)
    return f"{total // 3600}°{(total % 3600) // 60:02d}'{total % 60:02d}\""


def nak_of(lon: float) -> tuple[int, int]:
    n = int(lon // NAK_SPAN)
    pada = int((lon % NAK_SPAN) // (NAK_SPAN / 4)) + 1
    return n, pada


def navamsa(lon: float) -> int:
    return int(lon // (30 / 9)) % 12


def angdist(a: float, b: float) -> float:
    return abs((a - b + 180) % 360 - 180)


def jd_of(utc: dt.datetime) -> float:
    return swe.julday(utc.year, utc.month, utc.day,
                      utc.hour + utc.minute / 60 + utc.second / 3600)


def body_lon(jd: float, pl: int) -> tuple[float, float, int]:
    p, ret = swe.calc_ut(jd, pl, FLG)
    return p[0], p[3], ret


def asc_lon(jd: float, lat: float, lon: float) -> tuple[float, float]:
    _, ascmc = swe.houses_ex(jd, lat, lon, b"W", swe.FLG_SIDEREAL)
    return ascmc[0], ascmc[1]


def iso(d: dt.date | dt.datetime) -> str:
    return d.date().isoformat() if isinstance(d, dt.datetime) else d.isoformat()


# ---------- time zone ----------

def resolve_time(date: str, time: str, tz: str | None, offset_override: float | None) -> dict:
    """Turn local civil time into UTC, recording how the offset was obtained."""
    y, m, d = (int(x) for x in date.split("-"))
    parts = [int(x) for x in time.split(":")]
    hh, mm = parts[0], parts[1]
    ss = parts[2] if len(parts) > 2 else 0
    naive = dt.datetime(y, m, d, hh, mm, ss)
    notes: list[str] = []

    if offset_override is not None:
        offset_h = float(offset_override)
        source = "manual override"
        abbrev = None
    else:
        if not tz:
            raise ValueError("Either an IANA time zone or a manual UTC offset is required.")
        zone = ZoneInfo(tz)
        a = naive.replace(tzinfo=zone, fold=0)
        b = naive.replace(tzinfo=zone, fold=1)
        off_a, off_b = a.utcoffset(), b.utcoffset()
        roundtrip = a.astimezone(dt.timezone.utc).astimezone(zone).replace(tzinfo=None)
        if roundtrip != naive:
            notes.append(
                f"NONEXISTENT local time: clocks jumped forward over this moment ({off_a} -> {off_b}). "
                "The recorded time may be wrong, or read from a clock still on the old offset. "
                "Using the pre-change offset; confirm.")
        elif off_a != off_b:
            notes.append(
                f"AMBIGUOUS local time: clocks were set back around this moment, so it occurred "
                f"twice ({off_a} and {off_b}). Using the first; confirm which applies.")
        offset_h = off_a.total_seconds() / 3600
        abbrev = a.tzname()
        source = f"IANA tz database ({tz}, abbreviation {abbrev})"
        if abbrev == "LMT":
            notes.append("The database gives Local Mean Time for this date; standard time was "
                         "not yet in use. Check what clock the recorded time was read from.")
        elif off_a.total_seconds() % 900:
            notes.append(f"Historical mean-time offset ({abbrev}). Before standard zones, towns and "
                         "railways kept different clocks; confirm which one the recorded time used.")
        if a.dst():
            notes.append(f"Daylight/war time was in force (+{a.dst()}).")

    utc = naive - dt.timedelta(hours=offset_h)
    return {
        "local": naive.isoformat(),
        "utc": utc.isoformat() + "Z",
        "utc_offset_hours": offset_h,
        "utc_offset_str": _fmt_offset(offset_h),
        "tz": tz,
        "tz_abbrev": abbrev,
        "offset_source": source,
        "notes": notes,
        "_utc_dt": utc,
    }


def _fmt_offset(h: float) -> str:
    sign = "+" if h >= 0 else "-"
    total = round(abs(h) * 3600)
    return f"UTC{sign}{total // 3600:02d}:{(total % 3600) // 60:02d}" + (
        f":{total % 60:02d}" if total % 60 else "")


# ---------- sensitivity ----------

def _minutes_until_change(fn, base_val, utc: dt.datetime, direction: int, limit: int = 240) -> int | None:
    for k in range(1, limit + 1):
        if fn(utc + dt.timedelta(minutes=direction * k)) != base_val:
            return k - 1
    return None


def sensitivity(utc: dt.datetime, lat: float, lon: float) -> dict:
    def lagna(t):
        return sign_of(asc_lon(jd_of(t), lat, lon)[0])

    def d9_lagna(t):
        return navamsa(asc_lon(jd_of(t), lat, lon)[0])

    def moon_nak(t):
        return int(body_lon(jd_of(t), swe.MOON)[0] // NAK_SPAN)

    out = {}
    for key, fn, lim in (("lagna", lagna, 240), ("navamsa_lagna", d9_lagna, 120),
                         ("moon_nakshatra", moon_nak, 24 * 60)):
        base = fn(utc)
        out[key] = {
            "minutes_earlier_survives": _minutes_until_change(fn, base, utc, -1, lim),
            "minutes_later_survives": _minutes_until_change(fn, base, utc, +1, lim),
            "search_limit_minutes": lim,
        }
    table = []
    for dm in (-30, -20, -10, -4, 0, 4, 10, 20, 30):
        a = asc_lon(jd_of(utc + dt.timedelta(minutes=dm)), lat, lon)[0]
        table.append({"offset_min": dm, "sign": SIGNS[sign_of(a)], "deg": dms(a),
                      "navamsa": SIGNS[navamsa(a)]})
    out["table"] = table
    lg = out["lagna"]
    worst = min((x for x in (lg["minutes_earlier_survives"], lg["minutes_later_survives"])
                 if x is not None), default=lg["search_limit_minutes"])
    out["time_critical"] = worst < 10
    return out


# ---------- vimshottari ----------

def _subs(lord: str, start: dt.datetime, end: dt.datetime) -> list[tuple[str, dt.datetime, dt.datetime]]:
    order = LORDS[LORDS.index(lord):] + LORDS[:LORDS.index(lord)]
    total = (end - start).total_seconds()
    out, c = [], start
    for L in order:
        e = c + dt.timedelta(seconds=total * YEARS[L] / 120)
        out.append((L, c, e))
        c = e
    return out


def vimshottari(moon_lon: float, birth_utc: dt.datetime, today: dt.date) -> dict:
    nak_i = int(moon_lon // NAK_SPAN)
    lord = LORDS[nak_i % 9]
    frac = (moon_lon % NAK_SPAN) / NAK_SPAN
    balance = YEARS[lord] * (1 - frac)
    seq = LORDS[LORDS.index(lord):] + LORDS[:LORDS.index(lord)]

    # notional start of the birth mahadasha lies before birth
    t = birth_utc - dt.timedelta(days=YEARS[lord] * frac * YR)
    mds = []
    for L in seq + seq:
        end = t + dt.timedelta(days=YEARS[L] * YR)
        ads = []
        for L2, s2, e2 in _subs(L, t, end):
            if e2 <= birth_utc:
                continue
            ads.append({"lord": L2, "start": iso(max(s2, birth_utc)), "end": iso(e2),
                        "_s": s2, "_e": e2})
        mds.append({"lord": L, "start": iso(max(t, birth_utc)), "end": iso(end),
                    "notional_start": iso(t), "_s": t, "_e": end,
                    "age_start": round(max((t - birth_utc).days, 0) / YR, 2),
                    "age_end": round((end - birth_utc).days / YR, 2),
                    "antardashas": ads})
        t = end
        if (t - birth_utc).days / YR > 100:
            break

    now = dt.datetime.combine(today, dt.time(12))
    current = None
    for md in mds:
        if md["_s"] <= now < md["_e"]:
            for ad in md["antardashas"]:
                if ad["_s"] <= now < ad["_e"]:
                    pds = [{"lord": L3, "start": iso(s3), "end": iso(e3),
                            "now": s3 <= now < e3}
                           for L3, s3, e3 in _subs(ad["lord"], ad["_s"], ad["_e"])]
                    current = {"mahadasha": md["lord"], "md_start": md["start"], "md_end": md["end"],
                               "antardasha": ad["lord"], "ad_start": ad["start"], "ad_end": ad["end"],
                               "pratyantaras": pds,
                               "pratyantara": next((p["lord"] for p in pds if p["now"]), None)}
    for md in mds:
        md.pop("_s"), md.pop("_e")
        for ad in md["antardashas"]:
            ad.pop("_s"), ad.pop("_e")
            ad["status"] = "past" if ad["end"] <= today.isoformat() else (
                "future" if ad["start"] > today.isoformat() else "current")
        md["status"] = "past" if md["end"] <= today.isoformat() else (
            "future" if md["start"] > today.isoformat() else "current")

    return {
        "moon_nakshatra": NAKS[nak_i], "birth_lord": lord,
        "elapsed_pct": round(frac * 100, 3), "balance_years": round(balance, 4),
        "year_length_days": YR, "mahadashas": mds, "current": current,
    }


# ---------- transits ----------

def ingresses(body: int, start: dt.date, end: dt.date, step_days: int = 2) -> list[dict]:
    """Sign changes of a slow body between two dates, refined to the day."""
    def s_at(d: dt.date) -> int:
        return sign_of(body_lon(swe.julday(d.year, d.month, d.day, 0), body)[0])

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
            out.append({"date": iso(hi), "from": SIGNS[prev_s], "to": SIGNS[s], "sign_index": s})
            prev_s = s
        prev_d = d
    return out


def saturn_phases(ing: list[dict], moon_sign: int, start_sign: int, start: dt.date, end: dt.date) -> list[dict]:
    """Collapse Saturn ingresses into labelled spans relative to the natal Moon."""
    def tag(s: int) -> str | None:
        rel = (s - moon_sign) % 12
        return {11: "sade_sati", 0: "sade_sati", 1: "sade_sati", 7: "ashtama",
                3: "kantaka", 6: "kantaka", 9: "kantaka"}.get(rel)

    spans, cur_tag, cur_start = [], tag(start_sign), start
    for e in ing:
        t = tag(e["sign_index"])
        if t != cur_tag:
            if cur_tag:
                spans.append({"type": cur_tag, "start": iso(cur_start), "end": e["date"]})
            cur_tag, cur_start = t, dt.date.fromisoformat(e["date"])
    if cur_tag:
        spans.append({"type": cur_tag, "start": iso(cur_start), "end": None, "open_until_beyond": iso(end)})
    return spans


def transits_now(today: dt.date, moon_sign: int, lagna: int) -> list[dict]:
    jd = swe.julday(today.year, today.month, today.day, 6.0)
    out = []
    for n, pl in (("Saturn", swe.SATURN), ("Jupiter", swe.JUPITER), ("Rahu", swe.MEAN_NODE)):
        lon, speed, _ = body_lon(jd, pl)
        s = sign_of(lon)
        out.append({"body": n, "sign": SIGNS[s], "deg": dms(lon), "retro": speed < 0,
                    "house_from_moon": (s - moon_sign) % 12 + 1,
                    "house_from_lagna": (s - lagna) % 12 + 1})
    ks = (SIGNS.index(out[2]["sign"]) + 6) % 12
    out.append({"body": "Ketu", "sign": SIGNS[ks], "deg": out[2]["deg"], "retro": True,
                "house_from_moon": (ks - moon_sign) % 12 + 1,
                "house_from_lagna": (ks - lagna) % 12 + 1})
    return out


# ---------- dispositors ----------

def dispositors(sign_index: dict[str, int]) -> dict:
    chain = {p: SIGNLORD[s] for p, s in sign_index.items()}
    terminus: dict[str, str] = {}
    for p in sign_index:
        seen, cur = [], p
        while cur not in seen:
            seen.append(cur)
            cur = chain.get(cur, cur)
        cycle = seen[seen.index(cur):]
        terminus[p] = cur if len(cycle) == 1 else "cycle:" + "-".join(sorted(cycle))
    counts: dict[str, int] = {}
    for t in terminus.values():
        counts[t] = counts.get(t, 0) + 1
    return {"dispositor_of": chain, "terminus": terminus,
            "terminus_counts": dict(sorted(counts.items(), key=lambda x: -x[1]))}


# ---------- main entry ----------

def compute_chart(*, date: str, time: str, lat: float, lon: float, tz: str | None,
                  utc_offset_override: float | None = None, today: str | None = None,
                  place_label: str | None = None) -> dict:
    _init_thread()
    t = resolve_time(date, time, tz, utc_offset_override)
    utc: dt.datetime = t.pop("_utc_dt")
    jd = jd_of(utc)
    today_d = dt.date.fromisoformat(today) if today else dt.date.today()

    asc, mc = asc_lon(jd, lat, lon)
    lagna = sign_of(asc)
    ayan = swe.get_ayanamsa_ut(jd)

    planets, pos, sidx, ephe = [], {}, {}, set()
    for name, pl in BODIES:
        L, speed, ret = body_lon(jd, pl)
        if pl != swe.MEAN_NODE:
            ephe.add("Moshier (built-in analytic)" if ret & swe.FLG_MOSEPH else "Swiss Ephemeris files")
        pos[name], sidx[name] = L, sign_of(L)
        planets.append(_planet(name, L, speed, lagna))
    ketu = (pos["Rahu"] + 180) % 360
    pos["Ketu"], sidx["Ketu"] = ketu, sign_of(ketu)
    planets.append(_planet("Ketu", ketu, -1, lagna))

    true_node, _, _ = body_lon(jd, swe.TRUE_NODE)
    node = {"convention": "mean node",
            "mean": {"sign": SIGNS[sign_of(pos["Rahu"])], "deg": dms(pos["Rahu"]),
                     "nakshatra": NAKS[nak_of(pos["Rahu"])[0]], "pada": nak_of(pos["Rahu"])[1]},
            "true": {"sign": SIGNS[sign_of(true_node)], "deg": dms(true_node),
                     "nakshatra": NAKS[nak_of(true_node)[0]], "pada": nak_of(true_node)[1]}}
    node["padas_differ"] = (node["mean"]["nakshatra"], node["mean"]["pada"]) != (
        node["true"]["nakshatra"], node["true"]["pada"])
    node["signs_differ"] = node["mean"]["sign"] != node["true"]["sign"]

    houses = []
    for h in range(12):
        s = (lagna + h) % 12
        houses.append({"house": h + 1, "sign": SIGNS[s], "lord": SIGNLORD[s],
                       "occupants": [p["name"] for p in planets if p["sign_index"] == s]})
    rules = {}
    for h in houses:
        rules.setdefault(h["lord"], []).append(h["house"])
    yogakaraka = [p for p, hs in rules.items()
                  if (set(hs) & {4, 7, 10}) and (set(hs) & {5, 9})]

    combust = []
    for n, orb in COMBUST.items():
        d = angdist(pos[n], pos["Sun"])
        if d < orb:
            combust.append({"planet": n, "distance": round(d, 2), "orb": orb})
    conj = []
    ks = list(pos)
    for i in range(len(ks)):
        for j in range(i + 1, len(ks)):
            d = angdist(pos[ks[i]], pos[ks[j]])
            if d < 3:
                conj.append({"a": ks[i], "b": ks[j], "distance": round(d, 2)})

    sep = (pos["Moon"] - pos["Sun"]) % 360
    tnum = int(sep // 12) + 1
    if tnum == 15:
        tname = "Purnima"
    elif tnum == 30:
        tname = "Amavasya"
    else:
        tname = TITHIS[(tnum - 1) % 15]
    tithi = {"number": tnum, "name": tname, "paksha": "Shukla (waxing)" if tnum <= 15 else "Krishna (waning)",
             "raw": round(sep / 12, 3), "sun_moon_separation": round(sep, 2),
             "sun_from_moon_house": (sidx["Sun"] - sidx["Moon"]) % 12 + 1,
             "near_opposition": angdist(pos["Sun"], pos["Moon"]) > 165,
             "near_conjunction": angdist(pos["Sun"], pos["Moon"]) < 15}

    moon_sign = sidx["Moon"]
    life_end = dt.date(utc.year + 100, 1, 1)
    birth_d = utc.date()
    sat_ing = ingresses(swe.SATURN, birth_d, max(life_end, today_d + dt.timedelta(days=365 * 25)))
    jup_ing = ingresses(swe.JUPITER, birth_d, today_d + dt.timedelta(days=365 * 12))
    sat_spans = saturn_phases(sat_ing, moon_sign, sidx["Saturn"], birth_d, life_end)
    now_sat = next((s for s in sat_spans if s["start"] <= today_d.isoformat()
                    and (s["end"] is None or s["end"] > today_d.isoformat())), None)
    tr = transits_now(today_d, moon_sign, lagna)
    sat_rel = (SIGNS.index(tr[0]["sign"]) - moon_sign) % 12
    transit_status = {
        "sade_sati": sat_rel in (11, 0, 1),
        "sade_sati_phase": {11: "rising (Saturn 12th from Moon)", 0: "peak (Saturn over Moon)",
                            1: "setting (Saturn 2nd from Moon)"}.get(sat_rel),
        "ashtama_shani": sat_rel == 7,
        "kantaka_shani_from_moon": sat_rel in (3, 6, 9),
        "kantaka_shani_from_lagna": ((SIGNS.index(tr[0]["sign"]) - lagna) % 12) in (3, 6, 9),
        "current_saturn_span": now_sat,
        "next_sade_sati": next((s for s in sat_spans if s["type"] == "sade_sati"
                                and s["start"] > today_d.isoformat()), None),
    }

    vim = vimshottari(pos["Moon"], utc, today_d)
    sens = sensitivity(utc, lat, lon)

    chart = {
        "input": {"date": date, "time": time, "lat": lat, "lon": lon, "tz": tz,
                  "place": place_label, "today": today_d.isoformat()},
        "time": t,
        "settings": {"zodiac": "sidereal", "ayanamsa": "Lahiri", "houses": "whole sign",
                     "nodes": "mean", "ephemeris": sorted(ephe),
                     "ayanamsa_value": round(ayan, 4)},
        "ascendant": {"sign": SIGNS[lagna], "sign_index": lagna, "deg": dms(asc), "lon": round(asc, 4),
                      "nakshatra": NAKS[nak_of(asc)[0]], "pada": nak_of(asc)[1],
                      "navamsa": SIGNS[navamsa(asc)], "lord": SIGNLORD[lagna],
                      "element": ELEMENTS[lagna % 4]},
        "mc": {"sign": SIGNS[sign_of(mc)], "deg": dms(mc)},
        "navamsa_lagna": {"sign": SIGNS[navamsa(asc)], "lord": SIGNLORD[navamsa(asc)]},
        "planets": planets,
        "nodes": node,
        "houses": houses,
        "lordships": rules,
        "yogakaraka": yogakaraka,
        "combustion": combust,
        "conjunctions": conj,
        "dispositors": dispositors(sidx),
        "tithi": tithi,
        "sensitivity": sens,
        "vimshottari": vim,
        "transits": {"date": today_d.isoformat(), "bodies": tr, "status": transit_status,
                     "saturn_spans": sat_spans, "saturn_ingresses": sat_ing,
                     "jupiter_ingresses": jup_ing},
    }
    chart["text"] = render_text(chart)
    return chart


def _planet(name: str, L: float, speed: float, lagna: int) -> dict:
    s = sign_of(L)
    n, pada = nak_of(L)
    nav = navamsa(L)
    dignity = None
    if name in EXALT:
        es, _ = EXALT[name]
        if s == es:
            dignity = "exalted"
        elif s == (es + 6) % 12:
            dignity = "debilitated"
        elif SIGNLORD[s] == name:
            dignity = "own sign"
    return {"name": name, "lon": round(L, 4), "sign": SIGNS[s], "sign_index": s, "deg": dms(L),
            "nakshatra": NAKS[n], "nakshatra_lord": LORDS[n % 9], "pada": pada,
            "house": (s - lagna) % 12 + 1, "navamsa": SIGNS[nav],
            "vargottama": nav == s, "dignity": dignity,
            "retrograde": speed < 0 and name not in ("Rahu", "Ketu"),
            "sign_lord": SIGNLORD[s]}


def render_text(c: dict) -> str:
    """Compact plain-text rendering, the form handed to the language model."""
    L = []
    t, a = c["time"], c["ascendant"]
    L.append(f"BIRTH: local {t['local']} at {c['input'].get('place') or ''} "
             f"({c['input']['lat']:.4f}, {c['input']['lon']:.4f}); offset {t['utc_offset_str']} "
             f"from {t['offset_source']}; UTC {t['utc']}")
    for n in t["notes"]:
        L.append(f"  TIME NOTE: {n}")
    s = c["settings"]
    L.append(f"SETTINGS: Lahiri ayanamsa {s['ayanamsa_value']}, whole-sign houses, mean node, "
             f"ephemeris {', '.join(s['ephemeris'])}")
    L.append(f"ASC {a['sign']} {a['deg']} {a['nakshatra']} p{a['pada']} | D9 lagna {a['navamsa']} "
             f"| lagna lord {a['lord']} | MC {c['mc']['sign']} {c['mc']['deg']}")
    L.append("\nPLANETS:")
    for p in c["planets"]:
        flags = " ".join(x for x in [
            p["dignity"].upper() if p["dignity"] else "",
            "VARGOTTAMA" if p["vargottama"] else "", "R" if p["retrograde"] else ""] if x)
        L.append(f"  {p['name']:8s} {p['sign']:11s} {p['deg']:>11s} {p['nakshatra']} p{p['pada']} "
                 f"(nak lord {p['nakshatra_lord']})  H{p['house']}  D9:{p['navamsa']}  {flags}")
    nd = c["nodes"]
    L.append(f"  node check: mean {nd['mean']['nakshatra']} p{nd['mean']['pada']}, true "
             f"{nd['true']['nakshatra']} p{nd['true']['pada']}"
             + (" (PADAS DIFFER)" if nd["padas_differ"] else " (same pada)"))
    L.append("\nHOUSES (whole sign):")
    for h in c["houses"]:
        L.append(f"  H{h['house']:2d} {h['sign']:11s} lord {h['lord']:8s} occupants: "
                 f"{', '.join(h['occupants']) or '-'}")
    L.append("LORDSHIPS: " + "; ".join(f"{p} rules {','.join(map(str, hs))}"
                                       for p, hs in c["lordships"].items()))
    L.append("YOGAKARAKA (rules a kendra 4/7/10 and a trikona 5/9): " + (", ".join(c["yogakaraka"]) or "none"))
    L.append("COMBUSTION: " + ("; ".join(f"{x['planet']} {x['distance']}° from Sun (orb {x['orb']})"
                                         for x in c["combustion"]) or "none"))
    L.append("CONJUNCTIONS <3°: " + ("; ".join(f"{x['a']}-{x['b']} {x['distance']}°"
                                                  for x in c["conjunctions"]) or "none"))
    d = c["dispositors"]
    L.append("DISPOSITORS: " + "; ".join(f"{p}->{q}" for p, q in d["dispositor_of"].items()))
    L.append("  final dispositor tally: " + ", ".join(f"{k} x{v}" for k, v in d["terminus_counts"].items()))
    ti = c["tithi"]
    L.append(f"TITHI: {ti['number']} {ti['name']} ({ti['paksha']}), Sun-Moon separation "
             f"{ti['sun_moon_separation']}°, Sun is {ti['sun_from_moon_house']} from Moon")
    se = c["sensitivity"]
    lg, nl, mn = se["lagna"], se["navamsa_lagna"], se["moon_nakshatra"]
    L.append(f"\nBIRTH-TIME SENSITIVITY: lagna survives {lg['minutes_earlier_survives']} min earlier / "
             f"{lg['minutes_later_survives']} min later"
             + ("  ** TIME-CRITICAL **" if se["time_critical"] else ""))
    L.append(f"  navamsa lagna survives {nl['minutes_earlier_survives']} min earlier / "
             f"{nl['minutes_later_survives']} min later; Moon nakshatra survives "
             f"{mn['minutes_earlier_survives']} / {mn['minutes_later_survives']} min")
    for r in se["table"]:
        L.append(f"  {r['offset_min']:+3d} min: {r['sign']:11s} {r['deg']}  D9 {r['navamsa']}")
    v = c["vimshottari"]
    L.append(f"\nVIMSHOTTARI: Moon in {v['moon_nakshatra']}, birth lord {v['birth_lord']}, "
             f"{v['elapsed_pct']}% elapsed, balance {v['balance_years']} yr (365.25-day years)")
    for md in v["mahadashas"]:
        L.append(f"  {md['lord']:8s} {md['start']} -> {md['end']}  age {md['age_start']}-{md['age_end']}"
                 f"  [{md['status']}]")
        if md["status"] != "future" or md is next((m for m in v["mahadashas"] if m["status"] == "future"), None):
            for ad in md["antardashas"]:
                L.append(f"      {md['lord']}-{ad['lord']:8s} {ad['start']} -> {ad['end']}  [{ad['status']}]")
    cur = v["current"]
    if cur:
        L.append(f"CURRENT: {cur['mahadasha']} MD / {cur['antardasha']} AD ({cur['ad_start']} -> "
                 f"{cur['ad_end']}) / {cur['pratyantara']} PD")
        for p in cur["pratyantaras"]:
            L.append(f"      PD {p['lord']:8s} {p['start']} -> {p['end']}" + ("  <== NOW" if p["now"] else ""))
    tr = c["transits"]
    L.append(f"\nTRANSITS on {tr['date']}:")
    for b in tr["bodies"]:
        L.append(f"  {b['body']:8s} {b['sign']:11s} {b['deg']}{' R' if b['retro'] and b['body'] not in ('Rahu', 'Ketu') else ''}"
                 f"  {b['house_from_moon']} from Moon, {b['house_from_lagna']} from lagna")
    st = tr["status"]
    L.append(f"  sade sati: {'YES, ' + st['sade_sati_phase'] if st['sade_sati'] else 'no'}; "
             f"ashtama: {'yes' if st['ashtama_shani'] else 'no'}; kantaka from Moon: "
             f"{'yes' if st['kantaka_shani_from_moon'] else 'no'}; kantaka from lagna: "
             f"{'yes' if st['kantaka_shani_from_lagna'] else 'no'}")
    L.append("SATURN SPANS relative to natal Moon (lifetime):")
    for sp in tr["saturn_spans"]:
        L.append(f"  {sp['type']:10s} {sp['start']} -> {sp['end'] or 'beyond'}")
    horizon = str(int(tr["date"][:4]) + 15)
    L.append("SATURN INGRESSES (birth to +15 years):")
    L.append("  " + "; ".join(f"{x['date']} {x['to']}" for x in tr["saturn_ingresses"] if x["date"] < horizon))
    L.append("JUPITER INGRESSES:")
    L.append("  " + "; ".join(f"{x['date']} {x['to']}" for x in tr["jupiter_ingresses"]))
    return "\n".join(L)
