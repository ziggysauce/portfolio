# Case studies: plan

The museum introduces the career; `/work` holds the evidence. Entries live in `src/content/work.ts`. Planned ones have no page, card or link until they're drafted.

| Study | Status | Notes |
|---|---|---|
| From printed tickets to a working kitchen display | Draft, in review | See `kitchen-display-editorial.md` |
| Self-service merchant onboarding | Planned | Three roles, 2019–2026. Several outcome numbers are still marked "confirm before publishing" in the source. |
| One catalog, many menus | Planned | 2018–2021, built with the product lead and teammates. Attribution needs care. |
| AI-assisted engineering workflow | Planned | 2026. Outcome metrics in the source still need data. |
| Daily insights email | Planned, short | 2018. A shorter supporting story. |

## Adding a study

1. Write its content in `src/content/studies/<slug>.ts`, as a `Study` with `status: "draft"`. Sections and blocks are free-form, so use the ones the story needs.
2. Replace its `planned` entry in `src/content/work.ts` with the import.
3. Set `exhibit` to the museum case it expands on. The case's label then gets "Read the case study", and the study gets "Return to museum".
4. If it needs a new visual, add a key to `FigureKey` and draw it in `src/components/work/figures.tsx`. Label reconstructions next to the image.
5. Keep an editorial record beside this file. Set `status: "published"` only after Daniel's review.
