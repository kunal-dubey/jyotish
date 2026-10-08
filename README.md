# Jyotish Protocol

An app version of `prompts/jyotish-protocol-prompt.md`. It runs the staged analysis with both hard stops enforced in code, and produces a downloadable living-protocol HTML file.

## Run it

Requires Node 20+, [uv](https://docs.astral.sh/uv/), MongoDB on `:27017`, and an LLM key ([OpenRouter](https://openrouter.ai/) or Anthropic).

If you do not already have MongoDB running locally:

```bash
docker run -d --name jyotish-mongo -p 27017:27017 --restart unless-stopped mongo:7
```

```bash
npm install
npm run setup
cp web/.env.example web/.env.local   # OPENROUTER_API_KEY (or ANTHROPIC_API_KEY), MONGODB_URI, AUTH_SECRET
npm run dev                          # chart service on :8765, app on :3000
```

Open http://localhost:3000, register an account, then begin a reading.

For OpenRouter, set `OPENROUTER_API_KEY=sk-or-...` and `ANTHROPIC_MODEL=anthropic/claude-opus-5.5`. That routes the existing Anthropic SDK through OpenRouter’s Messages API. Direct Anthropic still works via `ANTHROPIC_API_KEY` instead.

Default `MONGODB_URI` is `mongodb://127.0.0.1:27017/jyotish`. When shipping, point the same variable at an Atlas cluster; no code change.

## How it is put together

```
chart-service/   Python, FastAPI + pyswisseph. Computes everything numeric.
web/             Next.js. Auth, UI, stage gating, Claude calls, protocol builder.
prompts/         The original prompt document.
```

**Code computes, the model writes.** The chart service does what the prompt's Stage 1 script did, plus:

- Historical UTC offsets from the IANA database for the birth date (war time, daylight saving, pre-standard mean time), with warnings for ambiguous or nonexistent local times.
- Minutes of birth-time error the lagna, navamsa lagna and Moon nakshatra each survive.
- Antardashas of the birth mahadasha laid out from its notional start before birth. The prompt's script squeezed them into the remaining balance, which shifts every sub-period date in that first period.
- Lifetime Saturn spans relative to the natal Moon (sade sati, ashtama, kantaka), so the past-check can cite transit convergences.
- Dispositor chains and a final-dispositor tally for the chart's centre of gravity.

**Accounts and storage.** Email/password auth (JWT cookie). Each reading is owned by a user in MongoDB (`users`, `readings`), including intake, chart, hard-stop scores, and every stage output. Reloading reuses stored data; Claude runs only when a stage is missing or the user regenerates. Old `web/data/readings/*.json` files are unused (no migration).

**Stages and stops.**

| App section | Prompt stage | Gate |
| --- | --- | --- |
| The chart | 0, 1 | none |
| Foundation and past-check | 2, Reports 1 and 2 | birth data confirmed (Hard Stop 1) |
| Reports 3 to 6 | Reports 3 to 6 | every claim scored (Hard Stop 2) |
| Guidance | 4 | Reports 3 to 6 exist |
| Living protocol | 5 | guidance exists |

The server refuses out-of-order stages. Optional intake context (occupation, practice, question) is withheld from the model until the score is submitted, so the past-check is blind in practice.

Each stage is one streamed call to `claude-opus-5-5` with adaptive thinking at high effort and the server-side refusal fallback (`fallbacks: "default"`). The system prompt holds the epistemic contract and the voice rules, and the chart block is prompt-cached across stages. Report 2's numbered claims (`- **C1** · *period* · claim`) are parsed into the scoring form.

**The protocol file.** Claude returns structured JSON (day briefs, seasons, counsel, remedies, ledger, glossary, palette and fonts). `web/src/lib/protocolHtml.ts` pours it into a self-contained page whose JavaScript computes the weekday, the mahadasha, antardasha and pratyantara, the season, and the sade sati countdown from the device's date each time it opens. Colours are contrast-checked in code. The ledger persists to `window.storage` or `localStorage`, falling back to memory.

## Where things live

- Readings and users: MongoDB database `jyotish`
- Prompts: `web/src/lib/prompts.ts`
- Protocol template: `web/src/lib/protocol/client.{css,js}` and `web/src/lib/protocolHtml.ts`
- Chart maths: `chart-service/src/chart_service/compute.py`, tests in `chart-service/tests/`

## Notes

- Without ephemeris files, Swiss Ephemeris uses its built-in Moshier model, which is accurate to about an arcsecond for these purposes. To use the full files, download them and set `SE_EPHE_PATH` before starting the chart service.
- Swiss Ephemeris keeps sidereal mode per thread. `compute_chart` sets it on every call. A test covers this, because getting it wrong silently switches to Fagan-Bradley.
- Geocoding uses the free Open-Meteo API. You can also override the UTC offset by hand.
