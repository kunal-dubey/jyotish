# Vercel staging checklist

Account: `kushingaround-6762` (team `kushingaround-6762s-projects`)

| Project | URL | Root | Project ID |
| --- | --- | --- | --- |
| `jyotish-chart` | https://jyotish-chart-theta.vercel.app | `chart-service/` | `prj_pqSdneIAmQ6viubnLEwSepXZKYAB` |
| `jyotish-web` | https://jyotish-web-coral.vercel.app | `web/` | `prj_3L4lJVtPY0RcoeEELnnWwyzTVnGr` |

Org ID: `team_WcXxy5QGFXfuGoPzubTYm2le`

## Live env (production)

Set on `jyotish-web`:

| Name | Notes |
| --- | --- |
| `OPENROUTER_API_KEY` | from local `.env` |
| `ANTHROPIC_MODEL` | `anthropic/claude-opus-5.5` |
| `ANTHROPIC_BASE_URL` | `https://openrouter.ai/api` |
| `AUTH_SECRET` | random hex |
| `CHART_SERVICE_URL` | `https://jyotish-chart-theta.vercel.app` |
| `OPENROUTER_HTTP_REFERER` | `https://jyotish-web-coral.vercel.app` |
| `OPENROUTER_APP_TITLE` | `Jyotish` |
| `MONGODB_URI` | Claimed Atlas free cluster (`/jyotish` DB) |

SSO / Vercel Authentication is **disabled** on both projects so the chart API and web staging are publicly reachable.

## Redeploy

```bash
cd chart-service && npx vercel@latest deploy --prod --yes
cd web && npx vercel@latest deploy --prod --yes
```

## GitHub Actions

Add repo secrets (needs write access to `kunal-dubey/jyotish`):

| Secret | Value |
| --- | --- |
| `VERCEL_TOKEN` | https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | `team_WcXxy5QGFXfuGoPzubTYm2le` |
| `VERCEL_CHART_PROJECT_ID` | `prj_pqSdneIAmQ6viubnLEwSepXZKYAB` |
| `VERCEL_WEB_PROJECT_ID` | `prj_3L4lJVtPY0RcoeEELnnWwyzTVnGr` |

## Local Compose

```bash
npm run stack   # mongo :27017 + chart :8765
npm run web     # Next on :3000
```
