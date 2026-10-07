import datetime as dt
from concurrent.futures import ThreadPoolExecutor

from chart_service.compute import compute_chart

BASE = dict(date="1995-01-16", time="13:55", lat=22.7167, lon=75.85, tz="Asia/Kolkata", today="2026-10-07")


def test_lahiri_holds_on_worker_threads():
    # Swiss Ephemeris sidereal mode is thread-local; the server computes on worker threads.
    with ThreadPoolExecutor(max_workers=2) as ex:
        charts = list(ex.map(lambda _: compute_chart(**BASE), range(2)))
    for c in charts:
        assert abs(c["settings"]["ayanamsa_value"] - 23.7878) < 0.001
        assert c["ascendant"]["sign"] == "Taurus"


def test_reference_chart_matches_prompt_example():
    c = compute_chart(**BASE)
    assert c["yogakaraka"] == ["Saturn"]
    assert c["vimshottari"]["birth_lord"] == "Jupiter"
    cur = c["vimshottari"]["current"]
    assert (cur["mahadasha"], cur["antardasha"]) == ("Mercury", "Venus")


def test_mahadashas_total_120_years():
    c = compute_chart(**BASE)
    mds = c["vimshottari"]["mahadashas"]
    first, last9 = mds[0], mds[8]
    span = dt.date.fromisoformat(last9["end"]) - dt.date.fromisoformat(first["notional_start"])
    assert abs(span.days / 365.25 - 120) < 0.01


def test_antardashas_tile_each_mahadasha():
    for md in compute_chart(**BASE)["vimshottari"]["mahadashas"]:
        ads = md["antardashas"]
        assert ads[0]["start"] == md["start"] and ads[-1]["end"] == md["end"]
        for a, b in zip(ads, ads[1:]):
            assert a["end"] == b["start"]


def test_wartime_and_dst_offsets():
    war = compute_chart(**{**BASE, "date": "1943-03-10", "time": "08:00"})
    assert war["time"]["utc_offset_hours"] == 6.5
    gap = compute_chart(**{**BASE, "date": "2021-03-28", "time": "01:30", "tz": "Europe/London", "lat": 51.5, "lon": -0.12})
    assert any("NONEXISTENT" in n for n in gap["time"]["notes"])
    fold = compute_chart(**{**BASE, "date": "2021-10-31", "time": "01:30", "tz": "Europe/London", "lat": 51.5, "lon": -0.12})
    assert any("AMBIGUOUS" in n for n in fold["time"]["notes"])
