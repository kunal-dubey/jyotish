# Jyotish Protocol — UI style guide

Use this for every web UI change. Prefer existing tokens and classes in `web/src/app/globals.css` over new one-offs. When something must be new, extend the system — do not invent a parallel look.

## Voice of the interface

- Calm, precise, slightly literary. Short sentences. No hype, no emoji chrome, no dashboard clutter.
- One job per screen or section: eyebrow → title → one supporting line → the control → the action.
- Copy explains *why* a field matters; the control itself stays quiet. Do not duplicate instructions on the widget (no “1–12”, “required”, “saved as…” under inputs when the page already said it).

## Foundations

### Color (CSS variables on `:root`)

| Token | Role |
| --- | --- |
| `--paper` / `--paper-2` | Page and soft surface |
| `--ink` / `--ink-2` | Primary / secondary text |
| `--line` | Hairline borders and dividers |
| `--accent` / `--accent-wash` | Primary actions, focus, active steps |
| `--gold` | Emphasis kickers, highlights (use sparingly) |
| `--ok` / `--bad` / `--unclear` | Score / status only |
| `--focus` | Focus ring |
| `--veil` / `--star` | Atmosphere washes and speckles |

Light and dark both come from `prefers-color-scheme`. Always use these variables (or `color-mix` from them). Never hard-code purple gradients, cream+terracotta “AI defaults,” or neon glow stacks.

### Type

| Face | Variable / class | Use |
| --- | --- | --- |
| Newsreader | `--font-newsreader`, `.serif` | Brand, titles, reading prose, large conversational inputs |
| IBM Plex Sans | `--font-plex` (body default) | UI chrome, labels, tables, buttons |

- Titles: `.serif` + fluid `clamp(...)`, tight leading (`~1.02–1.15`), slight negative tracking.
- Kickers: `.eyebrow` (11px, uppercase, wide tracking). Gold accent on landing/onboarding kickers: `eyebrow text-[var(--gold)]`.
- Secondary copy: `.muted` (`--ink-2`).
- Body ~15px / 1.5. Prose readings use `.prose` (Newsreader, capped measure ~42rem).

### Atmosphere

Public and onboarding surfaces use `.sky` (radial washes + star dust) and optional `.orb` / `.orb-a` / `.orb-b` with `.drift`. Keep it subtle — atmosphere is background, not decoration competing with content.

### Motion

- Respect `prefers-reduced-motion`. Animations live under that media query.
- Allowed patterns: `.enter` / `.enter-slow` (fade-up), `.drift` (orbs), `.pulse`, progress fills, stage-wait ring.
- Prefer presence over noise: one entrance per step, not stacked micro-interactions.

## Layout

- Page shell: `mx-auto max-w-[78rem] px-4 sm:px-5 md:px-8` (narrower for single-column flows: ~26–34rem).
- Sticky header: `.site-header` with blur and translucent paper.
- Safe areas: body and header already pad for notches; keep primary actions above the home indicator.
- Mobile: primary `.btn-primary` often full-width; use `.btn-row` / `.btn-row-stack` for action groups.
- Avoid card grids in heroes. `.panel` / `.panel-soft` are for *interactive or summary blocks* (reading list rows, confirmations), not marketing chrome.

## Components (reuse these)

### Buttons — `.btn`

| Class | When |
| --- | --- |
| `.btn.btn-primary` | One primary next step |
| `.btn` | Secondary outlined |
| `.btn-ghost` | Soft / glassy secondary |
| `.btn-quiet` | Back / tertiary text control |

Pill shape, quiet hover, primary may take a soft accent glow on hover. Do not invent new button geometries.

### Fields

| Pattern | Class | When |
| --- | --- | --- |
| Standard form | `.field` + `.input` | Intake edit, auth, dense forms |
| Conversational | `.flow-input` (+ `.flow-input-sm`) | Onboarding steps — large underlined Newsreader |
| Exclusive options | `.choice` (pill radios) | Time source, AM/PM, similar enums |
| Segmented score (compact) | `.seg` | Dense score toggles |
| Score review | `.score-choice` | Large right / wrong / unclear choices |
| Notes | `.note`, `.note-warn`, `.note-bad` | Inline guidance and errors |

Rules:

- Labels are short; hints go in `.muted` / `<small>`, not inside the control chrome.
- Focus: accent border + wash (`box-shadow` on `.input`); underline-only on flow/time digits.
- Mobile inputs stay ≥16px equivalent so iOS does not zoom (see existing media query for `.input` / `.flow-input`).

### Time of birth — `.time-field`

- Digits: underlined Newsreader, hour + colon + minute.
- Meridiem: `.choice` pills (AM / PM), not a native `<select>`.
- No per-unit captions or “saved as 24h” footnotes; parent copy owns context.
- Value committed as `HH:MM` 24-hour for the API (`TimeField` handles conversion).

### Navigation & progress

- Stage list (desktop): `.rail` with `.dot` / `.done` / optional `.stop` / `.highlight`.
- Stage chips (mobile): `.rail-scroll`.
- Linear progress: `.progress-track` / `.progress-fill`.
- Waiting on a long stage: `.stage-wait` (+ ring, step list, bar) — quiet, no streaming prose dump.

### Data display

- Definition lists: `.meta-grid`.
- Tables: `.tbl` or prose tables; uppercase micro-headers for column labels.
- Chart SVG: `.jy-chart` inherits ink colors.
- “See more”: `.see-more` text link, not a second primary button.

## Composition recipes

### Landing / branded first viewport

1. `.sky` + orbs  
2. Brand-scale Newsreader wordmark  
3. One headline, one muted paragraph, one CTA group  
4. Optional later section (e.g. three principles under a hairline) — not in the first breath as competing chrome  

### Onboarding step

1. Back + step index + progress track  
2. Gold `.eyebrow` kicker  
3. Serif title + muted body  
4. One control cluster  
5. One primary Continue  

### Intake / edit form

Two-column on large screens: narrative left, fields right. Use `.field` / `.input` / `.choice`. Warnings with `.note-warn` only when the data warrants it (e.g. rounded times).

### Reading workspace

Prose in `.prose`. Structural chrome (rail, panels, score) stays Plex. Open-report emphasis: `.report-open`.

## Do / don’t

**Do**

- Extend tokens and shared classes.
- Keep one primary action per view.
- Match existing radius language: inputs ~4px, panels ~14–16px, pills `999px`.
- Use hairlines (`.hair` / `--line`) instead of heavy shadows.
- Write accessible names (`aria-label`, fieldset legends) even when visual labels are minimal.

**Don’t**

- Add drop shadows, neon glows, badge stacks, or stat strips.
- Introduce Inter/Roboto/system-only UI or a new accent hue.
- Nest cards inside cards; don’t card the hero.
- Over-label simple controls (hour/minute ranges, “required” under every unit).
- Stream model tokens into the UI when a quiet wait state exists.
- Ship motion that ignores reduced-motion preferences.

## Checklist for a UI PR

1. Uses existing CSS variables and classes (or documents a deliberate addition to `globals.css`).  
2. Matches type roles (serif for voice, Plex for chrome).  
3. Works in light and dark.  
4. Usable at ~360px width; primary actions reachable.  
5. Focus visible; radios/choices keyboard-reachable.  
6. Copy is calm and non-duplicative with surrounding page text.  
7. No new decorative system that would look wrong next to Landing / Onboarding / Home.

## Source of truth

- Tokens & components: `web/src/app/globals.css`
- Fonts: `web/src/app/layout.tsx` (Newsreader + IBM Plex Sans)
- Reference screens: `Landing.tsx`, `Onboarding.tsx`, `Home.tsx`, `AuthScreen.tsx`, `IntakeForm.tsx`, `TimeField.tsx`
