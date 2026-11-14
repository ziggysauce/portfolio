# Editorial record: Turning a payout email into daily insights (short study)

- **Status:** draft, not fact-approved.
- **Page:** `src/content/studies/daily-insights.ts`, at `/work/daily-insights`.
- **Museum:** no label links here. Return to museum goes to case 003, the same era.
- **Daniel's role and period:** new software developer, June – October 2018. He owned the SQL, the template and the send logic; two teammates reviewed.

**Sources:** `DTN case studies.pdf`, chapter on pp. 41–46.

Key: **S** = stated in a source. **I** = inferred or reworded. **C** = Daniel to confirm.

## Claims

| Claim as published | Source | Support |
|---|---|---|
| The existing daily payout email: deposits, payments by check and server, reconciliation discrepancies | PDF p.42 | S |
| Guests could rate value, ambiance, drink, food and service and comment, but none of it was in the email | PDF p.42 | S |
| "Rather than start a new report, I added to the email operators already received" | PDF p.42–43, decision 1 | S (what). The PDF flags the *reasons* as reconstructed, so none is stated. |
| Added ratings and comments, lowest first; item ratings; daily sales; projected-vs-actual week from the same weekday in recent weeks; subject changed to "Insights"; preview and send from the dashboard | PDF p.43–44 | S |
| Email clients don't run scripts; tried table bars, then server-drawn images that could show projected and actual | PDF p.43 | S. The Plotly attempt is omitted. |
| Ratings keyed to the business day, because the email goes out on days without a payout | PDF p.42–43 | S |
| Contact details only with the guest's consent; a "contact me" choice | PDF p.43 | S |
| The daily email still goes out; Customer Experiences and Projected vs. Actual sections remain | PDF p.44 | S |
| The weekly version went only to Daniel and was switched off at the end of 2018 | PDF p.44 | S |
| About three weeks to merge; the review feedback became a checklist | PDF p.45 (20 days; the feedback list) | S |

## Deliberately left out of the public page

- The in-app website, a separate project removed in Dec 2020. It's left out to keep the story focused.
- SendGrid, Marko, chartjs-node and the scheduling internals.
- The git-blame line counts and commit counts.
- The OR/AND guard bug.
- The "venues receiving the email" metric, which is marked to confirm.

## Visuals

- **Email (illustrative reconstruction).** Sample figures and no guest text, so nothing reads as a real testimonial.
- **Wanted, optional:** a sanitized real email from 2018, if one exists.

## Open questions

None that affect the copy.
