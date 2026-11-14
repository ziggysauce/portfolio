// Case study: an AI-assisted review and delivery loop, 2026.
// DRAFT. Sources, attribution and open questions: docs/case-studies/review-loop.md.

import type { Study } from "../work";

export const reviewLoop: Study = {
  slug: "review-loop",
  title: "Building a better review loop",
  shortTitle: "Review loop",
  summary:
    "As an engineering manager who still reviews and ships code, I turned the review and follow-through work I kept repeating into a set of AI-assisted procedures. The AI reads, drafts and checks; I decide what gets posted, merged or changed.",
  status: "draft",
  role: "Designer, builder and main user",
  timeframe: "2026",
  tags: ["AI-assisted engineering", "Code review", "Process"],
  exhibit: "plans",
  featuredOn: ["marker", "plans"],
  length: "full",
  hero: {
    figure: "loop-hero",
    caption: "Each step pairs what the AI prepares with the decision that stays with me.",
    label: "Diagram",
  },
  facts: [
    {
      label: "My role",
      value: "I designed and built it, and I’m its main user. I wrote the procedures, scripts and standing rules, and I make the calls that matter: what gets posted, marked ready or merged.",
    },
    { label: "When", value: "July to November 2026, still changing" },
    { label: "Built with", value: "Claude Code, as a personal setup rather than a team tool" },
  ],
  sections: [
    {
      id: "problem",
      heading: "The work I kept repeating",
      blocks: [
        {
          type: "p",
          text: "Review was our team’s bottleneck: I flag any pull request open longer than three days. I’d been using Claude Code for reviews since July, but every session started from nothing, so I was doing the same setup by hand each time.",
        },
        {
          type: "p",
          text: "Before building anything, I went through a month of my own prompts, about 560 of them. The repeats were specific. I was pasting another AI tool’s reviews into Claude by hand, retyping the same review checklist (does it do what was asked, does it break anything, is it ready to merge), and asking the same follow-ups: “is this mergeable?” about 30 times in two weeks, and “commit and push” about 60 times in four.",
        },
        {
          type: "p",
          text: "I treated it like a product. The product was our development workflow, the users were me and the developers whose work I review, and the measures were review rounds and time to merge, with problems that reach production as the counterweight.",
        },
      ],
    },
    {
      id: "loop",
      heading: "The loop",
      blocks: [
        {
          type: "p",
          text: "I built only what those counts showed repeating, as short procedures with a fixed output. A typical change goes through the same steps, and each step has a line between what the AI prepares and what I decide.",
        },
        {
          type: "list",
          ordered: true,
          leads: true,
          items: [
            "Restate the ask. The AI turns a ticket into one sentence, plus what it won’t build. I confirm the scope before any code exists.",
            "Build in isolation. Each change gets its own copy of the code on its own branch, and live tests run against a disposable copy of the database.",
            "Review in a fixed shape. Every review ends the same way: a one-line verdict, numbered findings with severity and location, and the exact comment ready to post. I read it and decide what to post.",
            "Apply feedback once. Each review comment is marked fix, already fixed, or disagree, and the same defect is looked for in similar code before anything is pushed.",
            "Learn from what slips through. A week after changes reach production, a script looks for any that needed a later fix, which I call an escape. The AI proposes one rule change per miss, and nothing changes until I approve it.",
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
          text: "Some things never happen without me. The AI never posts to GitHub or Slack, marks a pull request ready, or merges anything unless I say so. Every comment the AI drafts is labeled as coming from Claude. Pushing a draft pull request is the one step I automated outright, with a list of exceptions that always stop for me: database migrations, shared-database changes and infrastructure config.",
        },
      ],
    },
    {
      id: "mistakes",
      heading: "How mistakes improved it",
      blocks: [
        {
          type: "p",
          text: "The loop changed most when it missed something. Each miss became a specific rule.",
        },
        {
          type: "decisions",
          items: [
            {
              title: "A fresh reviewer on every one of my own changes",
              body: "On one change, a review by the same AI at its highest effort setting called it ready to merge. A second reviewer with no context, given only the diff and the ask, found three real defects: a retry that sent default values, a race in a duplicate check, and numbers in the description that the data contradicted.",
              tradeoffLabel: "What changed",
              tradeoff: "Self-review is anchored by what it already believes. Now a context-free reviewer runs on every change I make, and riskier changes also get a checklist pass.",
            },
            {
              title: "Measure before calling something slow",
              body: "I once flagged a report query as slow based on the database’s cost estimate. Timed on a copy of the data, the original took about 3 seconds once warm, and the rewrites I’d suggested took 40 to 60.",
              tradeoffLabel: "What changed",
              tradeoff: "A speed finding now needs real timings, old against new, before it goes in a review.",
            },
            {
              title: "A ceiling on autonomy",
              body: "I tried a scheduled job that swept my open pull requests on its own. After one run it had left unfinished merges in several working copies, more work than I wanted, so I turned it off.",
              tradeoffLabel: "What changed",
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
          text: "The procedures are in daily use. In its first screenings, the escape check found three changes that needed a later fix in production. Each fix landed within about a day, and each miss became a rule. I don’t have an earlier baseline to compare against.",
        },
        {
          type: "p",
          text: "My own changes merged faster after the switch, and I shipped more of them. My role and the kind of work changed over the same months, so I don’t read that as proof the workflow improved anything. I can’t show that review rounds fell for other developers either: after September, too few of their changes reached me to compare.",
        },
      ],
    },
    {
      id: "learned",
      heading: "What I learned",
      blocks: [
        {
          type: "p",
          text: "Count first, then recount. Every rule started from a count of what I kept repeating, but for most of them I only have the before number. I should have rerun the same count a few weeks after each change.",
        },
        {
          type: "p",
          text: "I built it for myself first. Next time I’d pilot the pre-review check with two developers and measure their review rounds from day one.",
        },
      ],
    },
  ],
};
