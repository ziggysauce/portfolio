# Daniel Nguyen's portfolio (v3)

A portfolio built like a restaurant ordering app. Three GoTab projects lead the page, the menu of skills and side projects reorders by what you're interested in, and the order is an optional list of topics that goes into an email. Live at [danieltnguyen.com](https://www.danieltnguyen.com).

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
| Name, links, headline, homepage opening, the note under each Explore tab, Profile summary, education | `src/content/site.ts` |
| Work history on `/orders`, which menu items each role links to (`items`), and the role line on signature cards | `roles` in `src/content/site.ts` |
| Résumé PDF (replace the file, keep the name) | `public/Daniel_Nguyen_Resume.pdf` |
| Menu items, sections, the three signature projects, section order per tab | `src/content/catalog.ts` |
| Colors, type, radii and component styles (color roles are listed at the top) | `src/app/globals.css` |
| Fonts | `src/app/layout.tsx` |
| How menu cards look: projects lead with a screenshot, skills are compact | `src/components/MenuItem.tsx` |
| How a signature project card looks | `src/components/SignatureCard.tsx` |
| Header, phone bottom navigation and the four destinations | `src/components/Header.tsx`, `src/components/BottomNav.tsx`, `src/lib/nav.ts` |
| Cart drawer and the "Added to your order" toast | `src/components/CartDrawer.tsx` |
| Email subject and body | `src/lib/order.ts` |

## Adding to the menu

Add an entry to `items` in `src/content/catalog.ts`. The page, card, search result and cart behavior come from that entry.

Every card shows the same meta row in the same order, and none of it looks like a price:

- **Status (work and projects):** `status: "In production" | "In progress" | "Live project" | "Code only" | "Coming soon"`, shown as a labeled pill.
- **Experience (skills):** `since: 2018` shows "Since 2018" on the card and "8 years, since 2018" on the item page.
- **How often (skills, optional):** `use: "Daily"` shows on the item page only.
- **Results (optional):** `results: { scope?, points, note? }`. The first point shows on menu cards; signature cards and item pages show them all. Use `scope` and `note` to say what the numbers measure and what they don't.
- **Grouping (optional):** `groupedUnder: "react"` lists the item on React's card ("Also: Next.js") instead of its own. Its page and URL stay.
- **Photo (optional):** `image: { src, alt }` for a real screenshot in `public/projects/`. Most items have none, like most dishes on a menu.
- **Tag (optional):** `badge: "New"` shows a small label on the row.
- **Linking:** a project's `ingredients` list links it to its skills, and each skill's page links back.

## Publishing a case study

Add `sections` to any item in the GoTab Work section, such as `menu-management`. When they're all published, delete the `gotab-case-studies` placeholder. To change which three lead the homepage, edit `signature` in `src/content/catalog.ts`.

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
| Delivery / Pickup tabs | "Explore my work": Product / Engineering / Everything |
| Menu | Skills and side projects, below the signature work |
| Ingredients | The skills in a project |
| Your order | Topics you'd like to talk about, in a cart drawer. Optional |
| Order history | Work history at `/orders`: each role and its details |
| Checkout | "What brings you here?", then Draft email (opens your mail app) or Copy message |
| Skip the line | `/contact`, no order needed |
