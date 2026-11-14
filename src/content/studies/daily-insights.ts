// Case study (short): guest feedback and a sales projection in the daily email, 2018.
// DRAFT. Sources, attribution and open questions: docs/case-studies/daily-insights.md.

import type { Study } from "../work";

export const dailyInsights: Study = {
  slug: "daily-insights",
  title: "Turning a payout email into daily insights",
  shortTitle: "Daily insights",
  summary:
    "My first project at GoTab: adding guest ratings, feedback and a sales projection to the email venue operators already got every day, so the numbers came with how guests felt about the visit.",
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
    {
      label: "My role",
      value: "New software developer. I wrote the queries, the email template and the sending changes; two teammates reviewed them.",
    },
    { label: "When", value: "June to October 2018" },
    { label: "Status", value: "Still sent daily. The sections I added are still in it." },
  ],
  sections: [
    {
      id: "story",
      heading: "What I added",
      blocks: [
        {
          type: "p",
          text: "GoTab already emailed each venue every day about its card payouts: deposit totals, payments by check and server, and anything that didn’t reconcile. Guests could also rate a visit (value, ambiance, drinks, food and service) and leave a comment, but none of that reached the email.",
        },
        {
          type: "p",
          text: "Rather than start a new report, I added to the email operators already received. It gained guest ratings and comments, with the lowest ratings first, item ratings, the day’s sales, and a projected-against-actual view of the week, estimated from the same weekday in recent weeks. The subject changed from “Payout” to “Insights” to match. Managers could also preview and send it from the dashboard.",
        },
      ],
    },
    {
      id: "constraints",
      heading: "Working within an inbox",
      blocks: [
        {
          type: "list",
          items: [
            "Email clients don’t run scripts, so interactive charts were out. I tried bars built from styled tables, then moved to chart images drawn on the server, which could show projected and actual sales side by side.",
            "Ratings had to line up with the restaurant’s business day, not its payouts, because the email also goes out on days without a payout.",
            "Guest contact details appear only when the guest agrees. I added a “contact me” choice to the review screen, and the email shows a guest’s details only when they’ve said yes.",
          ],
        },
      ],
    },
    {
      id: "result",
      heading: "What lasted",
      blocks: [
        {
          type: "p",
          text: "The daily email still goes out, and its customer experiences and projected-versus-actual sections are still there. A weekly version I built alongside it never went beyond my own inbox; I switched it off at the end of 2018.",
        },
        {
          type: "p",
          text: "It was also how I learned what review looks for here. The email took about three weeks to merge, and the feedback (move test values into settings, guard against missing data and division by zero, fetch data in one query instead of several) became my own checklist before opening a pull request.",
        },
      ],
    },
  ],
};
