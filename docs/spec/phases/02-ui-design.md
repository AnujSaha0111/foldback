# Phase 2 — UI design

Budget: 4 hours. Hats: Product and UI. Depends on phase 0. Dates: 30 October – 1 November 2026. Runs beside phases 1 and 3.

## Read

- `ui.md` (screens, flows, states, copy)
- `scheduler.md` (the board must fit 1280 px with readable labels)
- `demo.md` storyboard (what the video shows)

## Goal

An approved visual design for every screen before any frontend code is written.

## Process (you lead, I assist)

1. **You share** screenshots of interfaces you like: colors, density, cards, typography, dashboards.
2. **I suggest** template and design sources that fit Next.js + MUI. For each one I note the license, because the repository is public and MIT. Templates whose license forbids redistributing source in a public repo (most paid marketplace licenses) cannot be committed. Free MIT-licensed templates, or design inspiration rebuilt in our own code, are fine.
3. **You choose** one direction and list the modifications you want.
4. **We decide the mockup format** at that point: clickable HTML mockups or Figma.
5. **I produce:**
   - design tokens: colors including status colors, type scale and fonts, spacing, radius, shadows, light and dark mode
   - the component inventory (pill, money text, evidence quote, person card, assistant message, proposal card, banner)
   - one mockup per screen: Landing, Sign in, Plans (rule reader in each state: empty, reading, clarify, confirm list), Board (with the Assistant), and Pay (375 px, every status)
6. **You approve.** The result is recorded in `ui.md` → Visual design.

## Constraints the design must respect

- Status words are always visible. Color is never the only signal.
- Bryntum board labels must be readable in a 1280 px recording.
- The Pay page must explain "hold, not a charge" above the fold on a phone.
- WCAG AA contrast. Focus states are visible.
- The PayPal checkout button follows PayPal's own branding guidance and is never restyled to look like something else.

## Exit check

- [ ] Tokens and all screen mockups approved by you.
- [ ] `ui.md` → Visual design is filled in, including the template name and license.
- [ ] `learn/04-ui-design.md` is written.

## Exit note

Chosen template and license: none. Built from scratch in plain HTML and CSS (`docs/design/`), inspired by IBM Carbon and PayPal. No third-party code. Fonts IBM Plex Sans and Mono are SIL OFL.

Modifications asked for: radius 0 everywhere, no serif, avoid the "vibe coded" look, Carbon ledger typography with the Sky poster palette, a two-fold logo (Fold on sky with the fold top-right, back in white on black with the fold bottom-right, tight gap), favicon is the "F" block with its fold, responsive for phone, tablet and desktop.
