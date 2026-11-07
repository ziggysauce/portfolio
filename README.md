# Daniel Nguyen's portfolio (v3)

A portfolio built like a restaurant ordering app. Skills and projects are products, the menu reorders for the role you're hiring for, and checkout is how you get in touch. Live at [danieltnguyen.com](https://www.danieltnguyen.com).

Next.js static export, TypeScript and Tailwind. There is no backend: `npm run build` writes plain files to `out/`, so it runs on any static host.

```bash
npm install
npm run dev        # http://localhost:5001
npm run build      # static site in out/
npm run start      # serve out/ locally
npm run lint
npm run typecheck
```

## Where things live

| To change | Edit |
|---|---|
| Name, links, résumé, pitch per role, work history, education | `src/content/site.ts` |
| Menu items, aisles, Start Here picks, aisle order per role | `src/content/catalog.ts` |
| Colors, button and component styles | `src/app/globals.css` |
| Fonts | `src/app/layout.tsx` |
| Packaging art (cups, cans, bags, jars, boxes, bottles) | `src/components/ProductArt.tsx` |
| Order email wording, rewards threshold | `src/lib/order.ts` |

## Adding to the menu

Add an entry to `items` in `src/content/catalog.ts`. The page, card, search result and cart behavior come from that entry.

- **Price slot:** `{ since: 2018 }` shows years, `{ free: true }` shows $0.00, `{ text: "Daily" }` shows the word.
- **Art:** `bag(tint, "LABEL")`, or the matching helper for another pack, or `{ image, alt }` for a screenshot in `public/projects/`.
- **Linking:** a project's `ingredients` list links it to its skills, and each skill's page links back.

## Publishing a case study

Edit the `gotab-case-studies` item, or copy it for each case study. Remove `soon` and `badge`, then replace the "Coming soon" price and the "SOON" label:

```ts
price: { text: "Case study" },
art: bag("#c9a77c", "STUDY"),
sections: [
  { heading: "The problem", body: "..." },
  { heading: "My role", body: "..." },
  { heading: "What shipped", body: "..." },
  { heading: "What changed", body: "..." },
],
```

## How the metaphor maps

| Ordering app | Portfolio |
|---|---|
| Delivery / Pickup tabs | Technical PM / Engineering / Everything |
| Product price | Years of experience, how often I do it, or $0.00 for public projects |
| Rewards | Add 3 items and the first coffee's on me |
| Ingredients | The skills in a project |
| Order history | Work history |
| Tip | What you're bringing: a role, a referral, a coffee |
| Total | Market price |
| Pay | Send order, which opens an email draft |
| Skip the line | `/contact`, no order needed |
