# Jyotish Protocol

A staged Jyotish natal reading with two hard stops: confirm the birth data, then score a **blind past-check** before any forward reports. Produces a downloadable living-protocol HTML file.

## Prerequisites

| Tool | Version / notes |
| --- | --- |
| Node.js | 20+ |
| [uv](https://docs.astral.sh/uv/) | Python package runner for the chart service |
| MongoDB | Local on `:27017`, or any URI (e.g. Atlas) |
| LLM key | [OpenRouter](https://openrouter.ai/) **or** Anthropic |

## Setup (once)

From the repo root:

```bash
# 1. Dependencies (web + chart-service)
npm install
npm run setup

# 2. MongoDB (skip if you already have one on :27017)
docker run -d --name jyotish-mongo -p 27017:27017 --restart unless-stopped mongo:7

# 3. Env
cp web/.env.example web/.env.local
```

Edit `web/.env.local`:

```bash
# OpenRouter (recommended)
OPENROUTER_API_KEY=sk-or-...
ANTHROPIC_MODEL=anthropic/claude-opus-5.5

# Or Anthropic direct instead:
# ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-opus-5-5

CHART_SERVICE_URL=http://127.0.0.1:8765
MONGODB_URI=mongodb://127.0.0.1:27017/jyotish
AUTH_SECRET=replace-with-a-long-random-string   # e.g. openssl rand -hex 32
```

OpenRouter takes precedence when `OPENROUTER_API_KEY` is set. Direct Anthropic works if you omit OpenRouter and set `ANTHROPIC_API_KEY` instead.

## Run

```bash
npm run dev
```

That starts both processes:

| Process | URL |
| --- | --- |
| Chart service (FastAPI) | http://127.0.0.1:8765 |
| Web app (Next.js) | http://localhost:3000 |

Open **http://localhost:3000**. You can **Begin a reading** as a guest (account is created at the end of onboarding), or **Sign in** if you already have one.

### Run pieces separately

```bash
npm run chart   # chart service only
npm run web     # Next.js only (needs chart service + Mongo + env)
```

## How it is put together

```
chart-service/   Python, FastAPI + pyswisseph. Computes everything numeric.
web/             Next.js. Auth, UI, stage gating, LLM calls, protocol builder.
prompts/         The original prompt document.
```

**Code computes, the model writes.** The chart service does what the prompt's Stage 1 script did, plus:

- Historical UTC offsets from the IANA database for the birth date (war time, daylight saving, pre-standard mean time), with warnings for ambiguous or nonexistent local times.
- Minutes of birth-time error the lagna, navamsa lagna and Moon nakshatra each survive.
- Antardashas of the birth mahadasha laid out from its notional start before birth.
- Lifetime Saturn spans relative to the natal Moon (sade sati, ashtama, kantaka).
- Dispositor chains and a final-dispositor tally.

**Accounts and storage.** Email/password auth (JWT cookie). Readings live in MongoDB (`users`, `readings`) — intake, chart, scores, and every stage output. Reloading reuses stored data; the LLM runs only when a stage is missing or regenerated. Guest onboarding registers an account before the first chart is saved.

**Stages and stops.**

| App section | Prompt stage | Gate |
| --- | --- | --- |
| Chart | 0, 1 | none → confirm birth data (Hard Stop 1) |
| Blind past-check | 2, Reports 1–2 | birth data confirmed |
| Reports 3–6 | Reports 3–6 | every claim scored (Hard Stop 2) |
| Guidance | 4 | Reports 3–6 exist |
| Living protocol | 5 | guidance exists |

The server refuses out-of-order stages. Optional intake context (occupation, practice, question) is withheld from the model until the score is submitted.

Each stage is one streamed call (default `anthropic/claude-opus-5.5` via OpenRouter, or `claude-opus-5-5` direct) with adaptive thinking at high effort. Direct Anthropic also sends server-side refusal fallback (`fallbacks: "default"`); OpenRouter omits that Anthropic-only field. Report 2’s numbered claims are parsed into the interactive scoring UI.

**The protocol file.** The model returns structured JSON; `web/src/lib/protocolHtml.ts` builds a self-contained HTML page that recomputes weekday, dashas, season, and Saturn countdown from the device date on each open.

## Where things live

- Readings / users: MongoDB database `jyotish`
- Prompts: `web/src/lib/prompts.ts`
- Protocol template: `web/src/lib/protocol/client.{css,js}`, `web/src/lib/protocolHtml.ts`
- Chart maths: `chart-service/src/chart_service/compute.py`, tests in `chart-service/tests/`

## Notes

- Without ephemeris files, Swiss Ephemeris uses its built-in Moshier model (~arcsecond for these purposes). For full files, download them and set `SE_EPHE_PATH` before starting the chart service.
- Swiss Ephemeris keeps sidereal mode per thread; `compute_chart` sets it on every call.
- Geocoding uses the free Open-Meteo API. You can override the UTC offset by hand.
- Production: point `MONGODB_URI` at Atlas (or similar); no code change required.
