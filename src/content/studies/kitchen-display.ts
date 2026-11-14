// Case study: GoTab's first kitchen display system.
//
// DRAFT. Every claim is traced in docs/case-studies/kitchen-display-editorial.md, with what still needs
// Daniel's confirmation. Edit the copy here; the layout is in src/components/work/.
// First person is Daniel's own work; anything a teammate built says so.

import type { Study } from "../work";

export const kitchenDisplay: Study = {
  slug: "kitchen-display",
  title: "From printed tickets to a working kitchen display",
  summary:
    "In late 2018 I started building GoTab’s first kitchen display system: a screen of live orders that each station can claim, finish and recall, where a printed ticket could only be read. I shipped the first release in 2019 and was in a restaurant making changes as it went into service.",
  status: "draft",
  role: "Software developer",
  timeframe: "Dec 2018 – Jun 2019",
  tags: ["Kitchen operations", "0 to 1", "Realtime screens", "Device setup"],
  exhibit: "kds",
  length: "full",
  hero: {
    figure: "kds-hero",
    alt: "A printed kitchen ticket beside a tablet showing the same order as a card on a kitchen display, with an elapsed-time bar and other open orders for the grill station.",
    caption: "The change in one picture: a ticket that can only be read, and a card that shows its wait and can be claimed, finished and recalled.",
    label: "Illustrative reconstruction, not a screenshot",
  },
  facts: [
    {
      label: "Role",
      value: "Software developer",
      detail: "I built the first release and its device setup.",
    },
    {
      label: "Timeframe",
      value: "December 2018 – June 2019",
      detail: "Later changes, 2020–2026, are summarized at the end and mostly belong to teammates.",
    },
    {
      label: "Worked with",
      value: "A teammate who scaffolded the app and reviewed the first release, and a designer whose mockups I built from.",
    },
    {
      label: "Status",
      value: "Shipped in 2019. Parts of the first release are still in production.",
    },
    {
      label: "Outcome",
      value: "A kitchen screen in live service, and a device record that POS, kiosk and task screens now share.",
    },
  ],
  sections: [
    {
      id: "situation",
      heading: "What kitchens needed beyond printed tickets",
      blocks: [
        {
          type: "p",
          text: "Before the KDS, an order reached a GoTab kitchen as a printed ticket, one for each station’s printer. Paper does the basic job: it tells a cook what to make. But a ticket can’t show how long an order has waited, can’t tell the grill that the cold station has finished its half, and can’t be marked done.",
        },
        {
          type: "p",
          text: "The first KDS pull request set out what the screen had to do instead: a view for each station, an expo view across all of them, a way to claim and fulfill orders, recall for bringing back a closed order, ticket reprint, and elapsed times colored against each item’s prep time.",
        },
        {
          type: "p",
          text: "The screens would also run on whatever tablets a kitchen already owned. That detail mattered more than it looked.",
        },
      ],
    },
    {
      id: "contribution",
      heading: "My part, and who I built it with",
      blocks: [
        {
          type: "p",
          text: "In December 2018 I started building the KDS inside an empty app a teammate had scaffolded. I built from a designer’s mockups, and the same teammate reviewed the first release over three rounds. It merged in February 2019, 61 days after my first commit.",
        },
        {
          type: "p",
          text: "Building the first KDS was fun and exciting. When we launched it, I was in a restaurant working on changes in real time, and it was really cool to see the screen used for the first time.",
        },
        {
          type: "p",
          text: "Teammates built much of what came later. In 2020 they replaced my polling with live push over sockets, and later work added a link to task displays, a settings screen and a check for lost updates. Where this page mentions that work, it’s theirs.",
        },
      ],
    },
    {
      id: "decisions",
      heading: "Three decisions that shaped it",
      blocks: [
        {
          type: "decisions",
          items: [
            {
              title: "Ask every 10 seconds before building live push",
              when: "December 2018",
              constraint: "New orders had to appear on the screen without anyone touching it, and the first version needed to work in a real kitchen.",
              approach: "On December 18 I prototyped push: a database notification feeding a stream of server events. The code still carried an unresolved note about leaking listeners. The next day I replaced it with a poll, so each screen asked the server for its orders every 10 seconds. The first release shipped that way.",
              alternative: "Finish the push prototype before shipping.",
              tradeoff: "Polling was the smaller design. It cost a request from every screen every 10 seconds, and a new order could take up to 10 seconds to appear. In 2020, teammates replaced it with socket-based push as part of a performance and scaling effort.",
            },
            {
              title: "Make each screen a device record, not a KDS special case",
              when: "April – May 2019",
              constraint: "Every kitchen tablet had to be set up for its location before it could show orders.",
              approach: "I created a table for KDS devices at the end of April, turned it into a general table for displays by mid-May, and renamed the KDS-specific names in the code to device-neutral ones before device setup shipped. A manager adds a device in the dashboard, then enters a code on the tablet to activate it.",
              alternative: "A device table for the KDS alone, with point-of-sale devices handled separately.",
              tradeoff: "The rename was a broad change to land ahead of the feature it served. It paid off later: after a teammate added a device type in 2020, the same display record and activation flow came to serve KDS, POS, kiosk and task displays.",
            },
            {
              title: "Fix how times displayed, but leave the timer math on the tablet",
              when: "February 2019",
              constraint: "Kitchen tablets don’t always keep the right time, and the first release read times from the device’s clock.",
              approach: "I fixed the first device-time bug by formatting displayed times on the server. Elapsed time, how long an order has waited, was still measured against the tablet’s clock.",
              alternative: "Send the server’s current time with every update and measure elapsed time against it. The poll already returned a server response every 10 seconds, so one more field would have cost almost nothing.",
              tradeoff: "The narrow fix corrected what was displayed, but the timers kept trusting the tablet for seven more years. In 2026 a tablet running about an hour slow made new orders look an hour in the future, so their timers sat at zero. I anchored the timers to the server clock then. In hindsight, I would treat the device clock as untrusted from the first release.",
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
          type: "p",
          text: "The first release gave each station a live list of its open orders, and gave expo a view across every station.",
        },
        {
          type: "figure",
          figure: "kds-screen",
          alt: "A kitchen display set to the grill station, showing four order cards. Each card has a table or order name, its items and an elapsed time with a colored bar. One card is marked claimed. Numbered markers point to the station tabs, a timer, the claimed card, a card being fulfilled, and the Closed tab with recall and reprint.",
          caption: "A first-release station view, drawn for this page with sample orders.",
          label: "Illustrative reconstruction, not a screenshot. Layout and styling are simplified.",
          legend: [
            "Station and expo views. Each station sees its own items; expo sees every station.",
            "Elapsed time, colored against the item’s prep time.",
            "Tap a card to claim it, so other cooks know it’s being made.",
            "Double-tap to fulfill. The order moves to Closed.",
            "From Closed, recall an order back to the screen or reprint its ticket.",
          ],
        },
        {
          type: "p",
          text: "Through the first half of 2019 I kept building on it: a side drawer and a dark theme, marking products unavailable from the screen, an option to print a ticket when an order is fulfilled, device setup from the manager dashboard, and claiming and fulfilling individual items at each station.",
        },
        {
          type: "figure",
          figure: "kds-lifecycle",
          caption: "How an order moved through the first release, and the one change to delivery that teammates made in 2020.",
        },
      ],
    },
    {
      id: "results",
      heading: "Results and limitations",
      blocks: [
        { type: "subhead", text: "What it achieved" },
        {
          type: "list",
          items: [
            "The first release merged in February 2019 and went into service in a restaurant, with me there making changes.",
            "Parts of it are still in production. The recall and reprint routes I wrote in January 2019 are still in the app in 2026.",
            "The display record and activation flow I added in 2019 now serve KDS, POS, kiosk and task displays.",
          ],
        },
        { type: "subhead", text: "Where it fell short" },
        {
          type: "list",
          items: [
            "Polling put a request on the server from every screen every 10 seconds until teammates moved it to push.",
            "The timers trusted each tablet’s clock until 2026.",
            "The KDS had no automated tests for most of its life. I found none in the KDS or display code at the end of 2019.",
          ],
        },
      ],
    },
    {
      id: "learned",
      heading: "What I learned",
      blocks: [
        {
          type: "p",
          text: "Treat the device as an untrusted input from the first release. A kitchen screen runs on hardware you don’t control, and its clock is part of that. In 2019 the cheap fix would have been to stamp every update with the server’s time.",
        },
        {
          type: "p",
          text: "Write tests while building, especially for small pure functions. Both bugs I fixed in 2026 sat in one: the clock math and a sort comparator. Each needed about 200 lines of tests, which would have been easy to write when the code was new.",
        },
      ],
    },
    {
      id: "after",
      heading: "After the first release",
      intro: "A short epilogue. The platform kept changing for years, mostly in other hands.",
      blocks: [
        {
          type: "timeline",
          items: [
            { when: "2020", who: "Teammates", what: "Replaced polling with socket-based push in a performance and scaling effort, and added a device type so other screens could share the display record." },
            { when: "2022", who: "Me, as engineering manager", what: "Wrote the spec to move each device’s settings into one flexible settings record per device type, so new settings wouldn’t need database changes." },
            { when: "2022", who: "Me, as engineering manager", what: "Reverted a task-display release that broke older iOS devices, the day after it merged. A teammate fixed it, and I promoted the fix that afternoon." },
            { when: "2023", who: "Me and a teammate", what: "I wrote the backfill that copied settings into the new record without dropping anything; a teammate moved the code over. Most old columns were removed in 2024." },
            { when: "2026", who: "Me, in my current role", what: "Anchored order timers to the server clock and fixed the order of coursed cards, both with automated tests." },
            { when: "2026", who: "A teammate", what: "Added a check that finds orders a push never delivered." },
          ],
        },
      ],
    },
    {
      id: "technical",
      heading: "Technical notes",
      aside: true,
      intro: "Optional detail for engineers.",
      blocks: [
        { type: "subhead", text: "The first release" },
        {
          type: "p",
          text: "Node.js, Marko and PostgreSQL. Each screen requested its station’s or expo’s orders every 10 seconds, and taps to claim, fulfill or recall went back to the server as requests. The push prototype it replaced used a PostgreSQL notification feeding a server-sent event stream.",
        },
        { type: "subhead", text: "How updates reach a screen now" },
        {
          type: "p",
          text: "Built by teammates from 2020. When an order is sent, a database trigger raises a notification on a per-location channel. A realtime service collapses bursts, loads the location’s orders once, builds each connected screen’s payload (its stations or expo group, recent closed orders, the server’s timestamp) and pushes it over Socket.IO. The screen shows a banner if it has been disconnected for 15 seconds, and a periodic check compares pulled orders with pushed ones to catch silent loss.",
        },
        { type: "subhead", text: "The 2026 timer fix" },
        {
          type: "p",
          text: "Every payload now carries the server’s timestamp, and the screen measures elapsed time from a monotonic reading anchored to it. My first version stored an offset against the browser’s wall clock; I replaced it before merging, because a network time correction on the tablet would have counted the offset twice and pushed timers an hour ahead.",
        },
        { type: "subhead", text: "The 2026 course-order fix" },
        {
          type: "p",
          text: "Coursing splits an order into one row per course, and each course fires from its own queued job, so a course’s send time depends on which job commits first. Sibling courses could arrive with their times inverted. Serializing the jobs would have given up parallelism, so the screen instead groups courses from the same split that fired within a second, anchors the group to its earliest send, and breaks ties by course number. The old comparator also returned NaN when comparing a held course with a sent one, which leaves the sort order up to the JavaScript engine.",
        },
      ],
    },
  ],
};
