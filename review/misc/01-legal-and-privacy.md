# Legal, privacy and compliance

Owner: Ravi. This is an engineering review, not legal advice. Nothing here claims Foldback complies with any law. Where a point needs a qualified lawyer, it says so.

Sources checked: the live site (https://app.foldback.tech, 8 November 2026), `frontend/src/app/`, `backend/src/http/cookies.ts`, `backend/src/services/aiBudget.service.ts` (`hashIp`), `backend/src/services/housekeeping.service.ts`, `backend/src/integrations/paypal/client.ts` (`storable`), `docs/spec/ai.md` (Privacy), `docs/spec/demo.md`, and the external sources cited inline.

## What the app collects (verified in code)

| Data | Where | Retention | Notes |
|---|---|---|---|
| Email, password hash, display name | `users` | Until deleted; no self-service delete found | Members only |
| Guest accounts | `users` (`kind = 'guest'`) | Swept with their data 7 days after creation (`sweepExpiredGuests`, every 6 hours) | No personal data asked |
| Pasted group chat (`rule_text`) and the reading | `contracts` | With the plan | May contain real names and messages if a user pastes a real chat |
| Names of payers, amounts | `shares` | With the plan | Shown on public pay links (unguessable URL, `noindex`) |
| HMAC of the visitor's IP | `ai_usage.ip_hash` | 90 days (`yarn housekeeping`, launchd) | Keyed hash, IP never stored |
| PayPal order, authorization and capture ids; redacted responses | `paypal_operations` | Kept (frozen rows) | `payer`, `payment_source` and `purchase_units[].shipping` are removed before storing (`storable`, client.ts 175–190) |
| Session cookie | Browser | Session TTL | `httpOnly`, `secure`, `SameSite=Lax` |
| Theme choice | `localStorage` | Until cleared | Preference only |
| Chat and plan text sent to AI providers | DeepSeek, Groq, Google (Gemini) | Per the provider's terms | See AI-023 |

No analytics, advertising or tracking scripts are loaded (checked: no analytics packages in either `package.json`, and the live page loads only Vercel-hosted assets and the API).

## [MI-001] No privacy notice or terms page

- Category: Legal
- Severity: Medium
- Status: Missing
- File: `frontend/src/app/` (routes: `/`, `/login`, `/signup`, `/plans`, `/plans/[id]`, `/pay/[shareId]`)
- Code Location: no `/privacy` or `/terms` route; the footer links to neither
- Description: The site takes emails and passwords, stores names and pasted chats, sends text to three AI providers (one storing data in China, one using free-tier content to improve its products), and shows names and amounts on shareable links. It says none of this.
- Current Implementation: Only the footer's "Sandbox only: no real money moves."
- Problem: Once the repo and site are public, anyone can sign up. Regimes that may apply (see MI-004) generally expect people to be told what is collected, why, who receives it, how long it is kept and how to ask for deletion (for example GDPR Articles 13–14, https://gdpr-info.eu/art-13-gdpr/). Whether any of them applies to a non-commercial hackathon demo is a question for a lawyer.
- Why It Matters: Legal exposure is low for a sandbox demo, but a one-page notice is cheap, honest, and a trust signal for the Potential Impact and Design lenses.
- Recommended Solution: Add a plain `/privacy` page (about 200 words) and link it from the footer and the sign-up form. Cover: what is collected (the table above), the AI providers and where they process data, the 7-day guest and 90-day AI log retention, the sandbox-only nature, and a contact address for deletion requests. Do not claim compliance with any law. A `/terms` page can be three sentences: demo, sandbox only, no warranty, MIT licence for the code. Ask a lawyer before the product handles real money.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Nishit (frontend route and footer); AI-023 (the provider sentence)
- Verification Method: `/privacy` returns 200 and is linked from every page's footer.

## [MI-002] Data minimisation already in place

- Category: Privacy
- Severity: Informational
- Status: Implemented
- File: `backend/src/services/aiBudget.service.ts`, `backend/src/integrations/paypal/client.ts`, `backend/src/services/housekeeping.service.ts`, `frontend/src/app/pay/[shareId]/`
- Code Location: `hashIp` (aiBudget 55–60); `storable` (client.ts 175–190); `AI_USAGE_RETENTION_DAYS = 90`; guest sweep every 6 hours
- Description: IPs are stored only as a keyed HMAC. PayPal buyer details (name, email, address) are dropped before PayPal responses are stored. Guests and their plans are deleted after 7 days. AI usage rows are deleted after 90 days. Pay links carry `<meta name="robots" content="noindex">` (checked live). PayPal ids and buyer data are never sent to a model.
- Current Implementation: As described.
- Problem: None. Two small gaps: there is no self-service account deletion for members, and a keyed IP hash is still pseudonymous personal data under GDPR (it can be linked back by whoever holds the key), so it belongs in the privacy notice.
- Why It Matters: These are good defaults that the privacy notice can state truthfully.
- Recommended Solution: Mention them in MI-001's notice. Optional: a "Delete my account" action for members.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: MI-001
- Verification Method: Code read; `curl` of a pay link shows `noindex`.

## [MI-003] A cookie consent banner is not needed for the current cookies

- Category: Legal
- Severity: Informational
- Status: Implemented
- File: `backend/src/http/cookies.ts`, `frontend/src/store/themeEffects.ts`
- Code Location: session cookie options (cookies.ts 10–19, 40)
- Description: The app sets one first-party authentication cookie (`httpOnly`, `secure`, `SameSite=Lax`) and stores the theme choice in `localStorage`. It loads no analytics or advertising.
- Current Implementation: No banner.
- Problem: None today. Under the EU ePrivacy Directive Article 5(3), consent is not needed for storage that is strictly necessary to provide a service the user asked for, and authentication cookies are the standard example (Article 29 Working Party Opinion 04/2012, https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2012/wp194_en.pdf; summary at https://gdpr.eu/cookies/). A user-chosen theme preference is generally treated the same way, but this is the less clear-cut case. The UK's PECR rules are similar.
- Why It Matters: A banner would be noise for judges. Adding analytics later would change this answer (see MI-023).
- Recommended Solution: No banner. List the session cookie and the theme preference in the privacy notice. Revisit if any analytics or third-party script is added.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: MI-023
- Verification Method: The live response headers set no cookie for an anonymous visitor (checked with `curl -I`); the session cookie appears only after sign-in or guest.

## [MI-004] Which regimes may apply (uncertain; needs a lawyer before real money)

- Category: Legal
- Severity: Informational
- Status: Needs Verification
- File: n/a
- Code Location: n/a
- Description:
  - **EU GDPR and UK GDPR:** they apply to processing by an organisation outside the EU or UK when it offers services to people in the EU or UK (GDPR Article 3(2), https://gdpr-info.eu/art-3-gdpr/). A public, English-language demo open to anyone may or may not count as "offering"; this is uncertain.
  - **California CCPA/CPRA:** applies to for-profit businesses above revenue or data-volume thresholds (https://oag.ca.gov/privacy/ccpa). A non-commercial three-person hackathon project is very unlikely to meet them.
  - **India's DPDP Act 2023:** applies to digital personal data processed in India, and to processing outside India connected with offering goods or services to people in India (Section 3). If the team operates from India, or Indian users sign up, it may apply. Its rules are being phased in, so check current status.
  - **PayPal:** the PayPal Developer Agreement and the brand rules apply to sandbox use too (see MI-005).
- Current Implementation: None of these is addressed in the repo, which is reasonable for a sandbox demo.
- Problem: Unknown applicability; I am not qualified to decide it.
- Why It Matters: It sets how much the privacy notice must say. MI-001's plain notice is a sensible minimum whichever applies.
- Recommended Solution: Ship MI-001. Before any real-money use, get a lawyer's view on GDPR, DPDP and payments regulation (taking payments for others is regulated in many places; PayPal's multiparty or marketplace products exist for this).
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: MI-001
- Verification Method: A lawyer's written opinion. Not verifiable by engineering.

## [MI-005] PayPal name and mark: the spec promises the official mark, the code has an unbranded button

- Category: Legal / brand
- Severity: Medium
- Status: Partially Implemented
- File: `frontend/src/features/pay/` (button label from `payView.ts`), `docs/spec/ui.md`
- Code Location: `ui.md` line 196: "The official PayPal mark is added in phase 6 from PayPal's brand assets and is not restyled."; the pay button is Foldback's own orange gradient button labelled "Hold my share with PayPal"
- Description: The spec and the code disagree. Phase 6 shipped without the official mark.
- Current Implementation: A text-only button with "PayPal" in the label. No PayPal logo is drawn or imitated anywhere (checked the landing phone art and the pay page). That avoids misuse of the mark, but it does not match the spec or PayPal's buttons.
- Problem: PayPal's brand material says to use only brand-approved acceptance marks when showing PayPal as a payment option, and that the name and marks are used under the terms of a licence (PayPal brand guidelines; corporate guidelines PDF found at https://www.paypalobjects.com/en_US/pdf/PayPal_Developer_Certification_Badge_Guidelines.pdf and a third-party copy of the master brand book; confirm against PayPal's current official brand centre). A custom orange button that says "with PayPal" is a grey area. The PayPal JS SDK's own buttons are the safe, recognisable route, but Foldback's flow (server-created order with `intent: AUTHORIZE` and a full-page redirect to `approve_url`) does not need the SDK.
- Why It Matters: The judges include PayPal staff, so a recognisable, correct PayPal entry point is both a compliance point and a Design point.
- Recommended Solution: Decide between: (a) keep the custom button and use PayPal's official logo asset inside it per the brand guidelines (no restyling of the mark); or (b) render the official PayPal button style from PayPal's brand assets for the redirect; or (c) keep text only and update `ui.md` to say so. Option (a) or (b) best fits the spec. The team decides, ideally after checking PayPal's current developer brand page.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Nishit (frontend); spec owner.
- Verification Method: The pay page at 375 px shows the chosen PayPal mark, with no colour or shape changes to it.

## [MI-006] The judge guide plans to publish sandbox buyer credentials

- Category: Secrets / legal
- Severity: Low
- Status: Needs Verification
- File: `docs/spec/demo.md`
- Code Location: Judge path, step 5: "log in with the sandbox buyer credentials listed in the README"
- Description: Publishing a sandbox buyer's email and password lets judges complete a real sandbox hold.
- Current Implementation: Not yet in the README.
- Problem: Sandbox credentials move no real money, so this is common practice. But the project rule says never put a secret in docs, and anyone could log into that sandbox buyer and change it (for example its password), breaking the demo for the next judge.
- Why It Matters: Demo reliability during 1 to 15 December.
- Recommended Solution: Use a dedicated sandbox personal account created only for judges, not the team's own sandbox accounts. List it in the README as "sandbox test account, no real money". Check it daily during judging, and delete it after 15 December. The team should record that this one exception to "no secrets in docs" is deliberate.
- Implementation Complexity: Low
- Breaking Change Risk: Low
- Dependencies: Manveer (sandbox accounts), team decision.
- Verification Method: The README lists an account that exists only for judges.
