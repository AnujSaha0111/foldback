# SEO and discoverability

Owner: Ravi. Checked live on 8 November 2026 with `curl` against https://app.foldback.tech: `/`, `/login`, `/robots.txt`, `/sitemap.xml`, `/pay/<id>`, and an unknown path. The team wants the product site findable, and the repository not findable by "PayPal hackathon" until judging.

## Current state

| Item | Result |
|---|---|
| Titles | `/`: "Foldback · Nobody pays unless the group makes it"; `/login`: "Sign in · Foldback"; pay links: "Your share · Foldback" |
| Meta description | The same sentence on every page |
| Open Graph / Twitter cards | None |
| Social preview image | None |
| Favicon | `/icon.svg` only; no `apple-touch-icon`, no web manifest |
| `robots.txt` | 404 |
| `sitemap.xml` | 404 |
| Canonical link | None (`foldback.vercel.app` 308-redirects to the canonical host, which mostly covers it) |
| Custom 404 | No; Next's default "404: This page could not be found." with `noindex` |
| Pay links | `<meta name="robots" content="noindex">` and `cache-control: private, no-store` |
| Hackathon mentions on the live site | None found (the landing HTML no longer contains "hackathon") |

## [MI-011] No Open Graph or Twitter card, and no social preview image

- Category: SEO / presentation
- Severity: Medium
- Status: Missing
- File: `frontend/src/app/layout.tsx` (`metadata`), `frontend/src/app/page.tsx`
- Code Location: `metadata` sets `title` and `description` only
- Description: When the link is pasted into Devpost, Slack, Discord, LinkedIn or a judge's notes, it shows a bare URL or a plain title with no image.
- Current Implementation: Title and description only.
- Problem: The submission links (Devpost, the video description, the README) are exactly where a preview card appears.
- Why It Matters: Presentation score and click-through from Devpost.
- Recommended Solution: In `layout.tsx` metadata add `metadataBase: new URL("https://app.foldback.tech")`, `openGraph: { title, description, url, siteName: "Foldback", images: ["/og.png"] }` and `twitter: { card: "summary_large_image" }`. Add a 1200×630 `app/opengraph-image.png`: the logo, the line "Nobody pays unless the group makes it." and the four-squares mark. Next serves it automatically. Keep any hackathon wording out of it.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Nishit (frontend)
- Verification Method: https://www.opengraph.xyz/ or the LinkedIn Post Inspector on the live URL; `curl` shows `og:image`.

## [MI-012] No `robots.txt` or `sitemap.xml`

- Category: SEO
- Severity: Low
- Status: Missing
- File: `frontend/src/app/`
- Code Location: none (both 404)
- Description: Crawlers get no guidance. Pay links are protected by a `noindex` meta tag, but they can still be crawled if a link leaks.
- Current Implementation: Nothing.
- Problem: Small for SEO, but `robots.txt` is the cheapest way to keep `/pay/` and `/plans/` out of crawlers entirely.
- Why It Matters: Pay links name real people and amounts (in sandbox plans made by users).
- Recommended Solution: Add `app/robots.ts` (allow `/`, `/login`, `/signup`; disallow `/pay/`, `/plans/`; sitemap URL) and `app/sitemap.ts` listing `/`, `/login`, `/signup`. Optionally also send `X-Robots-Tag: noindex` on `/pay/(.*)` in the MI-007 `headers()` block, which also covers non-HTML fetches.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: MI-007 for the header
- Verification Method: `curl https://app.foldback.tech/robots.txt` and `/sitemap.xml` return 200.

## [MI-013] Every page shares one description; no custom 404

- Category: SEO / UX
- Severity: Low
- Status: Partially Implemented
- File: `frontend/src/app/layout.tsx`, page-level `metadata`
- Code Location: `layout.tsx` description; no `app/not-found.tsx`
- Description: `/login` and pay links reuse the home description. An unknown URL shows Next's unstyled default 404 page, outside the design.
- Current Implementation: As described.
- Problem: Minor. A judge who mistypes a URL from the video sees an off-brand page with no way back.
- Why It Matters: Polish (Design lens).
- Recommended Solution: Give `/login` and `/signup` their own one-line descriptions. Add `app/not-found.tsx` in the design system: "That page does not exist." plus links to Home and Plans.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Nishit (frontend)
- Verification Method: `curl` of `/does-not-exist` shows the custom page, still with `noindex`.

## [MI-014] Only an SVG favicon

- Category: SEO / presentation
- Severity: Low
- Status: Partially Implemented
- File: `frontend/src/app/icon.svg`
- Code Location: `<link rel="icon" href="/icon.svg" type="image/svg+xml">`
- Description: iOS home-screen and some link previews do not use SVG icons.
- Current Implementation: SVG only.
- Problem: Cosmetic.
- Why It Matters: Small polish.
- Recommended Solution: Add `app/apple-icon.png` (180×180) from the existing "F" fold mark. Next adds the link tag automatically.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: None
- Verification Method: The page head includes `apple-touch-icon`.

## [MI-015] Pay links are `noindex` and not cached

- Category: Privacy / SEO
- Severity: Informational
- Status: Implemented
- File: `frontend/src/app/pay/[shareId]/page.tsx`
- Code Location: page `metadata` with `robots: { index: false }`
- Description: Checked live: `<meta name="robots" content="noindex">` and `cache-control: private, no-cache, no-store`.
- Current Implementation: As described.
- Problem: None.
- Why It Matters: Pay links name people and amounts.
- Recommended Solution: Keep; add MI-012's `robots.txt` disallow as a second layer.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: MI-012
- Verification Method: `curl -s https://app.foldback.tech/pay/x | grep robots`.

## Hackathon mentions

The live site has none. The repository still has many, listed in MI-029, which is where the go-public clean-up belongs.
