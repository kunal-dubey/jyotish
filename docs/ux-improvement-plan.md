# Jyotish Protocol — Combined UX Improvement Plan

> **Status:** Phases 1–3 complete (browser-validated 5 Nov 2026)  
> **Date:** 5 Nov 2026  
> **Sources:** Three-persona review (Product Manager, UI/UX Consultant, Astrology Novice) + live local walkthrough + component audit  
> **Companion canvas:** Cursor canvases → `ux-persona-journey-review.canvas.tsx`  
> **Visual system:** Follow [`docs/ui-style-guide.md`](./ui-style-guide.md); do not invent a parallel look  
> **Deferred:** [`docs/ux-deferred.md`](./ux-deferred.md) (password email reset, live billing adapters, analytics)

This document turns persona feedback into **what to change**, **where**, **why**, and **in what order**. Use it as the build backlog for subsequent UI/UX work. Prefer shipping phases end-to-end over scattering polish across the app.

---

## 0. How to use this document

1. **Persona guides (Parts A–C)** — verbose rationale from each lens. Read when a change feels contested; they explain *why* a fix matters to that stakeholder.
2. **Combined plan (Part D)** — the authoritative change list by surface. Implement from here.
3. **Phasing (Part E)** — ship order and dependencies.
4. **Acceptance (Part F)** — done-when criteria per workstream.
5. **Preserve list (Part G)** — do not regress these strengths.

### Journey parameters used in the review

| # | Parameter | Question it answers |
|---|-----------|---------------------|
| 1 | First impression & value clarity | Do I know what this is and why it matters in the first viewport? |
| 2 | Start / intake friction | Can I begin a reading without confusion or unexpected walls? |
| 3 | Orientation & next-step clarity | Do I always know where I am and what to do next? |
| 4 | Comprehension & trust | Can a non-astrologer understand content and trust the process? |
| 5 | Progress feedback & recovery | During waits, errors, and locks, am I guided—not abandoned? |

---

## Part A — Product Manager guide

**Lens:** Funnel health, retention, monetization honesty, differentiation, support load.

**Overall score:** ~7.1 / 10  
**Strongest area:** Orientation (four-stage model)  
**Weakest area:** Intake (dual Begin paths) + monetization dead end (PaidGate)

### A.1 First impression & value clarity — PM

**Keep**
- The landing four-step story (chart → plain words → past check → ahead) is a coherent product narrative. It matches Home and ReadingView. That consistency is rare and should stay the spine of marketing and in-app chrome.
- Differentiation hook: forecasts stay closed until the user scores the past. Protect this in copy everywhere; never let paid upsell short-circuit it.

**Change**
1. **Brand ownership on landing** — Headline currently carries comprehension; brand is topbar-scale. Strengthen brand as a hero-level signal (wordmark + product name relationship) so the first viewport still “belongs” to Jyotish if nav is ignored. Do not bury the product name only in the lede.
2. **Free → paid ladder honesty** — Landing and PaidGate imply an upgrade path. Until billing ships, replace hollow “Upgrade” with an honest interim CTA (waitlist, notify me, contact, or “Coming soon — keep using the atlas”). Never promise a transaction that does not exist.
3. **Clarify free value ceiling** — Explicitly state on landing/home what free includes (Chart + Atlas) vs what paid unlocks (Past-check → Reports → Guidance → Protocol). Reduces support and bounce after PaidGate.

**Success metric (PM)**
- Cold visitor can answer “what’s free vs paid?” without entering a reading.
- PaidGate click-through has a defined next step (even if waitlist), measured later via analytics.

### A.2 Start / intake friction — PM

**Keep**
- Onboarding wizard quality: progress, time-certainty language, weak-source warnings, deferred account.
- Holding optional life context until after past-check (protocol integrity).

**Change**
1. **Unify Begin entry** — Landing “Begin”, topbar “+ New Reading”, and `#/begin` must produce the **same** intake quality. Today Landing/topbar open `NewReadingDialog` (thinner); `#/begin` uses `Onboarding` (better). This splits conversion quality by CTA.
   - **Preferred:** Route all Begin CTAs to Onboarding (`#/begin` or embed the wizard in the dialog shell).
   - **Alternative:** Bring dialog up to Onboarding parity (call name, time certainty depth, advanced TZ, weak-source warnings).
2. **Account wall messaging** — Requiring account to save is fine for retention; surprise is not. Preview the requirement before the final submit (“We’ll save this reading to your account”) and allow “Save later / continue as guest” only if product accepts ephemeral readings—or keep hard gate but with clear copy one step earlier.
3. **Auth gaps for growth** — Password reset (and eventually OAuth) are not P0 for prototype polish but block growth experiments; track as P2 growth enablement.

**Success metric (PM)**
- Single Begin path in analytics (one funnel).
- Reduced incomplete-intake / bad-time charts from dialog-only users.

### A.3 Orientation & next-step clarity — PM

**Keep**
- Four-stage mental model everywhere.
- Auto-advance after confirm → atlas and after past generate → scoring/forward as designed.
- Home status → next CTA mapping and empty state.

**Change**
1. **Free Past stage note** — For free users standing on Past, copy must not say “After the past-check” as if they already did it. Rewrite to: past-check is locked / unlocks with full reading; atlas remains available.
2. **Selectable locked stages** — Allowing free users to open Past to see PaidGate is educational *if* PaidGate converts. Until then, either:
   - keep selectable + honest CTA, or
   - show lock affordance with tooltip “Full reading” and still open PaidGate with a real next step.
3. **Edit birth after downstream** — Warning of discard is correct; strengthen confirm UX (list what will be wiped: past claims, scores, reports…) to reduce accidental retention loss.

**Success metric (PM)**
- Zero “wrong tense” stage notes for free Past.
- Edit-birth accidental wipe rate drops (qualitative first).

### A.4 Comprehension & trust — PM

**Keep**
- Fits / Partly / No as co-authored validity.
- Soft pass line (reading still opens below pass) — avoid shame churn.
- Atlas life-language default.

**Change**
1. **PaidGate trust** — Hollow upgrade is worse than a quiet lock. Ship interim monetization UX before pushing paid traffic.
2. **Chart-first jargon** — Classical rising block before Confirm risks early churn of non-believers *before* Atlas delivers free value. Defer classical detail (PM: activation, not aesthetics).
3. **Model quality variance** — Admin model picker is powerful; document default models per feature for support. End users should not see unexplained quality swings without a product story.

**Success metric (PM)**
- Higher free→atlas completion; lower bounce on Chart confirm.
- Support scripts know which model powers which stage.

### A.5 Progress feedback & recovery — PM

**Keep**
- Quiet StageRunner wait UX (retention for multi-minute LLM).
- Stall recovery / polling after disconnect (protects paid token spend in UX terms).
- Regenerate confirmation when downstream exists.

**Change**
1. **Cancel in-flight generation** — Stuck users refresh and lose orientation; cancel reduces support and wasted perception (even if server work finishes).
2. **Honest boot loaders** — “Casting your chart” while only fetching overclaims; use “Loading your reading” until cast actually runs.
3. **PaidGate as recovery failure** — Treat locked paid stages as a recovery path with a defined action, not a cul-de-sac.

**Success metric (PM)**
- Cancel available on past/reports/guidance/protocol waits.
- Loader copy never claims work that isn’t happening.

### A.6 PM backlog summary (ordered)

| Pri | Item | Surfaces |
|-----|------|----------|
| P0 | Honest PaidGate next step (waitlist/upgrade/contact) | ReadingView PaidGate, Landing free/paid copy |
| P0 | Unify Begin → Onboarding-quality intake | App, Landing, NewReadingDialog, Onboarding |
| P1 | Free Past stage note + loader honesty | ReadingView |
| P1 | Chart life-language first viewport (activation) | ChartPanel |
| P2 | Cancel generation + regenerate discoverability | StageRunner, ScorePanel, ForwardPanel |
| P2 | Edit-birth wipe confirm detail | ChartPanel / IntakeForm |
| P3 | Password reset / billing provider wiring | Auth, billing |

---

## Part B — UI/UX Consultant guide

**Lens:** Composition, hierarchy, pattern consistency, style-guide fidelity, accessibility, mobile.

**Overall score:** ~7.1 / 10  
**Strongest area:** Feedback during LLM waits; shared reader shell  
**Weakest area:** Intake pattern split; Chart vs style-guide voice mismatch

### B.1 First impression & value clarity — UX

**Keep**
- Landing as one composition: one headline, one lede, two CTAs, atmospheric visual—not a dashboard.
- Token system (Jost display, system UI body, gold accent, light/dark) already in CSS.

**Change**
1. **Brand-first pass on landing** — Align with style guide / brand test: product name must remain a hero-level signal. Options: integrate “Jyotish” into the display lockup above or within the headline treatment without creating a second competing headline.
2. **Home density after landing calm** — Home is correctly denser (library), but first viewport should still lead with one job: “Your readings” + primary New Reading. Push “Words to Know” and long education below the fold or behind disclosure by default on mobile.
3. **Button system hygiene** — Normalize on `btn--*` (or document bridge forever). Dual class names (`btn-primary` vs `btn--primary`) are a maintenance smell.

**Success metric (UX)**
- Landing passes brand test in design critique.
- Home first viewport on mobile shows ≤1 primary CTA + list/empty state.

### B.2 Start / intake friction — UX

**Keep**
- Onboarding progressive disclosure, progress indicator, a11y patterns in dialog.

**Change**
1. **One intake pattern** — Pattern fragmentation is the highest UX debt. Choose Onboarding as canonical; deprecate or thin-wrap the dialog.
2. **Parity checklist if dialog remains temporarily** — Call name, time certainty, place search, optional advanced offset, pre-auth copy, error states must match Onboarding.
3. **Silent call-name derivation** — Dialog auto first-token call name is invisible data quality risk; expose an editable “What should we call you?” field.

**Success metric (UX)**
- Design QA: Begin from any entry produces identical fields and validation.

### B.3 Orientation & next-step clarity — UX

**Keep**
- Shared Atlas/Past/Forward reader shell (crumb → title → body → foot)—learn once.
- Fit-page layouts; mobile breakpoints in `ref-ux.css` are intentional.
- Forward tab separation (reading / how sure / chart notes / living page).

**Change**
1. **Stepper on small screens** — Four labels truncate; add abbreviated labels + `aria-label` full names, or icon+short word with legend.
2. **Primary Generate hierarchy in Forward** — Foot Generate can lose to crumb chrome; ensure one clear primary when content is empty.
3. **Tease locked atlas modules** — Free filter hides paid maps entirely. Consider a single “More with full reading” row (not a card wall) so orientation includes what’s ahead—without violating “no cards in hero” / clutter rules. Keep it one quiet line, not a promo strip.

**Success metric (UX)**
- Mobile stepper remains understandable at 320–390px width.
- Empty Forward state has one unmistakable primary action.

### B.4 Comprehension & trust — UX

**Keep**
- ScorePanel age labels (strip dasha names).
- Term explainers, chart-only hiding, Forward life section labels.
- Style guide voice: life language first.

**Change**
1. **ChartPanel first viewport rewrite** — Lead with plain rising / “what this chart holds” + Confirm CTA. Move nakshatra, pada, yogakaraka, dense rising degrees into “Chart details” / Practitioner layers. This is the largest style-guide violation on the highest-anxiety step.
2. **Confirm CTA clarity** — Label or helper: “Confirm this looks right” vs “I am sure of this birth data” — two different meanings; pick one and support with subcopy.
3. **Glossary in-context** — Home “Words to Know” is late; ensure term links work densely on Chart details and Forward classical tabs.

**Success metric (UX)**
- Chart first viewport contains no classical terms unless behind an explicit disclosure.
- Style-guide voice audit passes Chart + Atlas + Past.

### B.5 Progress feedback & recovery — UX

**Keep**
- Quiet wait: titled steps, asymptotic progress ≤94%, `role="status"` / `aria-live`.
- Busy-elsewhere disables Generate.
- Error `note-bad` pattern.

**Change**
1. **Cancel control** — Visible, labeled, confirms if work is far along; wire abort to client stream; server may finish—copy should say “Stopped showing progress; generation may still finish in the background” if that’s true, or implement true cancel later.
2. **Regenerate discoverability after ScorePanel** — When Past is scored, Regenerate must remain findable (link in ScorePanel header/footer) without hunting StageRunner.
3. **Humanize API errors** — Map common failures (rate limit, auth, empty claims, timeout) to short recovery actions: Retry / Check connection / Edit birth / Contact.

**Success metric (UX)**
- Wait UI still calm with Cancel present (not noisy).
- Error strings never dump raw `API error 429: …` to novices without a plain line first.

### B.6 UX backlog summary (ordered)

| Pri | Item | Surfaces |
|-----|------|----------|
| P0 | Canonical Begin pattern | App routing, Onboarding, dialog |
| P1 | Chart first-viewport life language | ChartPanel, style guide compliance |
| P1 | Mobile stepper + Forward primary | ReadingView, ForwardPanel, CSS |
| P2 | Cancel + error mapping + regenerate placement | StageRunner, ScorePanel |
| P2 | Button class normalization | globals + components |
| P3 | Home first-viewport declutter (mobile) | Home |

---

## Part C — Astrology Novice guide

**Lens:** Zero prior knowledge. Fear of looking stupid. Need plain language, fairness, and reversible mistakes.

**Overall score:** ~6.7 / 10  
**Strongest area:** Landing first impression  
**Weakest area:** Comprehension on Chart (jargon intimidation)

### C.1 First impression & value clarity — Novice

**Keep**
- Landing words: work, home, love, focus; “forecast stays closed until you score the past” feels fair.
- Atmospheric visual without requiring astrology literacy.

**Change**
1. **One-sentence method** — Add a short line: what the product *does* methodologically (“We cast a Vedic birth chart, then ask you to check claims against years you already lived before any forecast”). Builds trust without a lecture.
2. **Brand foreignness** — “Jyotish” may be unfamiliar; pair with a plain gloss once (“Vedic astrology reading”) near the brand or in the lede—once, not repeatedly.
3. **Mobile below-fold story** — Ensure the four steps are reachable without feeling like the page ended after Begin; subtle scroll cue or keep a one-line stage strip in the first screen if composition allows without clutter.

**Success metric (Novice)**
- In hallway test: “What happens after I begin?” answered correctly by 4/5 people who only saw landing.

### C.2 Start / intake friction — Novice

**Keep**
- Familiar fields (name, date, time, place).
- Approximate time options reduce panic.

**Change**
1. **Same help wherever I Begin** — Novices don’t know `#/begin` is “better.” They use the big Begin button—give them the wizard.
2. **Account wall preview** — “You’ll need a free account to save this reading” before the final click.
3. **Approximate time reassurance** — Explicit: “If time is approximate, we still cast the chart; some details are less sharp—you can edit later.”

**Success metric (Novice)**
- No surprise at auth; time uncertainty doesn’t cause abandon.

### C.3 Orientation & next-step clarity — Novice

**Keep**
- Stepper; Atlas feels like a magazine; confirm → atlas feels natural.

**Change**
1. **PaidGate feels like a trick** today — Upgrade language + only “Back to atlas” = bait. Fix CTA or soften copy (“Past-check is part of the full reading—join the waitlist”).
2. **Stage name “Reading”** — Conflicts with “I thought Atlas was the reading.” Consider “Forward” / “Reports” / “What’s ahead” as the fourth label (product decision; update Landing + Home + stepper together).
3. **Glossary before Chart jargon** — Either soft-gate classical terms or show a one-time tip: “We’ll keep this in plain words; open Chart details for classical terms.”

**Success metric (Novice)**
- Users never describe Past as “a broken page.”
- Fourth stage name understood as “after past-check,” not “the whole app.”

### C.4 Comprehension & trust — Novice

**Keep**
- Fits / Partly / No; Atlas today/focus cards; progressive deeper factors.

**Change**
1. **Chart screen is the intimidation peak** — Highest priority novice fix. Plain summary first; classical behind disclosure.
2. **Confirm meaning** — Helper text: “Confirm if this birth data looks right. You can edit later (editing may clear later steps).”
3. **In-context glossary** — Term links on Chart details and Forward classical tabs, not only Home aside.

**Success metric (Novice)**
- Users can Confirm without asking what nakshatra means.
- Users who open Chart details *choose* denser language.

### C.5 Progress feedback & recovery — Novice

**Keep**
- “Usually a few minutes. Safe to leave this tab open.”
- Step list during generation; one-claim scoring with auto-advance.

**Change**
1. **Plain errors** — “Something went wrong talking to the reading service. Try again in a minute.” + Retry. Optional “Details” disclosure for raw error.
2. **Cancel** — “I opened the wrong person” needs an exit from a multi-minute wait.
3. **Regenerate after scoring** — Visible “Redo past-check” with warning about wiping scores/reports.

**Success metric (Novice)**
- Failed generation does not end in “I don’t know what to do.”
- Wrong-person recovery without refresh gymnastics.

### C.6 Novice backlog summary (ordered)

| Pri | Item | Surfaces |
|-----|------|----------|
| P0 | Chart plain-language first viewport | ChartPanel |
| P0 | PaidGate honest next step (not a trick) | PaidGate |
| P1 | Unify Begin on helpful wizard | Onboarding path |
| P1 | Plain errors + Cancel | StageRunner |
| P2 | Stage naming (“Reading” → clearer) | Landing, Home, ReadingView |
| P2 | Approximate-time reassurance + confirm helper | Onboarding, ChartPanel |
| P3 | Method one-liner + Jyotish gloss on landing | Landing |

---

## Part D — Combined plan across all surfaces

This is the **implementation source of truth**. Each item lists persona pressure (PM / UX / Novice), priority, and concrete change intent.

### D.1 Cross-cutting principles (apply everywhere)

1. **Life language first; classical on purpose** — Default copy matches style guide. Classical terms only behind term links, Chart details, Practitioner, or “How sure / Chart notes.”
2. **One job per viewport** — Especially Landing, Chart confirm, PaidGate, empty Forward generate.
3. **Honest gates** — Locks must offer a real next step or honest “not available yet.”
4. **One Begin pattern** — No dual-quality intake.
5. **Calm waits, clear exits** — Keep quiet StageRunner; add Cancel and human errors.
6. **Preserve hard stops** — Confirm before past; score before reports. Soft pass line stays soft.

---

### D.2 Landing (`Landing.tsx`, App CTAs)

| ID | Change | Pri | Personas | Notes |
|----|--------|-----|----------|-------|
| L1 | Route Begin → Onboarding (`#/begin`) or wizard-equivalent | P0 | PM, UX, Novice | Stop opening thin `NewReadingDialog` from Landing |
| L2 | Free vs paid ceiling in one short block below hero or in steps | P0 | PM, Novice | What free includes vs what unlocks later |
| L3 | Brand-first lockup / Jyotish as hero signal | P1 | PM, UX | Don’t let headline orphan the brand |
| L4 | One-line method + optional “Vedic astrology” gloss | P2 | Novice | Once, near lede |
| L5 | Align fourth-step label with renamed stage if D.5 renames “Reading” | P2 | Novice, UX | Keep Landing ↔ app vocabulary identical |

---

### D.3 Topbar / App shell (`App.tsx`)

| ID | Change | Pri | Personas | Notes |
|----|--------|-----|----------|-------|
| A1 | “+ New Reading” uses same Begin path as Landing | P0 | PM, UX | Same as L1 |
| A2 | Keep admin Models/Usage; no change to novice path | — | — | Out of scope for journey fix |
| A3 | Mobile: ensure Models/Usage don’t steal novice attention (already admin-only) | — | UX | Verify |

---

### D.4 Auth (`AuthScreen.tsx`)

| ID | Change | Pri | Personas | Notes |
|----|--------|-----|----------|-------|
| AU1 | Pre-auth copy when arriving from save-gated create | P1 | PM, Novice | “Create a free account to save this reading” |
| AU2 | Password reset | P3 | PM | Growth enablement |
| AU3 | Keep calm minimal chrome | — | UX | Don’t clutter |

---

### D.5 Onboarding / New reading (`Onboarding.tsx`, `NewReadingDialog.tsx`, `IntakeForm.tsx`)

| ID | Change | Pri | Personas | Notes |
|----|--------|-----|----------|-------|
| O1 | **Canonical intake = Onboarding**; dialog becomes thin wrapper or removed from primary CTAs | P0 | All | Largest PM/UX intake fix |
| O2 | Editable call name always visible | P1 | UX, Novice | No silent first-token only |
| O3 | Approximate-time reassurance copy | P1 | Novice | What still works if time is fuzzy |
| O4 | Account requirement preview before final submit | P1 | PM, Novice | |
| O5 | Keep optional context deferred until after past-check | — | PM | Preserve protocol |
| O6 | IntakeForm (edit) voice parity with Onboarding | P2 | UX | Less jargon on edit birth |

---

### D.6 Home (`Home.tsx`)

| ID | Change | Pri | Personas | Notes |
|----|--------|-----|----------|-------|
| H1 | Mobile first viewport: list + New Reading; education/glossary secondary | P2 | UX | |
| H2 | Sync stage labels with ReadingView stepper | P2 | Novice | If “Reading” renamed |
| H3 | Keep status → next CTA mapping | — | PM | Preserve |
| H4 | Keep “Why Past-Check Comes First” education | — | PM, Novice | Preserve; maybe link from PaidGate |

---

### D.7 Reading shell (`ReadingView.tsx`)

| ID | Change | Pri | Personas | Notes |
|----|--------|-----|----------|-------|
| R1 | **PaidGate redesign** — primary CTA → `#/billing`; keep “Back to atlas” as secondary | P0 | All | See copy outline + Part I.1 |
| R2 | Fix free Past stage note tense/promise | P1 | PM, Novice | |
| R3 | Boot loader: “Loading your reading” vs “Casting…” only when casting | P1 | PM, UX | |
| R4 | Rename path label to **Reports** (short + titles) | P0 | Novice | Update PATH + Landing + Home together |
| R5 | Keep auto-advance + hard-stop behavior | — | PM | Preserve |
| R6 | Stepper mobile abbreviations + aria-labels | P1 | UX | |

**PaidGate copy outline**

- Title: keep clear that atlas stays open.
- Body: past-check + Reports are the full protocol; free plan includes chart + atlas.
- Primary CTA: “See plans” / “Continue to billing” → `#/billing`.
- Secondary: “Back to the atlas”.
- Never: “Upgrade” with no destination.

---

### D.7b Billing (`BillingPage` / `#/billing`)

| ID | Change | Pri | Personas | Notes |
|----|--------|-----|----------|-------|
| B1 | Add `#/billing` route + Billing page (plan compare, current plan, checkout CTA) | P0 | PM, Novice | Part I.1 |
| B2 | PaidGate + Landing link into Billing | P0 | PM, UX | |
| B3 | Checkout via existing `/api/billing/checkout`; graceful 501 UI | P1 | PM | |
| B4 | Success/cancel return handling; provider adapters | P3 | PM | Phase 3 |

---

### D.8 Chart (`ChartPanel.tsx`, PractitionerDialog)

| ID | Change | Pri | Personas | Notes |
|----|--------|-----|----------|-------|
| C1 | **First viewport life language** — plain rising summary + Confirm; classical in details | P0 | Novice, UX, PM | Highest novice intimidation fix |
| C2 | Confirm helper text (looks right / can edit later / edit may clear later stages) | P1 | Novice, PM | |
| C3 | Edit-birth confirm lists wiped downstream artifacts | P2 | PM | |
| C4 | Term links inside Chart details | P2 | Novice, UX | |
| C5 | Keep Practitioner as deep layer | — | UX | Preserve |

---

### D.9 Atlas (`ModulesPanel.tsx`)

| ID | Change | Pri | Personas | Notes |
|----|--------|-----|----------|-------|
| M1 | Keep life-first Areas reader | — | All | Preserve |
| M2 | Quiet “More with the full reading” one-liner | P0 | PM, UX, Novice | Link to Past (PaidGate) or `#/billing` |
| M3 | Remove or use unused unlock callbacks | P3 | UX | Hygiene |

---

### D.10 Past-check & scoring (`StageRunner.tsx`, `ScorePanel.tsx`)

| ID | Change | Pri | Personas | Notes |
|----|--------|-----|----------|-------|
| P1a | Client-only Cancel on quiet wait (abort UI stream; no server kill) | P1 | All | Avoid stacked regenerate calls |
| P1b | Humanized errors + Retry | P1 | Novice, UX | |
| P1c | Regenerate visible from ScorePanel with wipe warning | P1 | UX, Novice, PM | |
| P1d | Keep Fits/Partly/No + age labels + auto-advance | — | All | Preserve |
| P1e | Keep soft pass line messaging consistent with Forward | — | PM | Preserve |

---

### D.11 Forward / Reports / Guidance / Protocol (`ForwardPanel.tsx`, StageRunner, ReportDigest)

| ID | Change | Pri | Personas | Notes |
|----|--------|-----|----------|-------|
| F1 | Empty state: one primary Generate | P1 | UX | |
| F2 | Cancel + human errors on reports/guidance/protocol | P1 | All | Same StageRunner work |
| F3 | Keep tab separation; life labels on main reading | — | UX, Novice | Preserve |
| F4 | Glossary density on How sure / Chart notes | P2 | Novice | |

---

### D.12 Admin (out of primary journey; light touch)

| ID | Change | Pri | Personas | Notes |
|----|--------|-----|----------|-------|
| AD1 | Document default models per feature for support | P2 | PM | Docs only |
| AD2 | No novice-facing exposure of model picker | — | — | Keep admin-gated |

---

### D.13 Design system / CSS

| ID | Change | Pri | Personas | Notes |
|----|--------|-----|----------|-------|
| DS1 | Prefer `btn--*` consistently; migrate stragglers | P2 | UX | |
| DS2 | No new parallel tokens; extend style guide if voice rules for Chart are updated | P1 | UX | Document Chart life-first rule explicitly in style guide |
| DS3 | Update `docs/ui-style-guide.md` with: Chart confirm viewport rules; PaidGate honesty; single Begin pattern | P1 | UX | So future work doesn’t re-break |

---

## Part E — Phased implementation plan

Ship in phases so each release is demoable and testable. Do not start Phase 3 polish before Phase 1 honesty/intake.

### Decisions (resolved 2026-11-05)

| Question | Decision |
|----------|----------|
| PaidGate / monetization | Ship a **Billing page** sooner (`#/billing`). PaidGate primary CTA → Billing. Until the provider is live, Billing shows plans + honest “checkout coming soon” / retry checkout when configured. |
| Fourth stage name | **Reports** (Landing, Home, ReadingView stepper, related copy). |
| Guest readings | **Account required to cast** — no ephemeral guest charts. |
| Cancel semantics | **Client-only stop** — abort the browser wait/stream consumer so the user can leave or regenerate without stacking UI; avoid encouraging extra server calls. Server work may finish; do not add a second generate while one is in flight. |
| Atlas paid tease | **One quiet line** (“More with the full reading”) linking toward Past/Billing — not a promo strip. |

### Phase 1 — Trust & funnel integrity (P0)

**Goal:** Stop leaking trust and conversion; give everyone the same good start.

1. Billing page shell (`#/billing`) + PaidGate / Landing CTAs into it; free vs paid ceiling copy.
2. Unify Begin → Onboarding (`#/begin`); account required before cast.
3. Chart first-viewport life language + Confirm helper.
4. Rename fourth stage to **Reports** across Landing / Home / ReadingView.
5. Atlas one-line full-reading tease.
6. Style guide amendments for the above.

**Exit criteria:** Novice hallway test on Begin → Chart confirm → Atlas → Past/Billing feels fair; no hollow Upgrade; Chart confirm without Sanskrit exam; stage label is Reports.

### Phase 2 — Clarity & recovery (P1)

**Goal:** Orientation and long-running jobs feel safe.

1. Free Past stage note + honest loaders.
2. Mobile stepper abbreviations.
3. StageRunner **client-only Cancel** + humanized errors + Retry.
4. ScorePanel regenerate discoverability.
5. Forward empty-state primary Generate.
6. Auth / Onboarding copy: account required to save & cast; approximate-time reassurance.
7. Wire checkout when `BILLING_PROVIDER` + keys exist (Billing page already live).

**Exit criteria:** Cancel stops client wait; errors have Retry; free Past note correct; regenerate findable; Billing checkout works when configured.

### Phase 3 — Naming, depth, hygiene (P2–P3)

**Goal:** Depth and cleanup after the funnel is honest.

1. Home mobile declutter.
2. Edit-birth wipe list; IntakeForm voice parity.
3. Button class normalization; Auth honest “forgot password” note.
4. Billing page is the durable upgrade path (live adapters → [`ux-deferred.md`](./ux-deferred.md)).

**Exit criteria:** Vocabulary and intake polish complete; Billing CTA never dead-ends; deferred work parked externally.

**Phase status:** Complete (5 Nov 2026). Deferred external dependencies: [`docs/ux-deferred.md`](./ux-deferred.md).

---

## Part F — Acceptance criteria checklist

Use this when reviewing PRs against this plan.

### Phase 1 checklist

- [x] All primary Begin CTAs open Onboarding (`#/begin`); account required to cast.
- [x] Landing states free vs paid scope without requiring a reading.
- [x] `#/billing` exists; PaidGate primary CTA goes there (not a dead Upgrade).
- [x] Fourth stage labeled **Reports** on Landing, Home, ReadingView.
- [x] Chart first viewport has no naked classical terms outside a disclosure.
- [x] Confirm has helper text about meaning + edit later.
- [x] Atlas shows one quiet full-reading tease line for free users.
- [x] `docs/ui-style-guide.md` updated for Chart / Begin / PaidGate / Billing / Reports naming.

### Phase 2 checklist

- [x] Free user on Past sees accurate locked copy (not “after the past-check”).
- [x] Fetching a reading does not say “Casting your chart” unless casting.
- [x] StageRunner shows Cancel during generate; abort stops client wait UX.
- [x] Common errors show plain language + Retry; raw detail optional.
- [x] From ScorePanel, user can find Regenerate/Redo past-check.
- [x] Mobile stepper abbreviations at ~360px width.
- [x] Empty Forward/Reports shows one clear Generate primary.
- [x] Billing handles checkout return `?status=` + graceful unconfigured provider (live checkout when keys set).

### Phase 3 checklist

- [x] Stage labels match across Landing, Home, ReadingView (**Reports**).
- [x] Edit birth confirmation lists downstream data that will clear.
- [x] Home mobile declutter (glossary/help secondary; Words to Know in disclosure).
- [x] IntakeForm life-language parity with Onboarding.
- [x] Button classes normalized to `btn--*` at call sites (aliases kept in CSS).
- [x] Auth shows honest forgot-password note (email reset → deferred doc).
- [x] Phases 1–3 UI complete; external deps parked in [`ux-deferred.md`](./ux-deferred.md).

---

## Part G — Preserve list (do not regress)

| Strength | Why |
|----------|-----|
| Four-stage mental model | Product spine |
| Past-check before forecast (hard stops) | Differentiation + trust |
| Soft pass line | Avoid shame churn |
| Quiet StageRunner wait UX | Multi-minute LLM retention |
| Atlas life-first reader shell reused for Past/Forward | Learn once |
| Fits / Partly / No + age labels | Novice-capable scoring |
| Optional context withheld until after past | Protocol integrity |
| Tokenized light/dark UI system | Coherence |
| Term explainers / chart-only hiding | Progressive literacy |

---

## Part H — Suggested analytics events (for later)

Not required to start Phase 1 UI, but plan instrumentation:

| Event | Why |
|-------|-----|
| `begin_opened` { source: landing \| topbar \| hash } | Prove single path |
| `intake_completed` | Funnel |
| `chart_confirmed` | Activation |
| `atlas_viewed` | Free value |
| `paid_gate_viewed` / `paid_gate_cta` | Conversion honesty |
| `stage_generate_start` / `cancel` / `error` / `done` | LLM UX |
| `claim_scored` / `scores_submitted` | Past-check completion |

---

## Part I — Product decisions (resolved)

See **Part E → Decisions**. Summary:

1. **Billing page** — primary upgrade surface; plan comparison + checkout when configured.
2. **Reports** — fourth stage name.
3. **Account required to cast.**
4. **Client-only Cancel** on LLM waits.
5. **One quiet atlas tease line.**

### I.1 Billing page plan (from persona feedback)

**Why (PM):** PaidGate without a destination destroys conversion trust. Landing must state free vs paid; Billing is the honest next step.

**Why (UX):** One dedicated surface for plan choice — not a modal stuffed into Past. Keep calm layout: one job (choose/upgrade), one primary CTA.

**Why (Novice):** “Upgrade” must open a page that explains what they get (Past-check → Reports) in life language, with price when known, and never a broken button.

**Surface:** `#/billing` (signed-in). Entry points: PaidGate primary, Landing secondary “See full reading plans”, optional Home/account link for free users.

**MVP contents**
- Current plan badge (free / paid / admin).
- What free includes: Birth Chart + Chart Atlas.
- What full reading includes: Past-check, scoring, Reports (3–6), guidance, living protocol page.
- Primary CTA: “Continue to checkout” → `POST /api/billing/checkout` when configured; else disabled with plain “Checkout is being connected — check back soon” (dev/admin can still flip plan via QA switcher).
- Secondary: back to atlas / home.
- No fake prices until provider config supplies them; optional placeholder copy “Pricing appears at checkout”.

**Later**
- Dodo / Cashfree adapters, webhooks already stubbed (`web/src/lib/billing`, webhook route).
- Manage subscription, invoices, success/cancel return URLs to `#/billing?status=…`.

**IDs:** extend R1, L2 → new **B1–B4** in Part D (Billing surface).

---

## Part J — Traceability matrix (persona → combined IDs)

| Persona ask | Combined IDs |
|-------------|--------------|
| PM: hollow upgrade | R1, L2 |
| PM: dual Begin | L1, A1, O1 |
| PM: Past note / loader | R2, R3 |
| PM: Chart activation | C1 |
| PM: Cancel / regenerate | P1a, P1c, F2 |
| UX: pattern split | O1, L1 |
| UX: Chart vs style guide | C1, DS3 |
| UX: mobile stepper / Forward primary | R6, F1 |
| UX: errors / cancel | P1a, P1b |
| Novice: Chart intimidation | C1, C2 |
| Novice: PaidGate trick | R1 |
| Novice: wizard help | O1, O3, O4 |
| Novice: stage naming | R4, H2, L5 |
| Novice: plain errors | P1b |

---

## Document history

| Date | Change |
|------|--------|
| 2026-11-05 | Initial combined plan from three-persona review |
| 2026-11-05 | Decisions: Billing page, Reports name, account-to-cast, client-only cancel, atlas tease; Phase 1 expanded |
| 2026-11-05 | Phase 2/3 UI: mobile stepper, Reports Generate primary, Home declutter, IntakeForm parity, btn--* normalize, billing return status |
| 2026-11-05 | Phases 1–3 closed; deferred items moved to `docs/ux-deferred.md` |
| 2026-11-05 | Browser validation loop; mojibake copy fix; billing hash status sync; removed unused `NewReadingDialog` |

---

*End of plan. Phases 1–3 shipped; deferred work lives in [`ux-deferred.md`](./ux-deferred.md).*
