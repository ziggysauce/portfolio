# Editorial record: Making complex menus easier to manage (Menus and operator tools)

- **Status:** draft, not fact-approved.
- **Page:** `src/content/studies/menus.ts`, at `/work/menus`.
- **Museum:** case 004 links here; Return to museum goes to case 004.
- **Daniel's role and period:** software developer on a small team, June 2018 – March 2021.
  - Dashboard screens from 2018.
  - Most of the route split, April–May 2020.
  - Menus launched 2020-11-03; follow-ups ran to March 2021.

**Sources**
- `DTN case studies.pdf`: chapter on pp. 21–31; public version on pp. 49–50.
- Approved site copy: `catalog.ts` `menu-management` ("Led development of Menus…"; "A deciding factor for prospective clients at launch"; "Still core infrastructure").

Key: **S** = stated in a source. **I** = inferred or reworded. **C** = Daniel to confirm.

## Claims

| Claim as published | Source | Support |
|---|---|---|
| Built dashboard screens: products, categories, areas, kitchen devices, refunds, sales, change log | PDF p.24 | S |
| One catalog per venue; schedules on categories and products; zones by area; "closed after lunch" works, but not a holiday preorder or a segment-only menu; product lead asked for menus | PDF p.23 | S. Specific dates are dropped. |
| "I led development of Menus" | Approved site copy | S (site). The PDF says Daniel built the product side "with the product lead and teammates", and teammates wrote some SQL. Both are reflected. |
| Built the Menus page, guest side, schedule rules, tag filters, segments, QR codes, menu switching; teammates wrote database logic | PDF p.24 | S |
| Decision: links rather than a list of category IDs or copies; each link has its own label, description and order; a price change applies everywhere | PDF p.25 | S |
| Decision: per-location switch; cost to venues using both; support prep; read-only derived schedules with a message | PDF p.25 | S. "We": Daniel built the switch, and a teammate wrote the derived-schedule SQL. |
| Decision: client-side menu switching, one menu at a time, a light list, cache, back button | PDF p.25–26, p.50 | S. "We": Daniel built switching; the fetching refactor was a follow-up. A senior engineer's revert-and-restore is omitted. |
| Availability rules: on, in dates, schedule, area, segment; first available menu | PDF p.27 | S. The figure shows "can switch to others that also pass", which is inferred from the menu-switching feature. |
| Dashboard split: most of the work was Daniel's; area by area, least-changing first; features kept shipping; still the layout six years later | PDF p.24, 29, 50 | S. A senior engineer moved the first groups; omitted for brevity. |
| "A deciding factor for some prospective clients at launch" | Approved site copy ("A deciding factor for prospective clients at launch") | S (site), softened with "some" |
| Core still in product; menus shared across locations added later by teammates | PDF p.29 | S |
| About a third of menu changes in the following months were fixes | PDF p.29: 17 of 52 menu-titled PRs, Nov 2020 – Jun 2021 | S |
| A rework broke segment-only visibility; a support report surfaced it; a teammate fixed it | PDF p.30 | S |
| Lessons: name the old thing first; access test before refactor; small branches | PDF p.29–30 | S |

## Museum mapping

- You placed Menus on case 004 (Engineering Manager, 2021–2026).
- The work itself is 2018–2021, during the Software Developer years (case 003).
- The approved `site.ts` also lists Menus under the Engineering Manager role.
- The study states its own dates, so the mismatch shows only in the museum placement.

## Deliberately left out of the public page

- Line and handler counts (7,900 → 1,500 lines; 135 → 32 handlers).
- File counts, table names, plpgsql, MobX, the cookie decision, and the UTC date bug.
- The 2026 tree move.
- All "confirm with GoTab" metrics.

## Visuals

- **Hero (one catalog → many menus).** A simplified diagram with sample categories and menus. The holiday dates echo the PDF's example.
- **Availability rules.** A diagram of supported behavior.
- **Wanted, optional:** a screenshot of the operator Menus page, if a shareable one exists.

## Open questions

1. Is the site's "deciding factor for prospective clients" still a claim you want in the study?
