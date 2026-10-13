# Chart engine optimization benchmark

**Run date:** 2026-10-14  
**Script:** [`chart-service/scripts/bench_optimize.py`](../chart-service/scripts/bench_optimize.py)  
**Metric:** median of 3 wall-clock timings per case (local Windows / `uv run`)

## Headline

| | Baseline (old hot paths) | Current `compute_chart` | Speedup |
| --- | ---: | ---: | ---: |
| **Median** | **2674 ms** | **288 ms** | **9.29×** |

Chart-service CPU only. LLM past-check / reports latency is out of scope for this script (optimized separately via dual briefs and per-stage token knobs).

## What changed under the hood

| Area | Before | After |
| --- | --- | --- |
| Saturn / Jupiter ingresses | `step_days=2`, one long birth→horizon walk | Coarse step (Saturn ~10d, Jupiter ~5d) + bisect; past vs forward windows |
| Birth-time sensitivity | Linear 1-minute probes | Binary search on minutes |
| Model context | Single full `chart.text` dump (incl. forward periods) | `briefPast` (Gate B blind) + `briefForward` (Reports 3–6) |

## Method

For each birth profile the harness:

1. **Baseline** — recreate pre-optimization ingress (`step=2`, long windows) + linear sensitivity, plus a light natal/vimshottari pass so the work is comparable to the old hot path.
2. **Current** — call shipped `compute_chart()` (coarse ingresses, split windows, binary sensitivity, dual briefs).
3. Time each path **3 times**; report the **median**.
4. Assert correctness:
   - Lagna matches
   - Sensitivity “minutes survives” matches baseline vs current
   - `briefPast` has no `[future]` rows and includes the forward-withheld footer

## Results (2026-10-14)

| Case | Birth | Baseline | Current | Speedup | Saturn ingresses (old→new) | briefPast / briefForward | Full `text` |
| --- | --- | ---: | ---: | ---: | --- | --- | ---: |
| young_adult | 2000-03-21 Delhi | 2425 ms | 265 ms | 9.14× | 88 → 45 | 5371 / 4681 | 7994 |
| midlife | 1985-06-15 Indore | 2674 ms | 288 ms | 9.29× | 85 → 57 | 7491 / 4647 | 9582 |
| elder | 1955-11-02 Mumbai | 2947 ms | 394 ms | 7.49× | 84 → 81 | 9116 / 4608 | 11014 |

All correctness assertions passed.

## Reproduce

```bash
cd chart-service
uv run python scripts/bench_optimize.py
```

## Related product changes (not timed here)

- Past / reports stages consume `briefPast` / `briefForward` instead of the full dump
- Per-stage LLM `max_tokens` / effort; optional `ANTHROPIC_MODEL_PAST` / `_REPORTS`
- Skimmable report UI (`ReportDigest`); token cost hidden from the reading UI
- Smarter `TimeField` auto-advance; monotonic past-check progress bar
