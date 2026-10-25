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

# 2. Mongo + chart via Compose (or keep your own Mongo on :27017)
npm run stack
# equivalent: docker compose up -d --build

# 3. Env
cp web/.env.example web/.env.local
```

Edit `web/.env.local`:

```bash
# OpenRouter (recommended) — Sonnet for claim quality; thinking off by default (Vercel 300s)
OPENROUTER_API_KEY=sk-or-...
ANTHROPIC_MODEL=anthropic/claude-sonnet-5.5

# Or Anthropic direct instead:
# ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-sonnet-4-5

CHART_SERVICE_URL=http://127.0.0.1:8765
MONGODB_URI=mongodb://127.0.0.1:27017/jyotish
AUTH_SECRET=replace-with-a-long-random-string   # e.g. openssl rand -hex 32
```

OpenRouter takes precedence when `OPENROUTER_API_KEY` is set. Direct Anthropic works if you omit OpenRouter and set `ANTHROPIC_API_KEY` instead.

## Run

```bash
npm run dev
```

That starts both processes (Compose already covers Mongo + chart if you used `npm run stack`; otherwise `npm run dev` starts chart + web):

| Process | URL |
| --- | --- |
| Chart service (FastAPI) | http://127.0.0.1:8765 |
| Web app (Next.js) | http://localhost:3000 |

Open **http://localhost:3000**. You can **Begin a reading** as a guest (account is created at the end of onboarding), or **Sign in** if you already have one.

### Test subscription profiles

```bash
npm run seed:users
```

| Email | Password | Plan |
| --- | --- | --- |
| `free@test.local` | `TestPass123!` | free — Tier A/B modules only |
| `paid@test.local` | `TestPass123!` | paid — full protocol stages |
| `admin@test.local` | `TestPass123!` | admin — same as paid + overrides |

In local/dev, the header also has a plan switcher. Live checkout will use **Dodo Payments** or **Cashfree** later (`web/src/lib/billing`).

### LLM usage (admin)

Every protocol stage call is appended to MongoDB collection `llm_usage` (model, tokens, ok/fail). Sign in as `admin@test.local` and open **Usage** in the header (`#/admin/usage`), or `GET /api/admin/usage?days=30`.

### Run pieces separately

```bash
npm run chart   # chart service only
npm run web     # Next.js only (needs chart service + Mongo + env)
npm run stack   # Mongo + chart containers
```

## Staging / production on Vercel

Account: `kushingaround-6762`. Live staging:

| Service | URL |
| --- | --- |
| Web | https://jyotish-web-coral.vercel.app |
| Chart | https://jyotish-chart-theta.vercel.app |

Checklist, env vars, org/project IDs, and GitHub Actions secrets: [`docs/vercel-staging.md`](docs/vercel-staging.md).

Deploys run from **`main`** via GitHub Actions (`.github/workflows/deploy.yml`) and CI (`.github/workflows/ci.yml`).

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

Each stage is one streamed call. Default via OpenRouter is `anthropic/claude-sonnet-5.5` (strong enough for falsifiable past-check claims). Adaptive thinking stays off on OpenRouter unless `OPENROUTER_THINKING=1`, so stages fit under Vercel’s 300s ceiling; on 429 the app falls back to Gemini Flash → DeepSeek → a free model. Direct Anthropic keeps adaptive thinking. Report 2’s numbered claims are parsed into the interactive scoring UI.

**The protocol file.** The model returns structured JSON; `web/src/lib/protocolHtml.ts` builds a self-contained HTML page that recomputes weekday, dashas, season, and Saturn countdown from the device date on each open.

## Where things live

- Readings / users: MongoDB database `jyotish`
- Prompts: `web/src/lib/prompts.ts`
- Protocol template: `web/src/lib/protocol/client.{css,js}`, `web/src/lib/protocolHtml.ts`
- Chart maths: `chart-service/src/chart_service/compute.py`, tests in `chart-service/tests/`
- UI tokens & patterns: [`docs/ui-style-guide.md`](docs/ui-style-guide.md) (source: `web/src/app/globals.css`)

## Notes

- Without ephemeris files, Swiss Ephemeris uses its built-in Moshier model (~arcsecond for these purposes). For full files, download them and set `SE_EPHE_PATH` before starting the chart service.
- Swiss Ephemeris keeps sidereal mode per thread; `compute_chart` sets it on every call.
- Geocoding uses the free Open-Meteo API. You can override the UTC offset by hand.
- Staging/production: point `MONGODB_URI` at Atlas and `CHART_SERVICE_URL` at the Vercel chart project; no app code change required.
