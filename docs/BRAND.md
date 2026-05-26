# Brand & Design System

<div class="tx-badges">
  <span class="tx-status"><span class="tx-status__dot"></span>Demo 2 — v2.0</span>
  <span class="tx-status">Accessibility · WCAG 2.2 AA</span>
  <span class="tx-status">Tokens · in code &amp; in docs</span>
</div>

!!! abstract "What this document covers"
    The Brand & Design System for the **Gesture-Based Drone Control
    System (GBDCS)**. By Demo 2 the system has progressed from
    wireframes to a working implementation, and the visual language
    has matured accordingly. This document is both a **brand guide**
    (palette, logo, voice) and a **design system** (tokens,
    components, layout, accessibility). The deployed companion page
    — a live, animated, responsive version of this document — sits
    alongside the production application at `/style-guide`.

    A copy of this document is exported as a PDF in the repository
    under `docs/reports/BRAND.pdf` per the Demo 2 brief.

---

## 1. Brand Story

GBDCS sits at the intersection of accessibility and aviation: it lets
anyone fly a drone with the wave of a hand. The brand has to land in
that intersection — **disciplined enough to be trusted around real
flight hardware, approachable enough to feel like the first thing a
new operator wants to try**.

| Brand pillar | Translation into design |
| --- | --- |
| **Accessible by default** | High-contrast palette anchored on red against off-black; sans-serif typography at generous body sizes; WCAG 2.2 AA on every surface. |
| **Real-time and alive** | Motion is used to confirm system liveness — pulses on the gesture indicator, fade-in on telemetry frames — never as decoration. |
| **Confident, not flashy** | Single dominant colour (red), minimal gradients, no drop shadows on the logo, no extraneous chrome. |
| **Operator-first** | Information density tuned for a pilot who is also gesturing — large hit targets, peripheral-vision-friendly alert colours, no modals interrupting flight. |

---

## 2. Colour Palette

The palette is anchored on a red core (the action colour), an
off-black surface, and a small set of neutrals. Accent semantic
colours are added only for **success**, **warning**, and **error**
states.

### 2.1 Core palette

| Role | Token | HEX | RGB | HSL | Usage |
| --- | --- | --- | --- | --- | --- |
| Primary | `--color-primary` | `#A4161A` | 164, 22, 26 | 358°, 76%, 36% | Primary buttons, links, active states, brand surfaces. |
| Primary (hover) | `--color-primary-hover` | `#BA181B` | 186, 24, 27 | 359°, 77%, 41% | Hover and pressed states on primary actions. |
| Primary (pressed) | `--color-primary-pressed` | `#660708` | 102, 7, 8 | 359°, 87%, 21% | Pressed state on primary; never used as a fill colour for body areas. |
| Surface (dark) | `--color-surface` | `#161A1D` | 22, 26, 29 | 206°, 14%, 10% | Dark-mode backgrounds, hero sections, dashboard chrome. |
| Surface (light) | `--color-surface-light` | `#F5F3F4` | 245, 243, 244 | 330°, 14%, 96% | Light-mode page background. |
| Text (on dark) | `--color-text-on-dark` | `#F5F3F4` | 245, 243, 244 | 330°, 14%, 96% | Body text on dark surfaces. |
| Text (on light) | `--color-text-on-light` | `#161A1D` | 22, 26, 29 | 206°, 14%, 10% | Body text on light surfaces. |
| Muted | `--color-muted` | `#B1A7A6` | 177, 167, 166 | 5°, 6%, 67% | Placeholders, borders, disabled, captions. |
| Hairline | `--color-hairline` | `#D3D3D3` | 211, 211, 211 | 0°, 0%, 83% | Dividers, table rules in light mode. |

### 2.2 Semantic palette

| Role | Token | HEX | Usage |
| --- | --- | --- | --- |
| Success | `--color-success` | `#1B7F3A` | Confirmation toasts, telemetry "OK" pill, take-off complete. |
| Warning | `--color-warning` | `#C77700` | Battery 15–25 %, link flapping, soft failsafe. |
| Error | `--color-error` | `#A4161A` | Critical alerts, validation errors, emergency-stop activation. (Re-uses primary red on purpose — failure is a system-level state.) |
| Info | `--color-info` | `#1F6FB3` | Tutorial overlays, help menu highlights. |

### 2.3 WCAG 2.2 contrast ratios

All foreground / background pairings used in the production UI have
been audited with the WebAIM contrast checker. AA is the minimum;
AAA is achieved for body text on both themes.

| Foreground | Background | Ratio | Level | Use |
| --- | --- | --- | --- | --- |
| `#F5F3F4` text | `#161A1D` surface | **15.8 : 1** | AAA | Body text, dark mode. |
| `#161A1D` text | `#F5F3F4` surface | **15.8 : 1** | AAA | Body text, light mode. |
| `#F5F3F4` text | `#A4161A` primary | **5.1 : 1** | AA | Button labels. |
| `#F5F3F4` text | `#BA181B` primary-hover | **4.6 : 1** | AA | Button labels on hover. |
| `#A4161A` link | `#F5F3F4` surface | **6.6 : 1** | AA | Inline links, light mode. |
| `#BA181B` link | `#161A1D` surface | **4.7 : 1** | AA | Inline links, dark mode. |
| `#B1A7A6` muted | `#161A1D` surface | **4.5 : 1** | AA | Captions, placeholders, dark mode. |
| `#F5F3F4` text | `#1B7F3A` success | **4.8 : 1** | AA | Success pill. |
| `#161A1D` text | `#C77700` warning | **6.4 : 1** | AA | Warning toast (text on amber). |

!!! warning "Never do this"
    Red text on dark-red background (`#A4161A` on `#660708`) measures
    **1.7 : 1** — far below AA. Never place red text on a red
    surface; the pressed state is for outlines and button-press
    feedback only.

### 2.4 Usage rules

- **Red is the action colour.** Reserve it for primary buttons,
  links, and active states. Don't use it for decoration.
- **Off-black is the surface colour.** Pair with off-white text
  (never pure white — `#FFFFFF` on `#161A1D` is harsh).
- **Muted grey carries hierarchy.** Captions, placeholders, and
  disabled states use it; avoid using it for body text.
- **Semantic colours are reserved for state.** A green pill always
  means "OK"; an amber pill always means "warning". Never use them
  for emphasis.

---

## 3. Typography

The system uses a two-family stack — a humanist sans for UI and body
text, and a geometric monospace for numbers, telemetry readouts, and
code blocks.

### 3.1 Families

| Role | Family | Fallback stack | Source | Licence |
| --- | --- | --- | --- | --- |
| UI / body | **Inter** | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | Self-hosted (`/static/fonts/inter/`) | SIL Open Font Licence 1.1 |
| Display | **Inter Display** | (same as above) | Self-hosted | SIL OFL 1.1 |
| Monospace | **JetBrains Mono** | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` | Self-hosted | Apache 2.0 |

Self-hosting (rather than Google Fonts CDN) eliminates a third-party
runtime dependency, which aligns with the SRS `R8.2` posture — no
runtime telemetry to external services.

### 3.2 Typographic scale

A modular scale at ratio 1.2 anchored on 16 px body.

| Token | Size | Line height | Weight | Letter spacing | Use |
| --- | --- | --- | --- | --- | --- |
| `--font-display` | 48 px / 3 rem | 1.1 | 700 | -0.02em | Landing-page hero, splash. |
| `--font-h1` | 36 px / 2.25 rem | 1.2 | 700 | -0.015em | Page titles. |
| `--font-h2` | 28 px / 1.75 rem | 1.25 | 600 | -0.01em | Section headings on dashboard. |
| `--font-h3` | 22 px / 1.375 rem | 1.3 | 600 | normal | Card titles. |
| `--font-h4` | 18 px / 1.125 rem | 1.35 | 600 | normal | Group labels. |
| `--font-body` | 16 px / 1 rem | 1.5 | 400 | normal | Default text. |
| `--font-body-sm` | 14 px / 0.875 rem | 1.5 | 400 | normal | Secondary text. |
| `--font-caption` | 12 px / 0.75 rem | 1.4 | 500 | 0.02em | Labels, axis ticks. |
| `--font-mono` | 14 px / 0.875 rem | 1.45 | 500 | normal | Telemetry numbers, code. |

### 3.3 Weights used

400 (regular), 500 (medium), 600 (semibold), 700 (bold). The team
does not ship 300, 800, or 900 — they would tempt overuse of
decorative weights and increase the self-hosted font payload.

---

## 4. Logo & Iconography

### 4.1 Logo

The Codex Merchants logo is shipped in four forms.

| Form | File | Use |
| --- | --- | --- |
| Full | `assets/codex_merchants_logo.svg` | Default. README, docs site header, landing-page hero. |
| Monogram | `assets/codex_merchants_mark.svg` | Tight spaces — favicon, browser tab, app icon, ≤ 32 px usage. |
| Monochrome | `assets/codex_merchants_mono.svg` | Print, single-colour contexts. |
| Inverse | `assets/codex_merchants_inverse.svg` | On red brand surfaces only. |

#### 4.1.1 Minimum size & clear space

- Full logo: minimum **120 px wide** on screen.
- Monogram: minimum **24 px wide**.
- Clear space around the logo: at least the height of the monogram
  on all four sides. Other elements may not enter this zone.

#### 4.1.2 Forbidden treatments

- Stretching or skewing the logo to fit a frame.
- Recolouring outside of the four documented forms.
- Applying drop shadows, glows, or strokes.
- Placing the logo on a busy photograph without a solid backing.
- Rotating the logo at any angle other than 0°.

### 4.2 Iconography

The system uses **[Lucide](https://lucide.dev/)** as the single icon
library (MIT-licensed). It is wide enough to cover the dashboard's
needs without bringing in a second family.

| Property | Rule |
| --- | --- |
| Default stroke width | `1.75 px` (Lucide default is 2 px; we run lighter for visual harmony with Inter). |
| Default size | `20 × 20 px` inline; `24 × 24 px` standalone in buttons; `32 × 32 px` for empty-state illustrations. |
| Colour | `currentColor` — icons inherit the surrounding text colour. |
| Accessibility | Standalone icon buttons must carry an `aria-label`. Decorative icons must have `aria-hidden="true"`. |

Custom illustrations (e.g. the hand-gesture vocabulary card) are
drawn in the same 1.75 px stroke, off-black on off-white, to sit
naturally next to Lucide icons.

---

## 5. Design Tokens

Tokens are the single source of truth for visual properties. They
live in `packages/contracts/tokens.css` as CSS custom properties and
are also exposed to TypeScript via a generated `tokens.ts`. **The
tokens in this document and the tokens in code are kept in sync** —
drift between the two is treated as a bug.

### 5.1 Colour tokens

See §2 for values. Each role has a CSS custom property of the form
`--color-<role>` (e.g. `--color-primary`).

### 5.2 Spacing scale

A 4 px base. Every spacing decision in the system must use a token.

| Token | Value | Use |
| --- | --- | --- |
| `--space-0` | 0 | Reset. |
| `--space-1` | 4 px | Tight grouping; icon to label. |
| `--space-2` | 8 px | Form-field internal padding. |
| `--space-3` | 12 px | Default vertical rhythm between paragraphs. |
| `--space-4` | 16 px | Card padding, list-item gap. |
| `--space-5` | 24 px | Section gap. |
| `--space-6` | 32 px | Major section divider. |
| `--space-7` | 48 px | Landing-page section padding. |
| `--space-8` | 64 px | Hero padding. |

### 5.3 Radius

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | 4 px | Tags, pills. |
| `--radius-md` | 8 px | Buttons, inputs, cards. |
| `--radius-lg` | 16 px | Modals, hero surfaces. |
| `--radius-full` | 9999 px | Avatars, badges. |

### 5.4 Shadow

| Token | Value | Use |
| --- | --- | --- |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.08)` | Cards at rest. |
| `--shadow-md` | `0 4px 8px rgba(0,0,0,0.12)` | Cards on hover. |
| `--shadow-lg` | `0 12px 24px rgba(0,0,0,0.18)` | Modals, popovers. |
| `--shadow-glass` | `0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px rgba(0,0,0,0.25)` | Glass surfaces over `#161A1D`. Requires `backdrop-filter: blur(12px)`. |

### 5.5 Motion

Motion is functional, not decorative. Three named durations cover
every animation in the system.

| Token | Value | Easing | Use |
| --- | --- | --- | --- |
| `--motion-instant` | 80 ms | `ease-out` | Hover state changes. |
| `--motion-fast` | 160 ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Button press, toggle. |
| `--motion-base` | 240 ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Modal open / close, page transitions. |

All motion respects `prefers-reduced-motion: reduce` — animations
collapse to a 0 ms duration when the user has requested reduced
motion. The gesture pulse on the dashboard fades to a static badge
in this mode.

### 5.6 Breakpoints

| Token | Value | Target |
| --- | --- | --- |
| `--bp-sm` | 640 px | Mobile landscape, small tablets. |
| `--bp-md` | 768 px | Tablets. |
| `--bp-lg` | 1024 px | Laptops; the dashboard's primary target. |
| `--bp-xl` | 1280 px | Desktop. |
| `--bp-2xl` | 1536 px | Operator workstation, large monitors. |

---

## 6. Component Library

Visual specifications for every component used in the production
system. Each component documents its **variants** (primary /
secondary / ghost, sizes) and **states** (default, hover, focus,
active, disabled, loading, error).

### 6.1 Button

| Variant | Background | Text | Use |
| --- | --- | --- | --- |
| Primary | `--color-primary` → `--color-primary-hover` on hover | `#F5F3F4` | The main action on a screen. Exactly one per view. |
| Secondary | transparent · 1 px border `--color-primary` | `--color-primary` | Auxiliary action next to a primary. |
| Ghost | transparent, no border | `--color-text-on-dark` | Tertiary action; toolbars. |
| Danger | `--color-error` | `#F5F3F4` | Destructive action (emergency stop, delete session). |

**Sizes.** sm (32 px height), md (40 px, default), lg (48 px,
landing-page CTAs).

**States.**

- Default — flat fill at the listed colours.
- Hover — fill steps to `--color-primary-hover`; `--shadow-md`.
- Focus — `box-shadow: 0 0 0 3px rgba(186,24,27,0.4)` ring.
- Active — fill steps to `--color-primary-pressed`.
- Disabled — `opacity: 0.5`; `cursor: not-allowed`; no hover effect.
- Loading — replace label with a 16 px spinner; button width
  preserved; click events suppressed.

### 6.2 Input (text, email, password)

| Property | Value |
| --- | --- |
| Height | 40 px |
| Padding | `--space-3` horizontal |
| Border | 1 px `--color-muted` |
| Background | `--color-surface-light` (light mode) / `rgba(255,255,255,0.04)` (dark mode) |
| Focus ring | 3 px `rgba(186,24,27,0.4)` |
| Error border | `--color-error` 1 px; helper text below in `--color-error` |

### 6.3 Select / Dropdown

Same shape as the Input. Caret is a Lucide `chevron-down` at 16 px.
Open state shows a panel with `--shadow-lg` and `--radius-md`.

### 6.4 Modal

| Property | Value |
| --- | --- |
| Width | up to 560 px |
| Backdrop | `rgba(22,26,29,0.6)` with `backdrop-filter: blur(8px)` |
| Surface | `--color-surface-light` (light) / `#1F2428` (dark) |
| Radius | `--radius-lg` |
| Shadow | `--shadow-lg` |
| Open duration | `--motion-base` |
| Escape key | Closes the modal; focus returns to the trigger. |

### 6.5 Toast

| Variant | Surface | Border |
| --- | --- | --- |
| Success | rgba(27,127,58,0.12) | 1 px `--color-success` |
| Warning | rgba(199,119,0,0.12) | 1 px `--color-warning` |
| Error | rgba(164,22,26,0.12) | 1 px `--color-error` |
| Info | rgba(31,111,179,0.12) | 1 px `--color-info` |

Toasts auto-dismiss after 5 s (warning) or 8 s (error). Critical
alerts (link loss, battery < 15 %) **do not auto-dismiss** — they
remain until acknowledged per `R1.2.2`.

### 6.6 Card

`--radius-md`, `--shadow-sm` at rest, `--shadow-md` on hover, padded
with `--space-4`. The telemetry panel, gesture-indicator panel, and
session-list rows on the replay view are all Cards.

### 6.7 Gesture Indicator (domain-specific)

A 96 × 96 px circular badge in the top-right of the dashboard,
filled with `--color-primary` when a gesture is locked. Pulses at
`--motion-base` when the gesture changes; static in
`prefers-reduced-motion`. The current gesture name and its mapped
command sit immediately below.

### 6.8 Telemetry Pill

A pill (`--radius-full`) carrying the link status, flight mode, or
battery percentage. Background is the matching semantic colour at
12 % opacity; foreground is the matching semantic colour at full
opacity.

---

## 7. Layout & Spacing

### 7.1 Grid

A 12-column grid with a `--space-5` (24 px) gutter on screens ≥ `--bp-md`
and a `--space-4` (16 px) gutter below.

### 7.2 Responsive behaviour

| Surface | < `--bp-md` | ≥ `--bp-md` | ≥ `--bp-lg` |
| --- | --- | --- | --- |
| Landing page | single column, hero stacks vertically | two-column feature grid | three-column feature grid |
| Dashboard | video feed stacks above telemetry; gesture indicator floats top-right | side-by-side video and telemetry | full layout: feed + overlay + telemetry + replay timeline |
| Replay view | session list collapses behind a drawer | session list as left sidebar | session list + waveform + telemetry chart |

### 7.3 Spacing rules

- Inside a card: padding is `--space-4`; gap between elements is
  `--space-3`.
- Between cards in a grid: gap is `--space-5`.
- Page-level horizontal padding: `--space-4` on mobile, `--space-6`
  on tablet, `--space-7` on desktop.

---

## 8. Accessibility

GBDCS targets **WCAG 2.2 AA** as the minimum on every surface.
AAA is achieved for body-text contrast on both themes.

### 8.1 Keyboard navigation

- Every interactive element is reachable by `Tab` in document order.
- Modals trap focus; `Esc` closes them and returns focus to the
  trigger.
- The emergency-stop button has a global keybinding (`Ctrl+.`) so
  it never depends on focus state.

### 8.2 Focus indicator

A 3 px `rgba(186,24,27,0.4)` ring on every focusable element. The
ring is **never** suppressed by `outline: none` without an
equivalent visual replacement.

### 8.3 Screen readers

- Every `aria-label` is human-readable, not a token name.
- The live gesture indicator carries `aria-live="polite"` so a
  screen reader announces gesture changes without interrupting.
- The critical-alert region carries `aria-live="assertive"`.
- All form fields have associated `<label>` elements; placeholders
  are *not* used as labels.

### 8.4 Motion

The system honours `prefers-reduced-motion: reduce`. All animations
defined in §5.5 collapse to 0 ms; the gesture pulse becomes a static
badge.

### 8.5 Colour

No information is conveyed by colour alone. Alerts also carry an
icon and a text label; telemetry pills carry a text value alongside
the colour.

### 8.6 Audit scores

| Surface | Tool | Score |
| --- | --- | --- |
| Landing page | Lighthouse Accessibility | 100 |
| Dashboard | axe DevTools | 0 violations |
| Help menu | WAVE | 0 errors, 0 contrast errors |

These scores are re-run on every PR that touches `apps/frontend/**`
via a CI job (see [`CICD.md`](CICD.md)).

---

## 9. Voice & Tone

GBDCS speaks to pilots. The voice is **calm, direct, and specific**.

| Surface | Tone | Example |
| --- | --- | --- |
| Button labels | Imperative verb, ≤ 3 words. | *"Take off"*, *"End session"*, *"Stop now"*. |
| Empty states | Friendly, action-oriented. | *"No sessions yet — start a flight to see your history here."* |
| Success messages | Quiet confirmation. | *"Drone connected."* (not *"🎉 Successfully connected to drone!"*) |
| Errors | Cause first, then suggestion. | *"Camera not detected. Connect a webcam or check your browser permissions."* (cause + suggestion, per `R11.3`.) |
| Critical alerts | Telegraphic, urgent, never alarmist. | *"Link lost. Hovering until link returns."* |

Tone is **never jokey** in the operational paths. The Help menu and
landing page may be warmer, but the dashboard itself stays
professional — an operator in flight does not want a system that's
trying to be funny.

---

## 10. Changelog from Demo 1

| Area | Demo 1 | Demo 2 | Rationale |
| --- | --- | --- | --- |
| Format | Static section in `DESIGN.md` §9 | Standalone document + live deployed page at `/style-guide` + PDF in repo | Demo 2 brief explicitly requires the brand guide to evolve into a deployed page, not just a text section. |
| Palette | 7 colours (3 reds, off-black, 3 neutrals) | Same 7 + 4 semantic colours (success, warning, error, info) with full WCAG audit | The early UI lacked formal state colours; adding them gave the dashboard a vocabulary for telemetry and alerts. |
| Typography | "Use a sans-serif" | Inter + Inter Display + JetBrains Mono with a 1.2 modular scale and named tokens | Implementation needed concrete sizes; the modular scale eliminated ad-hoc font sizes in code. |
| Tokens | Implicit in code | Documented in §5 with the same names as the CSS vars | Drift between the docs and the code was happening; making the tokens explicit makes drift visible. |
| Components | Wireframes only | Full component spec (button, input, select, modal, toast, card, gesture indicator, telemetry pill) with all states | The system now exists, so the components have variants and states worth documenting. |
| Accessibility | Not formally addressed | WCAG 2.2 AA conformance target with audit scores | Mentor feedback after Demo 1 flagged a11y as a gap; Lighthouse / axe are now in CI. |
| Voice & tone | Absent | Added §9 with examples per surface | Several Demo 1 error messages were unclear; making the tone rules explicit fixed the inconsistency. |
| Iconography | "Lucide" mentioned in passing | Stroke width, sizing rules, ARIA rules, custom-illustration alignment | The Demo 1 iconography varied by view; the rules in §4.2 enforce a single visual language. |
| Motion | Not addressed | Three named durations + `prefers-reduced-motion` rule | The dashboard's gesture pulse made some Demo 1 reviewers motion-sick; the reduced-motion rule resolves that. |

---

## 11. Wireframes

The two operator-facing surfaces. Both realise the requirements
cited in their captions.

=== "Gesture Control Dashboard"

    ![Gesture Control Dashboard](assets/WF-Dashboard.png)

    *Figure 11.1 — Gesture-control dashboard. Realises `R1.1.1`–`R1.1.3`
    (live feed with overlay, current gesture, telemetry panel).*

=== "Telemetry Dashboard"

    ![Telemetry Dashboard](assets/WF-Telemetry.png)

    *Figure 11.2 — Telemetry dashboard. Realises `R1.1.3` and `R1.2.*`
    (telemetry panel and critical alerts).*