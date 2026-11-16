# Editorial record: Making the first steps easier (merchant onboarding)

- **Status:** draft, revised 2026-11-16 with Daniel's correction on sandbox locations. Not yet approved for publication.
- **Page:** `src/content/studies/merchant-onboarding.ts`, at `/work/merchant-onboarding`.
- **Museum:** case 005 links here; Return to museum goes to case 005.
- **Daniel's role and period, 2019–2026:**
  - Engineer, 2019–20: wrote the Paysafe merchant forms.
  - EM, 2021–22: scoped and sliced the rebuild, built the shell, reviewed the pages.
  - Hands-on, 2023–25: built the merchant-facing Adyen form.
  - 2026: wrote the specs and built self-serve signup.

**Sources**
- `DTN case studies.pdf`: chapter on pp. 2–12; public version on pp. 48–49.
- Approved site copy: `catalog.ts` `merchant-onboarding`, and `site.ts` Engineering Manager notes.

Key: **S** = stated in a source. **I** = inferred or reworded. **C** = Daniel to confirm.

## Claims

| Claim as published | Source | Support |
|---|---|---|
| Processor approval needs legal entity, owners, bank account, signed terms; small errors are rejected; rules kept changing and each change meant changing our forms | PDF p.4 | S |
| A prospect couldn't try the product until a test location was created by hand; setup waited on staff and approval | PDF p.4 | S |
| Role paragraph: three roles; 2026 specs and build | PDF p.3, 5 | S. Teammate-by-teammate history trimmed (2026-11-16 revision). |
| 2019–20: two paths, quick and full | PDF p.5–6 | S |
| 2022: rebuilt application plus a pending-accounts dashboard with self-updating statuses | PDF p.7 | S |
| 2023: one-page form handing off to the processor's hosted verification | PDF p.6–7 | S |
| 2026: self-serve signup; anyone can create a location, limited to sandbox mode; live payments still need approval | **Daniel's correction, 2026-11-16** | S. Supersedes the PDF's "internal testing" status for signup and location creation. |
| Decision: slice the rebuild; a dozen stories; built the frame and reviewed every page; one release; the previous form spent months on one branch; slicing by page left cross-page goals without an owner | PDF p.5–6, 10 | S |
| Decision: didn't port the multi-page form; hosted verification | PDF p.6 | S. The PDF says the *reason* is a reading of history, so the page states no reason. |
| "Verification now happens in the processor's own flow" | PDF p.6 | S. An earlier reason-shaped line was cut, because the PDF calls the reason reconstructed. |
| Decision: creating a location is separate from taking live payments; sandbox with test payments only; approval unlocks live payments; one-step go-live | PDF p.6, 9; Daniel's correction | S. Phone verification, screening holds and staff-approval mechanics are no longer stated on the page. |
| Decision: assistant drafts, operator confirms with preview, main app re-validates and imports with nothing turned on; the stray-menu incident led to the "adds nothing unasked" rule; "a wrong price…" line | PDF p.7 | S. The page describes how it works and its testing history only. It makes **no availability claim** for AI menu drafting (see open questions). |
| Signup runs as its own service; the main app re-validates and owns records; it's *designed* so it can't flood the main app and keeps taking signups when the main app is down | PDF p.6–7 (design reasons, not tested outcomes) | S. The Cloudflare Worker is not named. |
| ~~Assisted-flow venue, activation and retention figures~~ | Removed 2026-11-16 | Unconfirmed; omitted at Daniel's request. |
| ~~Self-serve is internal-only / not available to merchants yet~~ | Removed 2026-11-16 | Wrong: Daniel's correction says anyone can create a location, limited to sandbox mode. Removed from the summary, status, timeline, diagram, captions and this record. |
| Lessons: slice by goal; test launch against outside systems (the screening provider couldn't be reached from the new service) | PDF p.9–10 | S |

## Conflict with existing site copy

Resolved by the museum cutover: the v3 ordering-app copy (`catalog.ts`, `site.ts` role notes) is retired, so the study is the only public account.

## Deliberately left out of the public page

- Processor names (Paysafe, Adyen), the token vault and other security details, HubSpot, and Twilio.
- Cloudflare Workers and D1, the outbox and retry design, and status codes.
- The location-creation latency incident (35–59 s; 4,240 → 555 trigger rows).
- The approvals-channel naming miss.
- The Australian and New Zealand country work, and the first NZ signup. It's unclear whether that was a real merchant or a test.
- PR and commit counts, Claude Code trailer counts, and every "confirm with GoTab" metric.

## Visuals

- **Hero (two lanes: sandbox setup and approval for live payments).** A simplified diagram. Anyone can create a location, which starts in sandbox mode; approval switches on live payments.
- **Wanted, optional:** a screenshot of the self-serve setup page or the assistant's draft review, once it's shareable.

## Open questions

1. **AI menu drafting:** is it available to anyone who creates a location, or still limited to staff and testing? The page describes how it works but doesn't say who can use it. If it's available, the page can say so; if it isn't, consider saying "in testing".
2. Is a 2026 "Shipped" tag right for self-serve signup on the timeline, and is there a month to put on it?
