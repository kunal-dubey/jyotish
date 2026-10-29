# Jyotish Protocol — UI style guide

Use this for every web UI change. Prefer existing tokens and classes in `web/src/app/globals.css` and `web/src/app/ref-ux.css` over new one-offs. The visual system follows the Oct 2026 UX spec and component library: light/dark by device appearance, Jost for display, system UI for body, one accent on actions and chart data.

**Product voice:** simple and generic first; astrology detail is a deeper layer you open (term explainers, specialist maps), never the door.

## Spec sources

- UX: four stages (Birth Chart → Chart Atlas → Past-Check → Reports), hierarchy principles, screen states.
- Components: colour roles, type scale, buttons, segmented controls, progress, term links, sheets.

## Voice of the interface

- Calm, precise. Short sentences. No hype, no emoji chrome, no dashboard clutter.
- One job per screen or section: title → one supporting line → the control → the action.
- Prefer life language (focus, this period, fits / partly / no) over classical terms (lagna, dasha) until the user opens a term explainer or a specialist map.

## Foundations

### Colour (light + dark via `prefers-color-scheme`)

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--bg` / `--ground` | `#F2F2F7` | `#000000` | Page |
| `--bg-2` / `--s1` | `#FFFFFF` | `#1C1C1E` | Lists, panels, hero |
| `--label` / `--ink` | `#1C1C1E` | `#F5F5F7` | Primary text |
| `--label-2` / `--ink-2` | `#4F4F55` | `#AEAEB2` | Secondary |
| `--accent` / `--gold` | `#7A5818` | `#D9B77E` | Primary action + chart data |
| `--accent-tint` / `--gold-tint` | `#F5ECDB` | `#2E2618` | Current stage, rising highlight |
| `--ok` | `#1E7A3D` | `#7FD69E` | Done / confirmed |
| `--warn-tint` | `#FFF4E0` | `#2A2114` | Below pass, reset notes |
| `--danger` | `#C0281E` | `#FF8A80` | Errors |

Surfaces step by tone. No outlines or shadows at rest (popovers/sheets may use `--shadow-pop`). Accent fills the primary button and chart data — not chrome selection states.

### Type

| Face | Use |
| --- | --- |
| Jost (`--font-jost`) | Brand, display titles, names, scores |
| System UI (`--font-ui`) | Body, labels, controls |

- Display titles: weight ~500, tight leading, slight negative tracking.
- Body ~17px / 1.6.
- No uppercase kickers.

### Radii

| Token | Value | Use |
| --- | --- | --- |
| `--r` | 12px | Buttons, panels |
| `--r-ctrl` | 10px | Segmented controls |
| `--r-group` | 14px | Grouped lists, sheets |
| `--r-chart` | 6px | Chart boxes |

### Chart-only detail

There is no global Plain Words / Chart Terms toggle. Default copy stays in life language.

- `.chart-only` is hidden. Classical placements and specialist footnotes live behind term explainers and “Explore specialist maps”.
- Term popovers show both the chart name and the plain label.

### Term links

Dotted accent underline (`.term`). Wide screens: hover opens a viewport-clamped popover; phones: bottom sheet. First mention of a technical word should be a term link when a glossary entry exists.

### Motion

- Respect `prefers-reduced-motion`.
- Allowed: `.enter` / `.enter-slow`, `.pulse`, progress fills, stage-wait ring, `.fade-claim`.
- Durations: `--dur-sm` 160ms, `--dur-md` 240ms with `--ease-out`.

## Layout

- Shell: `.app-shell` (max 1320px, gutters via `--gutter`).
- Sticky header: `.topbar` — solid ground, no bottom rule.
- Brand: `.brand` + `.brand__mark` (accent) + `.brand__name` (“Jyotish”).
- Library: hero card + other readings + “Words to Know” aside + disclosures.
- Reading: ~248px rail + main; stage title receives focus on arrival; one filled primary per screen.
- Cards only as interactive or list containers (`.panel`, hero, grouped lists).

## Components

### Buttons — `.btn`

| Class | When |
| --- | --- |
| `.btn.btn-primary` / `.btn--primary` | One primary next step (accent fill) |
| `.btn--ghost` / `.btn-ghost` | Secondary on `--fill-btn` |
| `.btn--tinted` | Bar actions (New Reading) |
| `.btn--quiet` / `.btn-quiet` | Tertiary |

Press scales to 98%. Focus: 3px gold ring. Height 44px.

### Segmented — `.seg`

Selected segment is raised white (or dark surface), not gold. Gold is reserved for actions.

### Past-check scoring

Fits = 2, Partly = 1, No = 0. Claim count is whatever the generated report produced. Max points = *n* × 2. Pass line = round(7/12 of max). Below pass still opens reports with a suggestion notice.

### Fields

| Pattern | Class |
| --- | --- |
| Standard | `.field` + `.input` |
| Conversational | `.flow-input` |
| Exclusive options | `.choice` |
| Score review | `.score-choice` or `.seg` |
| Notes | `.note`, `.note-warn`, `.note-bad` |

## Taste / house rules

- No decorative eyebrows, violet accents, emoji chrome, or multi-layer shadows on resting chrome.
- Hierarchy: plain answer → reason → chart. One filled primary button per screen.
- When changing look: update tokens first, then surfaces; keep aliases until call sites are gone.
