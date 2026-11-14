# Editorial record: From printed tickets to a working kitchen display

- **Status:** draft, not fact-approved.
- **Page:** `src/content/studies/kitchen-display.ts`, at `/work/kitchen-display`.
- **Museum:** case 003 links here; Return to museum goes to case 003.
- **Daniel's role and period:** software developer, Dec 2018 – mid-2019. He built the first release and was on site at launch.

**Sources**
- `DTN case studies.pdf`, a private draft outside the repo. It's image-only, so it was read by OCR and checked against the page images. The KDS chapter is pp. 12–21, the open numbers are on p. 47, and the public version is on p. 49.
- Daniel's own recollection, given in the brief: "Building the first KDS was fun and exciting. I was in a restaurant working on changes in real time as we launched the product. It was really cool to see it first being used."
- Approved site copy: exhibit 003, and `catalog.ts` / `site.ts` under "Software Developer".

Key: **S** = stated in a source. **I** = inferred or reworded. **C** = Daniel to confirm.

## Claims

| Claim as published | Source | Support |
|---|---|---|
| Printed ticket per station printer; a ticket can't show wait, cross-station state, or be marked done | PDF p.13 | S |
| Had to run on tablets kitchens already owned | PDF p.13 | S |
| Started Dec 2018 in a new app a teammate set up; built from a designer's mockups; teammate reviewed; merged about two months later | PDF p.12–13, p.16 (first commit 2018-12-07, merged 2019-02-06, 61 days) | S |
| Fun and exciting; in a restaurant making changes in real time at launch; really cool to see it used | The brief | S (paraphrase) |
| First-release scope: station and expo views, tap to claim, tap twice to finish, recall, reprint, prep-time colors | PDF p.13, p.16 | S |
| Decision 1: the push prototype "still had a reliability problem I hadn't solved", so it was replaced with regular checks for new orders; that version launched | PDF p.14: Dec 18 prototype with a listener-leak FIXME, replaced next day by a 10 s poll | S. The interval is deliberately not stated. |
| Decision 1 tradeoff: "several seconds" delay and more server load; later moved to live updates | PDF p.14 (teammates replaced polling in 2020) | I (delay) / S (later change). Teammates are not named, by design. |
| Decision 2: manager adds a display, enters a code on the tablet; records made general; rework before ship; POS, kiosk and task screens now connect the same way | PDF p.14–15, p.18 | S. A teammate added the device type in 2020; the general "displays" table and code activation were Daniel's. |
| Follow-ups through mid-2019: 86-ing, print on finish, dark theme, dashboard setup, per-item claim | PDF p.16 | S |
| Parts still in production, including recall and reprint | PDF p.18; catalog "much of the original system remains" | S |
| Later clock bug fixed by timing against the server clock | PDF p.15, decision 5 (2026, Daniel) | S |
| Lesson: "Launching next to the people using it is the fastest feedback there is" | Not in sources | **C**. This is a reflection drawn from the recollection. Replace it with your own words if it isn't right. |
| Lesson: trust the server's time from the first release | PDF p.19 | S |

## Deliberately left out of the public page

- The 10-second interval, the event-stream and notification internals, and every technology name.
- The teammate-by-teammate timeline: 2020 sockets, the task-display link, the settings UI, the push-loss detector.
- The EM-era settings migration and the 2022 revert, which are in the PDF on p.15.
- The 2026 course-order fix.
- The technical appendix.
- Commit, PR and line counts.
- All "confirm with GoTab" metrics: venue count, time to bump, support tickets.

## Visuals

- **Hero (ticket → screen), annotated station view, and order flow.** These are original reconstructions with sample orders and are labeled as reconstructions. The PDF has no screenshots, and the museum's KDS prop isn't used as evidence.
- **Wanted:** an authentic first-release screenshot or a photo from launch, if any is shareable.

## Open questions

1. Is the "What I learned" first paragraph true to your experience of being on site? It's the one line not in a source.
2. Was the restaurant launch the February 2019 release, or a later one? The page doesn't date it.
