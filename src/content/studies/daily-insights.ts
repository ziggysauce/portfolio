// Case study (short): guest feedback and a sales projection in the daily email, 2018.
// DRAFT. Sources, attribution and open questions: docs/case-studies/daily-insights.md.

import type { Study } from "../work";

export const dailyInsights: Study = {
  slug: "daily-insights",
  title: "Turning a payout email into daily insights",
  shortTitle: "Daily insights",
  summary:
    "My first project at GoTab: adding guest feedback and sales context to the email venue operators already got every day, so the day’s numbers arrived with how guests felt about their visit.",
  status: "draft",
  role: "Software developer",
  timeframe: "2018",
  tags: ["Reporting", "Email", "Guest feedback"],
  exhibit: "kds",
  featuredOn: [],
  length: "short",
  hero: {
    figure: "insights-email",
    alt: "A simplified daily email for a venue: a payout summary, a customer experiences section with star ratings and a guest comment, and a bar chart of projected against actual sales for the week.",
    caption: "The daily email after the additions: the payout summary, then guest ratings and comments, then the week’s sales against a projection.",
    label: "Illustrative reconstruction · Sample data",
  },
  facts: [
    { label: "My role", value: "Software developer, new to GoTab. I wrote the queries, the email template and the sending changes." },
    { label: "When", value: "June to October 2018" },
    { label: "Status", value: "Still sent daily, with the sections I added." },
  ],
  sections: [
    {
      id: "story",
      heading: "Why the existing email",
      blocks: [
        {
          type: "p",
          text: "GoTab already emailed each venue every day about its card payouts. Guests could also rate a visit and leave a comment, but none of that reached the operators who could act on it. Rather than start a new report they’d have to remember to open, I added to the email they already received.",
        },
        {
          type: "p",
          text: "It gained guest ratings and comments, with the lowest first, item ratings, the day’s sales, and the week’s sales against a projection from recent weeks. The subject changed from “Payout” to “Insights” to match. Ratings follow the restaurant’s business day, and a guest’s contact details appear only when the guest has agreed to be contacted.",
        },
      ],
    },
    {
      id: "result",
      heading: "What lasted",
      blocks: [
        {
          type: "p",
          text: "The daily email still goes out, and its guest feedback and projected-versus-actual sections are still in it. The review feedback on that first project also stayed with me: it became my own checklist before opening a pull request.",
        },
      ],
    },
  ],
};
