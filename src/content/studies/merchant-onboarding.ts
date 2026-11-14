// Case study: merchant onboarding, 2019–2026.
// DRAFT. Sources, attribution and open questions: docs/case-studies/merchant-onboarding.md.

import type { Study } from "../work";

export const merchantOnboarding: Study = {
  slug: "merchant-onboarding",
  title: "Making the first steps easier",
  shortTitle: "Merchant onboarding",
  summary:
    "Before a restaurant can take payments, a payment processor has to approve it, and the setup work queues up behind that approval. I worked on that path for seven years, from the first application forms to a self-serve flow, now in internal testing, that lets setup start while approval runs.",
  status: "draft",
  role: "Engineer, engineering manager, then technical product leader",
  timeframe: "2019–2026",
  tags: ["Onboarding", "Payments", "Self-serve", "AI-assisted setup"],
  exhibit: "plans",
  length: "full",
  hero: {
    figure: "onboarding-hero",
    caption: "In the self-serve flow, a new restaurant sets up in a sandbox while its payment application is reviewed, and goes live once it’s approved.",
    label: "Simplified diagram · In internal testing",
  },
  facts: [
    {
      label: "My role",
      value: "I wrote the first merchant application forms as an engineer, led their rebuild as an engineering manager, and specified and built the self-serve flow in 2026.",
    },
    { label: "When", value: "2019 to 2026" },
    { label: "Status", value: "The application forms and hosted verification are in production. Self-serve signup is in internal testing." },
  ],
  sections: [
    {
      id: "problem",
      heading: "Why the first steps were hard",
      blocks: [
        {
          type: "p",
          text: "A restaurant can’t take card payments on GoTab until a payment processor approves the business. That takes the legal entity, every owner, a bank account and signed terms, and an application that’s wrong in small ways comes back rejected. The processor’s rules also kept changing, and each change meant changing our forms.",
        },
        {
          type: "p",
          text: "Even with the paperwork handled, getting from a sales call to a live restaurant took many steps. A prospect couldn’t try the product until someone set up a test location by hand, and the website’s signup form went to the sales team with no connection to the product itself.",
        },
      ],
    },
    {
      id: "role",
      heading: "My role",
      blocks: [
        {
          type: "p",
          text: "I worked on this path in three roles. As an engineer, I wrote GoTab’s first merchant application forms. As an engineering manager, I scoped and led their rebuild while two engineers built the pages. When we moved to a new processor, I built the form merchants fill in. In 2026 I wrote the specs for self-serve onboarding and built it, working mostly on my own with an AI coding assistant, while onboarding, sales and support staff tested it.",
        },
      ],
    },
    {
      id: "evolution",
      heading: "How the path changed",
      blocks: [
        {
          type: "timeline",
          items: [
            { when: "2019–20", tag: "Shipped", what: "Two paths through the processor’s application: a quick one for small merchants and a full one." },
            { when: "2022", tag: "Shipped", what: "A rebuilt application, plus a dashboard of pending accounts whose statuses update on their own." },
            { when: "2023", tag: "Shipped", what: "A one-page form that hands applicants to the new processor’s own verification." },
            { when: "2026", tag: "In internal testing", what: "Self-serve signup: a sandbox to set up in while approval runs, and an assistant that drafts the menu." },
          ],
        },
        {
          type: "decisions",
          items: [
            {
              title: "Split the rebuild so two engineers could work at once",
              when: "2022",
              body: "I wrote the problem statement, worked from a designer’s flow, and cut the work into a dozen small pieces, each with its own user and goal. I built the shared frame and reviewed every page. The pieces came together on one branch and shipped as one release.",
              tradeoff: "Our previous form had spent months on a single branch. Slicing fixed that, but slicing by page left a couple of goals that spanned several pages without a clear owner.",
            },
            {
              title: "Let the processor collect what it verifies anyway",
              when: "2023",
              body: "When GoTab moved to a new payment processor, I didn’t port our multi-page application. The form I built takes a business name, address and contact, then hands the applicant to the processor’s own hosted verification.",
              tradeoff: "Our form went from several pages to one, and verification now happens in the processor’s own flow.",
            },
          ],
        },
      ],
    },
    {
      id: "self-serve",
      heading: "Self-serve: setting up while approval runs",
      blocks: [
        {
          type: "p",
          text: "By 2026 the form was the smaller problem. The slow part of getting started was everything after it: menus, taxes, tips and hours. None of that needs live payments, but all of it waited on approval and on staff.",
        },
        {
          type: "decisions",
          items: [
            {
              title: "Start setup before approval finishes",
              body: "In the version we’re testing, after a new signup verifies a phone number and passes screening, it gets a sandbox location with test payments, capped at a small amount. Staff approval starts only the payment application, so setup and approval run side by side. Going live switches the location to real payments in one step.",
              alternative: "Hold everything until approval. Instead, I decided that only signups the screening flags wait for staff before getting a sandbox.",
            },
            {
              title: "The assistant drafts, the operator confirms",
              body: "An AI assistant reads an uploaded menu and saves drafts. The operator reviews them with a preview of what guests will see, then confirms. The main app checks everything again before importing it, with nothing turned on.",
              tradeoff: "In testing, the assistant once changed menus nobody had asked about, so I set a rule: it adds nothing unasked and edits only what the operator names. A wrong price on a live menu costs money; a draft costs a click.",
            },
          ],
        },
        {
          type: "p",
          text: "I also kept the public signup out of the main app. It runs as its own small service that hands each signup to the main app, which validates it again and owns every record. It’s designed so an open form can’t flood the main app, and so signups keep arriving even when the main app is down.",
        },
      ],
    },
    {
      id: "result",
      heading: "Where it stands",
      blocks: [
        {
          type: "p",
          text: "The application forms and hosted verification are how merchants get approved today, with our onboarding team’s help. That assisted flow activates about 50 venues a month, 65–75% of applications reach activation, and roughly 97% of those locations remain live.",
        },
        {
          type: "p",
          text: "Self-serve signup is a different stage. We turned it on for internal use in October 2026, staff have been testing it since, and several follow-ups were still in review in November. It isn’t available to merchants yet, so I don’t have results for it.",
        },
      ],
    },
    {
      id: "learned",
      heading: "What I learned",
      blocks: [
        {
          type: "p",
          text: "Slice by goal as well as by screen. Splitting the rebuild by page let two engineers work in parallel, but the goals that crossed pages had no clear owner. Next time each goal gets its own piece of work and its own test.",
        },
        {
          type: "p",
          text: "Test the launch against systems you don’t control. Our launch checks showed that one screening provider couldn’t be reached from the new signup service, so screening now runs through the main app. Next time I’ll run each outside provider from the real environment before merging.",
        },
      ],
    },
  ],
};
