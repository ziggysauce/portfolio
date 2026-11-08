# Daniel Nguyen's portfolio (v3)

A portfolio built like a restaurant ordering app. Skills and projects are products, the menu reorders by what you're interested in, and checkout is how you get in touch. Live at [danieltnguyen.com](https://www.danieltnguyen.com).

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
| Name, links, headline, pitch per tab, education | `src/content/site.ts` |
| Work history on `/orders`, and which menu items each role links to (`items`) | `roles` in `src/content/site.ts` |
| Résumé PDF (replace the file, keep the name) | `public/Daniel_Nguyen_Resume.pdf` |
| Menu items, sections, Popular picks, section order per tab | `src/content/catalog.ts` |
| Colors, button and component styles | `src/app/globals.css` |
| Fonts | `src/app/layout.tsx` |
| How a menu row looks | `src/components/MenuItem.tsx` |
| Order email wording, rewards threshold | `src/lib/order.ts` |

## Adding to the menu

Add an entry to `items` in `src/content/catalog.ts`. The page, card, search result and cart behavior come from that entry.

- **Price slot:** `{ since: 2018 }` shows years, `{ free: true }` shows $0.00, `{ text: "Daily" }` shows the word.
- **Photo (optional):** `image: { src, alt }` for a real screenshot in `public/projects/`. Most items have none, like most dishes on a menu.
- **Tag (optional):** `badge: "New"` shows a small label on the row.
- **Linking:** a project's `ingredients` list links it to its skills, and each skill's page links back.

## Publishing a case study

Add `sections` to any item in the GoTab Work section, such as `menu-management`. When they're all published, delete the `gotab-case-studies` placeholder.

```ts
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
| Delivery / Pickup tabs | Product / Engineering / Everything |
| Product price | Years of experience, how often I do it, or $0.00 for public projects |
| Rewards | Add 3 items and the first coffee's on me |
| Ingredients | The skills in a project |
| Orders and receipts | Work history at `/orders`: each role, its highlights and what came out of it |
| Tip | What brings you here: a project, a question, a coffee |
| Total | Market price |
| Pay | Send order, which opens an email draft |
| Skip the line | `/contact`, no order needed |
