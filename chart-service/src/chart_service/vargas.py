"""Shodashavarga positional dispatcher (Stage 3 — positional only)."""

from __future__ import annotations

SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio",
         "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
SIGNLORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars",
            "Jupiter", "Saturn", "Saturn", "Jupiter"]
EXALT = {"Sun": 0, "Moon": 1, "Mars": 9, "Mercury": 5, "Jupiter": 3, "Venus": 11, "Saturn": 6}

# D30 Trimshamsha: (end_degree_exclusive_or_equal_boundary, ruler_sign_index for odd; even reverses)
# Odd signs: 0–5 Mars, 5–10 Saturn, 10–18 Jupiter, 18–25 Mercury, 25–30 Venus
_D30_ODD = [(5, 0), (10, 9), (18, 8), (25, 5), (30, 1)]  # Mars Aries, Saturn Cap, Jup Sag, Merc Virgo, Venus Taurus
_D30_EVEN = [(5, 1), (10, 5), (18, 8), (25, 9), (30, 0)]  # Venus Taurus, Merc Virgo, Jup Sag, Sat Cap, Mars Aries


def sign_of(lon: float) -> int:
    return int(lon // 30) % 12


def _deg_in_sign(lon: float) -> float:
    return lon % 30


def _dignity(name: str, sign: int) -> str | None:
    if name not in EXALT:
        return "own sign" if SIGNLORD[sign] == name else None
    es = EXALT[name]
    if sign == es:
        return "exalted"
    if sign == (es + 6) % 12:
        return "debilitated"
    if SIGNLORD[sign] == name:
        return "own sign"
    return None


def varga_sign(lon: float, key: str) -> int:
    """Return sign index 0–11 for the given divisional chart key (d1, d2, …)."""
    s = sign_of(lon)
    d = _deg_in_sign(lon)
    # Classical odd/even: Aries, Gemini, Leo… are odd (sign numbers 1,3,5 → index 0,2,4)
    classical_odd = (s % 2 == 0)

    if key == "d1":
        return s

    if key == "d2":  # Hora — only Cancer (3) or Leo (4)
        first_half = d < 15
        if classical_odd:
            return 4 if first_half else 3  # Leo / Cancer
        return 3 if first_half else 4

    if key == "d3":  # Drekkana — 1st/5th/9th from sign
        part = int(d // 10)
        return (s + part * 4) % 12

    if key == "d4":  # Chaturthamsha — 1/4/7/10 from sign
        part = int(d // 7.5)
        return (s + part * 3) % 12

    if key == "d7":  # Saptamsha
        part = int(d // (30 / 7))
        base = s if classical_odd else (s + 6) % 12
        return (base + part) % 12

    if key == "d9":  # Navamsha
        return int(lon // (30 / 9)) % 12

    if key == "d10":  # Dashamsha
        part = int(d // 3)
        base = s if classical_odd else (s + 8) % 12  # even from 9th
        return (base + part) % 12

    if key == "d12":  # Dwadamsha
        part = int(d // 2.5)
        return (s + part) % 12

    if key == "d16":  # Shodashamsha — movable→Aries, fixed→Leo, dual→Sag
        part = int(d // (30 / 16))
        modality = s % 3  # 0 movable, 1 fixed, 2 dual
        base = [0, 4, 8][modality]
        return (base + part) % 12

    if key == "d20":  # Vishamsha — mov→Aries, fix→Sag, dual→Leo
        part = int(d // 1.5)
        modality = s % 3
        base = [0, 8, 4][modality]
        return (base + part) % 12

    if key == "d24":  # Chaturvimshamsha — odd from Leo, even from Cancer
        part = int(d // 1.25)
        base = 4 if classical_odd else 3
        return (base + part) % 12

    if key == "d27":  # Saptavimshamsha — element anchor
        part = int(d // (30 / 27))
        element = s % 4  # fire 0, earth 1, air 2, water 3
        base = [0, 3, 6, 9][element]  # Aries, Cancer, Libra, Capricorn
        return (base + part) % 12

    if key == "d30":  # Trimshamsha unequal
        table = _D30_ODD if classical_odd else _D30_EVEN
        for end, ruler_sign in table:
            if d < end or (end == 30 and d <= 30):
                return ruler_sign
        return table[-1][1]

    if key == "d40":  # Khavedamsha — odd from Aries, even from Libra
        part = int(d // 0.75)
        base = 0 if classical_odd else 6
        return (base + part) % 12

    if key == "d45":  # Akshavedamsha — same anchors as D16 family
        part = int(d // (30 / 45))
        modality = s % 3
        base = [0, 4, 8][modality]
        return (base + part) % 12

    if key == "d60":  # Shashtiamsha
        part = int(d // 0.5)
        return (s + part) % 12

    raise ValueError(f"Unknown varga {key}")


FREE_VARGAS = ["d1", "d2", "d3", "d4", "d7", "d9", "d10", "d12", "d16", "d20", "d24", "d27", "d30"]
ALL_VARGAS = FREE_VARGAS + ["d40", "d45", "d60"]


def build_vargas(pos: dict[str, float], asc_lon: float) -> dict:
    """Positional varga tables for free (D1–D30) and fine (D40–D60) charts."""
    out: dict = {}
    for key in ALL_VARGAS:
        lagna_i = varga_sign(asc_lon, key)
        planets = []
        for name, L in pos.items():
            si = varga_sign(L, key)
            planets.append({
                "name": name,
                "sign": SIGNS[si],
                "sign_index": si,
                "dignity": _dignity(name, si),
            })
        out[key] = {
            "lagna": SIGNS[lagna_i],
            "lagna_lord": SIGNLORD[lagna_i],
            "planets": planets,
        }
    return out
