# Editorial record: Making complex menus easier to manage (Menus and operator tools)

- **Status:** draft, not fact-approved.
- **Page:** `src/content/studies/menus.ts`, at `/work/menus`.
- **Museum:** The First KDS (`kds`, Software Developer 2018–2021) and The Nearly Dry Marker (`marker`, Engineering Manager) link here; Return to the museum goes to The First KDS.
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
| ~~"A deciding factor for some prospective clients at launch"~~ | Removed 2026-11-16 | Unconfirmed; no longer on the page. |
| Core still in product; menus shared across locations added later by teammates | PDF p.29 | S |
| About a third of menu changes in the following months were fixes | PDF p.29: 17 of 52 menu-titled PRs, Nov 2020 – Jun 2021 | S |
| A rework broke segment-only visibility; a support report surfaced it; a teammate fixed it | PDF p.30 | S. Removed from the page 2026-11-16. |
| Lessons: name the old thing first; access test before refactor; small branches | PDF p.29–30 | S |

## Museum mapping

- Menus was first placed on the Engineering Manager exhibit (`marker`, 2021–2026).
- The work itself is dated 2018–2021, during the Software Developer years (`kds`). The launch was November 2020, and follow-ups ran to March 2021.
- The résumé (`public/Daniel_Nguyen_Resume.pdf`) lists "Led development of Menus" under Engineering Manager.
- Since 2026-11-16 (usability pass): Return to the museum goes to The First KDS, matching the study's own dates, and both labels link here.
- **Evidence, checked 2026-11-16** (GitHub, `GoTab-Inc/node`, merged PRs with "menu" in the title):
  - `gh pr list --repo GoTab-Inc/node --author ziggysauce --state merged --search "menu in:title"`: Daniel authored about 70, from January 2020 to May 2021. The Menus PR (#2081) merged 2020-11-03 and his follow-ups ran densely to May 2021, not March. After June 2021 he authored only a handful: availability fixes (2021-07), prompt removal (2021-12), two display fixes (2022-01), a searchable icon (2022-08) and the POS menu (2022-09).
  - Same search for everyone else, merged 2021-06 to 2023-12: 81 PRs (22 in 2021, 35 in 2022, 24 in 2023), including shared and foreign menus, copying menus between locations, GraphQL menus and POS menu selection.
  - Reading: the study's dates for Daniel's own build are right. Menus kept being developed by the team during his engineering-manager years, which fits "Led development of Menus" under EM, but PR authorship can't show who led it. Nothing changed on the site or the résumé.
- **Open question for Daniel:** did you lead the team's Menus work after June 2021 (shared menus, copying menus, POS menus)? If yes, both documents are right as they stand. If no, the résumé line belongs under Software Developer.

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

## Revision, 2026-11-16

- **Led with the holiday preorder:** a menu ordered from in October for late-November pickup, from PDF p.23. "Bend the everyday schedules around it or duplicate products, then keep copies in sync by hand" is how the page explains why one catalog fell short (**I**, drawn from the decision's stated alternative).
- **Removed:** "a deciding factor for some prospective clients" (unconfirmed), the later segment-visibility regression and its teammate fix, and the "access test" lesson that depended on it.
- **Trimmed:** the dashboard-restructuring section, the teammates' database logic, and menus shared across locations.
- **Kept:** the lesson that "menu" meant two things (the catalog and the new menus) and confused people, as Daniel asked.
- Open question 1 is resolved by removing the claim.
