# Case studies

The museum introduces the career; `/work` holds the stories behind it. Entries live in `src/content/work.ts`, and each study's copy is in `src/content/studies/`.

| Study | Route | Museum | Status |
|---|---|---|---|
| From printed tickets to a working kitchen display | `/work/kitchen-display` | The First KDS (`kds`) | Draft (review builds only) |
| Making the first steps easier (merchant onboarding) | `/work/merchant-onboarding` | The Nearly Dry Marker and Plans & Pull Requests (returns to `plans`) | Draft (review builds only) |
| Making complex menus easier to manage | `/work/menus` | The First KDS and The Nearly Dry Marker (returns to `kds`) | Draft (review builds only) |
| Building a better review loop | `/work/review-loop` | Plans & Pull Requests (`plans`) | Draft (review builds only) |
| Turning a payout email into daily insights (short) | `/work/daily-insights` | none (returns to `kds`) | Draft (review builds only) |

Museum cases are named by their stable ids (`plans`, `marker`, `kds`, `research`, `origin`, `after-hours`), which are also their addresses (`/#kds`). The hall's visible numbers follow the walking order, newest role first, and can change; old `/#case-NNN` links still resolve through each exhibit's `catalog` number.

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

## Drafts and production

A draft has a page, a card and museum links only on review builds: Vercel preview deployments (`VERCEL_ENV=preview`) and `npm run dev`. A production build leaves it out entirely, because noindex alone doesn't hide a page. To read drafts in a local production build, run `VERCEL_ENV=preview npm run build`.
