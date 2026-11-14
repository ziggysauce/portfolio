// Case study: GoTab's first kitchen display system.
// DRAFT. Sources, attribution and open questions: docs/case-studies/kitchen-display.md.

import type { Study } from "../work";

export const kitchenDisplay: Study = {
  slug: "kitchen-display",
  title: "From printed tickets to a working kitchen display",
  shortTitle: "Kitchen display",
  summary:
    "GoTab’s first kitchen display system: a screen where each station sees its orders, how long they’ve waited, and what’s done. I built the first release, and I was in a restaurant making changes in real time as we launched it.",
  status: "draft",
  role: "Software developer",
  timeframe: "2018–2019",
  tags: ["Kitchen operations", "First release", "On-site launch"],
  exhibit: "kds",
  length: "full",
  hero: {
    figure: "kds-hero",
    alt: "A printed kitchen ticket beside a tablet showing the same order as a card on a kitchen display, with an elapsed-time bar and other open orders for the grill station.",
    caption: "A ticket can only be read. A card shows how long the order has waited, and can be claimed, finished and recalled.",
    label: "Illustrative reconstruction",
  },
  facts: [
    {
      label: "My role",
      value: "Software developer. I built the first release and kept improving it through its first months.",
    },
    { label: "When", value: "Late 2018 to mid-2019" },
    { label: "Team", value: "A small engineering team, working from a designer’s mockups" },
    { label: "Status", value: "Shipped in 2019. Parts of the first release are still in production." },
  ],
  sections: [
    {
      id: "problem",
      heading: "The kitchen before the screen",
      blocks: [
        {
          type: "p",
          text: "Before the KDS, an order reached a GoTab kitchen as a printed ticket, one for each station’s printer. Paper does the basic job: it tells a cook what to make. It can’t show how long an order has been waiting, it can’t tell the grill that the cold station has finished its half, and it can’t be marked done.",
        },
        {
          type: "p",
          text: "Kitchens needed a screen that could do those things, and it had to run on whatever tablets a kitchen already owned.",
        },
      ],
    },
    {
      id: "role",
      heading: "My role",
      blocks: [
        {
          type: "p",
          text: "I started building the KDS in December 2018, in a new app a teammate had set up, working from a designer’s mockups. I built the first release, that teammate reviewed it closely, and it merged about two months after I started.",
        },
        {
          type: "p",
          text: "Building it was fun and exciting. When we launched, I was in a restaurant, making changes in real time while the kitchen started using it. It was really cool to see it in use for the first time.",
        },
      ],
    },
    {
      id: "approach",
      heading: "A focused first release",
      blocks: [
        {
          type: "p",
          text: "We kept the first release to what a station needs during service. Each station sees only its own items, and expo, the station that pulls each order together, sees them all. A cook taps to claim an order and taps twice to finish it. A finished order can be recalled or its ticket reprinted, and every order shows its elapsed time, colored against how long it should take.",
        },
        {
          type: "decisions",
          items: [
            {
              title: "Choose the simple way to keep the screen current",
              body: "New orders had to appear without anyone touching the screen. I first prototyped live updates pushed from the server, but the prototype still had a reliability problem I hadn’t solved. I replaced it with something simpler: each screen checked the server for new orders on a short, regular interval. That’s the version we launched.",
              tradeoff: "A new order could take several seconds to appear, and every screen added a little load on the server. As the product grew, it moved to live updates.",
            },
            {
              title: "Treat each screen as a device the restaurant sets up",
              body: "A manager adds a display in the dashboard, then enters a short code on the tablet to connect it. I built that setup flow and made the records describe a general display rather than something specific to the KDS.",
              tradeoff: "It meant reworking code before the feature shipped. It paid off later: the same setup now connects POS, kiosk and task screens too.",
            },
          ],
        },
      ],
    },
    {
      id: "shipped",
      heading: "What shipped",
      blocks: [
        {
          type: "figure",
          figure: "kds-screen",
          alt: "A kitchen display set to the grill station, showing four order cards. Each card has a table or order name, its items and an elapsed time with a colored bar. One card is marked claimed and one fulfilled. Numbered markers point to the station tabs, a timer, the claimed card, the fulfilled card, and the Closed tab.",
          caption: "A station view from the first release, drawn with sample orders.",
          label: "Illustrative reconstruction",
          legend: [
            "Station and expo views. Each station sees its own items; expo sees them all.",
            "Elapsed time, colored against the item’s prep time.",
            "Tap to claim, so others know it’s being made.",
            "Tap twice to finish. The order moves to Closed.",
            "From Closed, recall an order or reprint its ticket.",
          ],
        },
        {
          type: "p",
          text: "Over the next few months I kept building on it: marking items unavailable from the screen, an option to print a ticket when an order is finished, a dark theme, setup from the manager dashboard, and claiming and finishing individual items at each station.",
        },
        {
          type: "figure",
          figure: "kds-flow",
          caption: "How an order moved through the first release.",
        },
      ],
    },
    {
      id: "result",
      heading: "What it made possible",
      blocks: [
        {
          type: "p",
          text: "Kitchens could run service from a screen: each station tracking its own orders and how long they’d waited, and expo seeing the whole picture. The first release went into use in a restaurant, and parts of it, including recall and reprint, are still in GoTab’s product today.",
        },
        {
          type: "p",
          text: "The setup flow reached further than the KDS itself. Because a screen was a general display from the start, later POS, kiosk and task screens connect the same way.",
        },
      ],
    },
    {
      id: "learned",
      heading: "What I learned",
      blocks: [
        {
          type: "p",
          text: "Launching next to the people using it is the fastest feedback there is. Being on site meant I could change things in real time, with the kitchen right there.",
        },
        {
          type: "p",
          text: "The tablet is part of the product, even when you don’t control it. Years later, a tablet with a wrong clock threw off a venue’s order timers, and I fixed it by timing orders against the server’s clock instead. If I built it again, I’d trust the server’s time from the first release.",
        },
      ],
    },
  ],
};
