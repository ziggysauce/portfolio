// Case study: merchant onboarding, 2019–2026.
// DRAFT. Sources, attribution and open questions: docs/case-studies/merchant-onboarding.md.

import type { Study } from "../work";

export const merchantOnboarding: Study = {
  slug: "merchant-onboarding",
  title: "Making the first steps easier",
  shortTitle: "Merchant onboarding",
  summary:
    "A restaurant can’t take live card payments until a payment processor approves it, but approval doesn’t have to hold up everything else. Anyone can now create a GoTab location and set it up in sandbox mode while that approval is pending. I worked on this path for seven years, from the first application forms to self-serve signup.",
  status: "draft",
  role: "Engineer, engineering manager, then technical product leader",
  timeframe: "2019–2026",
  tags: ["Onboarding", "Payments", "Self-serve"],
  exhibit: "plans",
  length: "full",
  hero: {
    figure: "onboarding-hero",
    caption:
      "Anyone can create a location, and it starts in sandbox mode. Setup goes ahead there while the payment application is reviewed; live payments switch on once the location is approved.",
    label: "Simplified diagram",
  },
  facts: [
    {
      label: "My role",
      value: "I wrote the first merchant application forms as an engineer, led their rebuild as an engineering manager, and specified and built self-serve signup in 2026.",
    },
    { label: "When", value: "2019 to 2026" },
    {
      label: "Status",
      value: "Anyone can create a location, limited to sandbox mode. Taking live payments still requires approval, through the application forms and the processor’s verification.",
    },
  ],
  sections: [
    {
      id: "problem",
      heading: "Two different first steps",
      blocks: [
        {
          type: "p",
          text: "Getting a restaurant onto GoTab involves two separate things: setting up the location, and getting approved to take live card payments. Approval comes from a payment processor. It needs the legal entity, every owner, a bank account and signed terms, and an application that’s wrong in small ways comes back rejected.",
        },
        {
          type: "p",
          text: "For years the two were tied together. A prospect couldn’t try the product until someone created a test location by hand, and the menus, taxes, tips and hours that make up most of setup waited on staff and on approval, even though none of them need live payments.",
        },
      ],
    },
    {
      id: "role",
      heading: "My role",
      blocks: [
        {
          type: "p",
          text: "I worked on this path in three roles. As an engineer, I wrote GoTab’s first merchant application forms. As an engineering manager, I scoped and led their rebuild. When we moved to a new processor, I built the form merchants fill in. In 2026 I wrote the specs for self-serve signup and built it.",
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
            { when: "2026", tag: "Shipped", what: "Self-serve signup: anyone can create a location and set it up in sandbox mode while approval for live payments is pending." },
          ],
        },
        {
          type: "decisions",
          items: [
            {
              title: "Split the rebuild into small, separate pieces",
              when: "2022",
              body: "I wrote the problem statement and cut the work into a dozen small pieces, each with its own user and goal, so the team could build them at the same time. I built the shared frame and reviewed every page, and the pieces shipped together as one release.",
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
      heading: "Self-serve: progress while approval is pending",
      blocks: [
        {
          type: "p",
          text: "By 2026 the application form was the smaller problem. The slow part was that setup waited on approval. Self-serve signup separates them.",
        },
        {
          type: "decisions",
          items: [
            {
              title: "Separate creating a location from taking live payments",
              body: "Anyone can create a location, and it starts in sandbox mode, with test payments only. The merchant can build out the location there while the payment application goes through review. Approval is what unlocks live payments, and going live switches the location over in one step.",
              alternative: "Hold everything until approval, as before. That kept the riskiest step safe, but it also held back all the setup work that doesn’t touch real money.",
              tradeoff: "The line between the two is payments. Setup can start on day one; live payments still wait for approval.",
            },
            {
              title: "The assistant drafts, the operator confirms",
              body: "I also built an AI assistant that reads an uploaded menu and saves drafts. The operator reviews them with a preview of what guests will see, then confirms, and the main app checks everything again before importing it, with nothing turned on.",
              tradeoff: "In testing, the assistant once changed menus nobody had asked about, so I set a rule: it adds nothing unasked and edits only what the operator names. A wrong price on a live menu costs money; a draft costs a click.",
            },
          ],
        },
        {
          type: "p",
          text: "I kept the public signup out of the main app. It runs as its own small service that hands each signup to the main app, which validates it again and owns every record. It’s designed so an open form can’t flood the main app, and so signups keep arriving even when the main app is down.",
        },
      ],
    },
    {
      id: "result",
      heading: "Where it stands",
      blocks: [
        {
          type: "p",
          text: "A merchant no longer has to wait for approval to make progress. Anyone can create a location and set it up in sandbox mode. Approval to take live payments still runs through the application forms and the processor’s verification, the part of the path I’ve worked on since 2019.",
        },
      ],
    },
    {
      id: "learned",
      heading: "What I learned",
      blocks: [
        {
          type: "p",
          text: "Slice by goal as well as by screen. Splitting the rebuild by page let the team work in parallel, but the goals that crossed pages had no clear owner. Next time each goal gets its own piece of work and its own test.",
        },
        {
          type: "p",
          text: "Test the launch against systems you don’t control. Our launch checks showed that one screening provider couldn’t be reached from the new signup service, so screening now runs through the main app. Next time I’ll run each outside provider from the real environment before merging.",
        },
      ],
    },
  ],
};
