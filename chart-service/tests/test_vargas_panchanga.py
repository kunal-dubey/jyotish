"""Smoke tests for Stage 3 vargas and Stage 7 panchanga."""

from chart_service.compute import compute_chart
from chart_service.vargas import varga_sign


def test_navamsa_matches_d9_helper():
    # 15° Aries → 5th navamsa of Aries → Leo (index 4)
    assert varga_sign(15.0, "d9") == 4


def test_hora_only_cancer_or_leo():
    for lon in (2.0, 14.0, 16.0, 29.0, 32.0, 45.0):
        s = varga_sign(lon, "d2")
        assert s in (3, 4), lon


def test_chart_includes_panchanga_and_vargas():
    # Reference-ish birth used elsewhere in the suite family
    c = compute_chart(
        date="1990-06-15",
        time="14:30",
        lat=28.6139,
        lon=77.209,
        tz="Asia/Kolkata",
        place_label="New Delhi",
    )
    assert "panchanga" in c
    assert c["panchanga"]["tithi"]["name"]
    assert c["panchanga"]["yoga"]["name"]
    assert c["panchanga"]["karana"]["name"]
    assert c["panchanga"]["vara"]["weekday"]
    assert "vargas" in c
    for key in ("d1", "d2", "d9", "d10", "d30", "d60"):
        assert key in c["vargas"]
        assert len(c["vargas"][key]["planets"]) >= 9
        assert c["vargas"][key]["lagna"]
