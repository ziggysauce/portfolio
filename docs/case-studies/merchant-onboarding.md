# Editorial record: Making the first steps easier (merchant onboarding)

- **Status:** draft, not fact-approved.
- **Page:** `src/content/studies/merchant-onboarding.ts`, at `/work/merchant-onboarding`.
- **Museum:** case 005 links here; Return to museum goes to case 005.
- **Daniel's role and period, 2019–2026:**
  - Engineer, 2019–20: wrote the Paysafe merchant forms.
  - EM, 2021–22: scoped and sliced the rebuild, built the shell, reviewed the pages.
  - Hands-on, 2023–25: built the merchant-facing Adyen form.
  - 2026: wrote the specs and built self-serve onboarding with Claude Code.

**Sources**
- `DTN case studies.pdf`: chapter on pp. 2–12; public version on pp. 48–49.
- Approved site copy: `catalog.ts` `merchant-onboarding`, and `site.ts` Engineering Manager notes.

Key: **S** = stated in a source. **I** = inferred or reworded. **C** = Daniel to confirm.

## Claims

| Claim as published | Source | Support |
|---|---|---|
| Processor approval needs legal entity, owners, bank account, signed terms; small errors are rejected; rules kept changing and each change meant changing our forms | PDF p.4 | S |
| A prospect couldn't try the product until a test location was set up by hand; the website signup went to sales with no link to the product | PDF p.4 ("fed a CRM") | S |
| Role paragraph: three roles; the rebuild was built by two engineers; 2026 specs and build mostly alone with an AI assistant; staff tested | PDF p.3, 5 | S |
| 2019–20: two paths, quick and full | PDF p.5–6 | S |
| 2022: rebuilt application plus a pending-accounts dashboard with self-updating statuses | PDF p.7 | S |
| 2023: one-page form handing off to the processor's hosted verification | PDF p.6–7 | S |
| 2026: self-serve with a sandbox and a menu assistant, in internal testing | PDF p.7–9 | S |
| Decision: slice the rebuild; a dozen stories; built the frame and reviewed every page; one release; the previous form spent months on one branch; slicing by page left cross-page goals without an owner | PDF p.5–6, 10 | S |
| Decision: didn't port the multi-page form; hosted verification | PDF p.6 | S. The PDF says the *reason* is a reading of history, so the page states no reason. |
| "Verification now happens in the processor's own flow" | PDF p.6 | S. An earlier reason-shaped line was cut, because the PDF calls the reason reconstructed. |
| Decision: sandbox before approval, capped test payments, staff approval starts the payment application, flagged signups wait, one-step go-live | PDF p.6, 9 | S. The flagged-applicant call is dated 2026-10-06 and is Daniel's. |
| Decision: assistant drafts, operator confirms with preview, main app re-validates and imports with nothing turned on; the stray-menu incident led to the "adds nothing unasked" rule; "a wrong price…" line | PDF p.7 | S |
| Signup runs as its own service; the main app re-validates and owns records; it's *designed* so it can't flood the main app and keeps taking signups when the main app is down | PDF p.6–7 (design reasons, not tested outcomes) | S. The Cloudflare Worker is not named. |
| Assisted flow activates about 50 venues a month; 65–75% reach activation; about 97% remain live | **Approved site copy** (`catalog.ts`, `site.ts`), not the PDF | **C**. Are these still current, and OK to show in a study? |
| Turned on for internal use in Oct 2026; staff testing; follow-ups in review in Nov; not available to merchants yet | PDF p.7–9 | S |
| Lessons: slice by goal; test launch against outside systems (the screening provider couldn't be reached from the new service) | PDF p.9–10 | S |

## Conflict with existing site copy

- `catalog.ts` lists merchant onboarding as "In production", and `site.ts` says self-serve signup is "removing manual setup by Customer Success".
- The PDF (p.9) says self-serve is in internal testing.
- The study follows the PDF.
- The v3 copy is unchanged, since it's out of scope for this pass. It should be reconciled before both are public.

## Deliberately left out of the public page

- Processor names (Paysafe, Adyen), the token vault and other security details, HubSpot, and Twilio.
- Cloudflare Workers and D1, the outbox and retry design, and status codes.
- The location-creation latency incident (35–59 s; 4,240 → 555 trigger rows).
- The approvals-channel naming miss.
- The Australian and New Zealand country work, and the first NZ signup. It's unclear whether that was a real merchant or a test.
- PR and commit counts, Claude Code trailer counts, and every "confirm with GoTab" metric.

## Visuals

- **Hero (two lanes: approval and sandbox setup).** A simplified diagram of the designed flow, labeled "In internal testing".
- **Wanted, optional:** a screenshot of the self-serve setup page or the assistant's draft review, once it's shareable.

## Open questions

1. The assisted-flow figures (50 a month, 65–75%, about 97%): current, and OK to use here?
2. Should the v3 site's "In production" wording for self-serve be corrected at the same time?
