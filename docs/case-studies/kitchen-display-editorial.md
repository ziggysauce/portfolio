# Editorial record: "From printed tickets to a working kitchen display"

Status: **draft, not fact-approved.** The page is `src/content/studies/kitchen-display.ts`, at `/work/kitchen-display`. It is marked Draft and `noindex` until Daniel reviews it.

Source: `DTN case studies.pdf`, a private draft kept outside the repo. It is image-only, so the text was read by OCR and checked against the page images. Page numbers below are PDF pages. The KDS chapter is pp. 12–21; the open "Numbers to confirm" list is p. 47; the short public version is p. 49.

Other sources:
- Existing approved site copy: museum exhibit 003 in `src/content/exhibits.ts`, and the `kitchen-display` item and the Software Developer role in `src/content/catalog.ts` and `src/content/site.ts`.
- The personal detail Daniel confirmed in the brief, called "the brief" below.

Key:
- Attribution: **Me**, **Teammate**, or **Shared**.
- Support: **Supported** means stated in a source. **Inferred** means derived or reworded beyond the source. **Confirm** means Daniel needs to confirm it.

## Claims

| # | Section | Claim as published | Source | Attribution | Support | Publication question |
|---|---|---|---|---|---|---|
| 1 | Summary | Started building GoTab's first KDS in late 2018 | p.13 "From December 2018 I built the KDS"; p.16 first commits 2018-12-07 | Me | Supported | — |
| 2 | Summary | "I shipped the first release in 2019 and was in a restaurant making changes as it went into service" | The brief; p.16 MVP merged 2019-02-06 | Me | Supported, with a gap | The launch date isn't in any source, so the copy says "in 2019", not "February". Was the restaurant launch the February 2019 release, or later? |
| 3 | Facts: Role | Software developer | Exhibit 003 and site.ts say "Software Developer"; the PDF says "engineer" | Me | Supported | Lowercase "developer" is used in running text. OK? |
| 4 | Facts: Timeframe | December 2018 – June 2019, with later work 2020–2026 summarized | p.16: first commit 2018-12-07, item-level claim 2019-06-10 | Me | Inferred boundary | June 2019 is where I ended "the first release". The PDF frames device setup as 2018–2020. |
| 5 | Facts: Worked with | A teammate scaffolded the app and reviewed the release; a designer's mockups | p.12, TEAM box | Teammate | Supported | The PDF leaves team size and titles as "fill in". Add names or titles? None are published now. |
| 6 | Facts: Status | Parts of the first release still in production | p.18: recall and reprint routes from Jan 2019 are still in the 2026 app; catalog: "Much of the original system remains in production" | Me | Supported | The page uses the narrower PDF claim. The museum label keeps the approved "Much of that code still runs today." |
| 7 | Facts: Outcome | A device record that POS, kiosk and task screens now share | p.18; p.15: a teammate added the device-type column in Nov 2020 | Shared | Supported | — |
| 8 | Situation | Printed ticket, one per station printer; a ticket can't show wait, cross-station state, or be bumped | p.13 "The problem" | — | Supported | "can't tell the grill that the cold station has finished its half" illustrates the PDF's "cannot tell a station that another station finished". |
| 9 | Situation | The first PR's target list: station and expo views, claim and fulfill, recall, reprint, prep-time colors | p.13 | Me | Supported | — |
| 10 | Situation | Screens run on whatever tablets a kitchen owns | p.13 | — | Supported | — |
| 11 | Contribution | Built from a designer's mockups; reviewed by the scaffolding teammate over three rounds; merged Feb 2019, 61 days after first commit | p.12 TEAM; p.16 "three review rounds"; p.18 "61 days" | Shared | Supported | Is "61 days" provenance you're happy to show? It's a date fact, not an impact claim. |
| 12 | Contribution | "Building the first KDS was fun and exciting… really cool to see the screen used for the first time." | The brief | Me | Supported | Lightly reworded from your words. Check the voice. |
| 13 | Contribution | Teammates built the 2020 push, the task display link, a settings screen and a lost-update check | p.14 "I did not write…"; p.12 ROLE | Teammate | Supported | — |
| 14 | Decision 1 | Dec 18 push prototype (DB notification to an event stream) with a listener-leak note; replaced next day by a 10 s poll; shipped that way | p.14 decision 1; p.20 timeline | Me | Supported | — |
| 15 | Decision 1, constraint | "the first version needed to work in a real kitchen" | p.14: "A poll was the smallest design I could test in a real kitchen." | Me | **Confirm** | The PDF was assembled from code history. Is this your remembered reasoning, or a reconstruction? |
| 16 | Decision 1, tradeoff | "a new order could take up to 10 seconds to appear" | Derived from a 10 s poll interval | — | Inferred | Mechanical consequence; not stated in the PDF. |
| 17 | Decision 1, tradeoff | Teammates replaced polling with socket push in 2020, in a performance and scaling effort | p.14; p.16 2020-06-18 | Teammate | Supported | — |
| 18 | Decision 2 | KDS device table Apr 29, generalized to displays by May 16; device-neutral rename before device setup; manager adds a device, enters a code on the tablet | p.14 decision 2; p.20 | Me | Supported | The 68-file and +2,198/−709 counts are left out as provenance only. |
| 19 | Decision 2, constraint | "Every kitchen tablet had to be set up for its location before it could show orders." | Inferred from the device setup flow (p.14, p.16) | Me | Inferred | Fair framing? |
| 20 | Decision 2, reason | No reason is given for the general name | p.14: "The rename PR gives no reason, so I will not claim one." | Me | **Confirm** | Do you remember why you generalized it? If so, it would strengthen the decision. |
| 21 | Decision 2, alternative | A KDS-only table, with POS handled separately | p.14 | Me | Supported | — |
| 22 | Decision 3 | Feb 2019: fixed a device-time bug by formatting times on the server; elapsed-time math stayed on the device clock for seven more years | p.19 "What I learned"; p.20 2019-02-06 "formatting only" | Me | Supported | Framed as a decision in hindsight. The source doesn't say you weighed the alternative in 2019, and the copy doesn't claim you did. OK to present it as one of the three decisions? |
| 23 | Decision 3, alternative | Send server time with every update; the poll already returned a server payload, so it would have cost almost nothing | p.19 | Me | Supported | — |
| 24 | Decision 3, tradeoff | 2026: a tablet about an hour slow made orders look an hour in the future, so timers sat at zero; anchored timers to the server clock | p.15 decision 5 | Me | Supported | Simplified: the PDF also mentions item badges counting down from about 60 minutes. |
| 25 | What shipped | Annotated screen legend: station and expo views, prep-time colors, tap to claim, double-tap to fulfill, recall and reprint from Closed | p.16 MVP list | Me | Supported | "so other cooks know it's being made" (claim) and "moves to Closed" are inferred from claim and open/closed views. |
| 26 | What shipped | First half of 2019: side drawer, dark theme, 86-ing products from the screen, print on fulfill, device setup, per-item claim and fulfill | p.16 | Me | Supported | — |
| 27 | Results | Went into service in a restaurant with me there making changes | The brief | Me | Supported | No date or venue, by design. |
| 28 | Results | No automated tests for most of its life; none in KDS or Displays code at the end of 2019 | p.18–19 | — | Supported | — |
| 29 | Results | No adoption, speed-of-service or support-ticket figures | p.19 and p.47 mark them "confirm with GoTab before publishing" | — | Omitted | Venue count, median time to bump, and ticket counts are all left out. The page doesn't mention their absence. |
| 30 | Learned | Treat the device clock as untrusted from the first release | p.19 | Me | Supported | — |
| 31 | Learned | Write tests while building; both 2026 bugs were in small pure functions, about 200 lines of tests each | p.19 | Me | Supported | — |
| 32 | Epilogue | 2020 teammates: socket push; device type | p.14–16 | Teammate | Supported | — |
| 33 | Epilogue | 2022 spec for one JSON settings record per device type | p.15 decision 3 | Me (EM) | Supported | — |
| 34 | Epilogue | 2022 revert of a task-display release that broke older iOS devices, about 20 h after merge; teammate fix promoted that afternoon | p.15 decision 4 | Shared | Supported | Is this OK to publish? It names a teammate's broken release, though not the teammate. |
| 35 | Epilogue | 2023 copy-first backfill (me), code moved over (teammate); most old columns dropped in 2024 | p.15, p.17 | Shared | Supported | — |
| 36 | Epilogue | 2026 timers and course order, with tests | p.15–16, p.19 | Me | Supported | "in my current role": the PDF says "technical PM", the museum says Director of Technical Product Management. |
| 37 | Epilogue | 2026 teammate's check for undelivered pushes | p.14, p.17 | Teammate | Supported | — |
| 38 | Technical | First release stack Node.js, Marko, PostgreSQL; the push prototype used a PostgreSQL notification feeding a server-sent event stream | p.12–14; catalog ingredients | Me | Supported | — |
| 39 | Technical | Current delivery: per-location DB notification, a realtime service that collapses bursts and builds per-screen payloads with a server timestamp, Socket.IO, a 15 s disconnect banner, a pull-and-compare check | p.17–18 "Under the hood" | Teammate | Supported | Internal names (pods, Redis lock, queue names) are left out. Is this level of architecture OK to publish? |
| 40 | Technical | Timer fix: server timestamp plus a monotonic reading; the first version's wall-clock offset was replaced before merge because of NTP double-counting | p.15 decision 5 | Me | Supported | — |
| 41 | Technical | Course order: grouping within one second, anchoring to the earliest send, ties by course number; a NaN comparator for held vs sent | p.16 decision 6 | Me | Supported | The measured 25.7% inversion rate from one location is omitted as operational data. |

## Deliberately left out

- Ticket and issue numbers, PR links and repository names.
- Customer and venue names.
- The "bot-drafted PR" story (p.15).
- Commit, PR and line counts. These are provenance, not impact.
- Every "fill in" and "confirm with GoTab" placeholder.

## Visuals

- **Hero, ticket to screen.** An illustrative reconstruction with neutral sample orders, labeled beside the image. It is not a screenshot.
- **Annotated station view.** An illustrative reconstruction of first-release features only. It leaves out later features: per-item claim (June 2019), cover count (2025) and HELD courses (2026).
- **Order flow.** HTML diagram of supported behavior. The first release (poll) and the teammates' 2020 change (push) are drawn as separate, labeled panels.
- **No authentic screenshots were available.** The PDF has none. The museum's KDS prop is a stylized 3D model and isn't used as evidence.

## Open for Daniel

1. Rows 2, 15, 20 and 22: launch timing, remembered reasoning, the reason for the rename, and the hindsight framing of decision 3.
2. Rows 34 and 39: are the 2022 revert and the current architecture OK to publish?
3. Row 5: name the teammate and the designer, or keep them by role?
4. Authentic screenshots: if you have shareable first-release images, they would replace or sit beside the reconstruction.
