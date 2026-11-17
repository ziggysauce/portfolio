// Case study: an AI-assisted review and delivery loop, 2026.
// DRAFT. Sources, attribution and open questions: docs/case-studies/review-loop.md.

import type { Study } from "../work";

export const reviewLoop: Study = {
  slug: "review-loop",
  title: "Building a better review loop",
  shortTitle: "Review loop",
  summary:
    "As a director of technical product management who still reviews and ships code, I turned the review work I kept repeating into a set of AI-assisted procedures. An independent reviewer caught issues my own checks missed, and a retro process I created, and am still refining, turns each miss into a change that helps prevent bugs and regressions in later work. The AI reads, drafts and checks; I decide what gets posted, merged or changed.",
  status: "draft",
  role: "Director of Technical Product Management; designer and main user of the workflow",
  timeframe: "2026",
  tags: ["AI-assisted engineering", "Code review", "Process"],
  exhibit: "plans",
  featuredOn: ["plans"], // July to November 2026: the director years, not the engineering-manager ones.
  length: "full",
  hero: {
    figure: "loop-hero",
    caption: "Each step pairs what the AI prepares with the decision that stays with me.",
    label: "Diagram",
  },
  facts: [
    {
      label: "My role",
      value: "Director of Technical Product Management at GoTab, still reviewing and shipping code. I designed and built the workflow and I’m its main user. The calls that matter stay with me: what gets posted, marked ready or merged.",
    },
    { label: "When", value: "2026, still changing" },
    { label: "Status", value: "In daily use, as a personal setup rather than a team tool" },
  ],
  sections: [
    {
      id: "problem",
      heading: "The work I kept repeating",
      blocks: [
        {
          type: "p",
          text: "Review was our team’s bottleneck. I’d been using an AI coding assistant for reviews, but every session started from nothing, so I was doing the same setup by hand each time.",
        },
        {
          type: "p",
          text: "Before building anything, I went back through my own requests to see what actually repeated. The same review checklist came up again and again (does it do what was asked, does it break anything, is it ready to merge), along with the same follow-ups after every review. I was also copying another tool’s reviews across by hand.",
        },
        {
          type: "p",
          text: "I treated it like a product. The users were me and the developers whose work I review, and the measures were review rounds and time to merge, with problems that reach production as the counterweight.",
        },
      ],
    },
    {
      id: "loop",
      heading: "The loop",
      blocks: [
        {
          type: "p",
          text: "I built only what repeated, as short procedures with a fixed output. A typical change goes through the same steps, and each step has a line between what the AI prepares and what I decide.",
        },
        {
          type: "list",
          ordered: true,
          leads: true,
          items: [
            "Restate the ask. The AI turns a ticket into one sentence, plus what it won’t build. I confirm the scope before any code exists.",
            "Build in isolation. Each change gets its own copy of the code, and live tests run against a disposable copy of the database.",
            "Review in a fixed shape. Every review ends the same way: a one-line verdict, numbered findings with severity and location, and the exact comment ready to post. I read it and decide what to post.",
            "Apply feedback once. Each review comment is marked fix, already fixed, or disagree, and the same defect is looked for in similar code before anything is pushed.",
            "Run a retro on what slips through. A week after changes reach production, the retro looks for any that needed a later fix. The AI proposes one rule change per miss, and nothing changes until I approve it, so each miss makes bugs and regressions less likely in the next round of work.",
          ],
        },
        {
          type: "figure",
          figure: "loop-review",
          caption: "The shape every review ends in, with made-up content. The verdict and findings are drafts; posting is my call.",
          label: "Example with sample content",
        },
        {
          type: "p",
          text: "Some things never happen without me. The AI never posts comments, marks a pull request ready, or merges anything unless I say so.",
        },
      ],
    },
    {
      id: "mistakes",
      heading: "What the independent reviewer caught",
      blocks: [
        {
          type: "p",
          text: "The loop changed most when it missed something, and the clearest lesson came from a second reviewer.",
        },
        {
          type: "decisions",
          items: [
            {
              title: "A fresh reviewer on every one of my own changes",
              body: "On one change, a thorough self-review by the same AI called it ready to merge. A second reviewer with no context, given only the diff and the original ask, found three real defects: a retry that sent default values, a race in a duplicate check, and numbers in the description that the data contradicted.",
              tradeoffLabel: "What I changed",
              tradeoff: "A review that already knows the reasoning behind a change tends to agree with it. Now an independent reviewer runs on every change I make, and I verify what it finds before acting on it.",
            },
            {
              title: "Measure before calling something slow",
              body: "I once flagged a report query as slow based on the database’s cost estimate. Timed on a copy of the data, the original took about 3 seconds once warm, and the rewrites I’d suggested took 40 to 60.",
              tradeoffLabel: "What I changed",
              tradeoff: "A speed finding now needs real timings, old against new, before it goes in a review.",
            },
            {
              title: "A ceiling on autonomy",
              body: "I tried a scheduled job that worked through my open pull requests on its own. After one run it had left unfinished work in several places, more cleanup than it saved, so I turned it off.",
              tradeoffLabel: "What I changed",
              tradeoff: "It now prepares fixes and waits for my approval. Steps that change shared state stay manual.",
            },
          ],
        },
      ],
    },
    {
      id: "result",
      heading: "What I can say about results",
      blocks: [
        {
          type: "p",
          text: "The workflow is in daily use. In its first screenings, the retro found three changes that needed a later fix in production; each was fixed within about a day, and each became a rule. I created the retro process and I’m still refining it, adjusting what it looks for as each round shows what slipped through.",
        },
        {
          type: "p",
          text: "I haven’t isolated its effect on delivery speed. My role and the kind of work I did changed over the same months, and too few other developers’ changes reached me to compare review rounds, so I don’t claim it made anyone faster.",
        },
      ],
    },
    {
      id: "learned",
      heading: "What I learned",
      blocks: [
        {
          type: "p",
          text: "Don’t let the reviewer share the author’s assumptions. The most useful check was the one that knew the least about why the change was written.",
        },
        {
          type: "p",
          text: "Count first, then recount. Every rule started from what I kept repeating, but I only have the before picture for most of them. Next time I’d repeat the same count a few weeks after each change, and pilot the pre-review check with two developers from day one.",
        },
      ],
    },
  ],
};
