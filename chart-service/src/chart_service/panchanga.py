"""Stage 7 — Panchanga & Dagdha Rashi (deterministic)."""

from __future__ import annotations

import datetime as dt

SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio",
         "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
NAKS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya",
        "Ashlesha", "Magha", "P.Phalguni", "U.Phalguni", "Hasta", "Chitra", "Swati", "Vishakha",
        "Anuradha", "Jyeshtha", "Mula", "P.Ashadha", "U.Ashadha", "Shravana", "Dhanishta",
        "Shatabhisha", "P.Bhadra", "U.Bhadra", "Revati"]
LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
TITHIS = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami",
          "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"]
YOGAS = [
    "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti",
    "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata",
    "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
]
# Movable karanas cycle; special ones at ends handled separately
KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Garija", "Vanija", "Vishti"]
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Dagdha rashi sign indices by tithi number 1–30 (Purnima/Amavasya empty).
# Classical list used by many North-Indian panchangas.
_DAGDHA: dict[int, list[int]] = {
    1: [6], 2: [8], 3: [9], 4: [11], 5: [0], 6: [1], 7: [2], 8: [3],
    9: [4], 10: [5], 11: [6], 12: [7], 13: [8], 14: [9],
    15: [], 16: [6], 17: [8], 18: [9], 19: [11], 20: [0], 21: [1], 22: [2],
    23: [3], 24: [4], 25: [5], 26: [6], 27: [7], 28: [8], 29: [9], 30: [],
}

NAK_SPAN = 360 / 27


def build_panchanga(
    *,
    sun_lon: float,
    moon_lon: float,
    birth_local_date: dt.date,
    planet_signs: dict[str, int],
) -> dict:
    sep = (moon_lon - sun_lon) % 360
    tnum = int(sep // 12) + 1
    if tnum > 30:
        tnum = 30
    if tnum == 15:
        tname = "Purnima"
    elif tnum == 30:
        tname = "Amavasya"
    else:
        tname = TITHIS[(tnum - 1) % 15]

    n = int(moon_lon // NAK_SPAN) % 27
    pada = int((moon_lon % NAK_SPAN) // (NAK_SPAN / 4)) + 1

    yoga_raw = (sun_lon + moon_lon) % 360
    ynum = int(yoga_raw // NAK_SPAN) % 27

    # Karana = half-tithi; 60 karanas in a lunar month
    karana_index = int(sep // 6) % 60
    if karana_index == 0:
        karana_name = "Kimstughna"
    elif karana_index >= 57:
        karana_name = ["Shakuni", "Chatushpada", "Naga"][karana_index - 57]
    else:
        karana_name = KARANAS[(karana_index - 1) % 7]

    # Vara from local civil weekday (Monday=0 in date.weekday())
    w = birth_local_date.weekday()
    # Align WEEKDAYS list: Monday=0
    vara_name = WEEKDAYS[w]

    dagdha_idx = _DAGDHA.get(tnum, [])
    dagdha_signs = [SIGNS[i] for i in dagdha_idx]
    affected = [name for name, si in planet_signs.items() if si in dagdha_idx]

    return {
        "tithi": {
            "number": tnum,
            "name": tname,
            "paksha": "Shukla (waxing)" if tnum <= 15 else "Krishna (waning)",
            "sun_moon_separation": round(sep, 2),
            "raw": round(sep / 12, 3),
        },
        "nakshatra": {
            "name": NAKS[n],
            "lord": LORDS[n % 9],
            "pada": pada,
            "index": n,
        },
        "yoga": {"number": ynum + 1, "name": YOGAS[ynum]},
        "karana": {"name": karana_name, "index": karana_index},
        "vara": {"weekday": vara_name, "index": w},
        "dagdha_rashi": {"signs": dagdha_signs, "planets_affected": affected},
    }
