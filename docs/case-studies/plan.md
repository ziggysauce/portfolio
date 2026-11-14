# Case studies

The museum introduces the career; `/work` holds the stories behind it. Entries live in `src/content/work.ts`, and each study's copy is in `src/content/studies/`.

| Study | Route | Museum | Status |
|---|---|---|---|
| From printed tickets to a working kitchen display | `/work/kitchen-display` | 003 | Draft, in review |
| Making the first steps easier (merchant onboarding) | `/work/merchant-onboarding` | 005 | Draft, in review |
| Making complex menus easier to manage | `/work/menus` | 004 | Draft, in review |
| Building a better review loop | `/work/review-loop` | 004, 005 (returns to 005) | Draft, in review |
| Turning a payout email into daily insights (short) | `/work/daily-insights` | none (returns to 003) | Draft, in review |

Each study has an editorial record beside this file. It covers sources, attribution, what was left out, visuals that could be replaced, and open questions.

## Editorial approach

- **"We" and "I":** "we" for the team's decisions and work Daniel took part in; "I" for his own responsibilities, actions and reflections.
- **Attribution:** a short role statement near the top. Detailed attribution lives in the editorial record, not on the page.
- **Detail:** keep implementation detail only where it explains a constraint or decision, and say why it matters.
- **Status:** shipped work and internal testing are named as such in plain words.
- **Evidence:** no invented metrics, motivations or testimonials. Unresolved items stay in the records.

## Adding a study

1. Write its content in `src/content/studies/<slug>.ts`, as a `Study` with `status: "draft"`, and add it to `studies` in `src/content/work.ts`.
2. Set `exhibit` (where Return to museum goes) and `featuredOn` (which museum labels link to it).
3. If it needs a new visual, add a key to `FigureKey` and draw it in `src/components/work/figures.tsx`. Label reconstructions next to the image.
4. Keep an editorial record here. Set `status: "published"` only after Daniel's review.
