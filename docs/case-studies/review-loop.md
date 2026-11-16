# Editorial record: Building a better review loop (AI-assisted engineering workflow)

- **Status:** draft, not fact-approved.
- **Page:** `src/content/studies/review-loop.ts`, at `/work/review-loop`.
- **Museum:** cases 004 and 005 link here; Return to museum goes to case 005.
- **Daniel's role and period:** designer, builder and main user, July – November 2026.
  - Daniel: wrote the skills, scripts and rules, and decides what is posted or merged.
  - Claude Code: reads, drafts and applies.

**Sources**
- `DTN case studies.pdf`: chapter on pp. 32–40; public version on p. 50.
- Approved site copy: `catalog.ts` `ai-delivery` and `claude-code`.

Key: **S** = stated in a source. **I** = inferred or reworded. **C** = Daniel to confirm.

## Claims

| Claim as published | Source | Support |
|---|---|---|
| Review latency was the team's bottleneck; a 3-day open-PR flag | PDF p.33; public p.50 | S |
| Using Claude Code for reviews since July; each session started from nothing | PDF p.33 | S |
| A month of prompts, about 560 | PDF p.33 (563 prompts, Aug 25 – Sep 23) | S |
| Relaying another AI's reviews; retyping the review checklist; "mergeable?" about 30 times in two weeks; "commit and push" about 60 times in four | PDF p.33 | S |
| Treated as a product: users, measures, counter-metric | PDF p.33–34 | S |
| Loop steps: restate the ask; worktree and DB-fork tests; fixed review shape; fix / already fixed / disagree plus a sibling sweep; a retro a week after release proposing one rule, applied only on approval | PDF p.34–36 | S |
| Nothing posts, gets marked ready or merges without Daniel | PDF p.34–35 | S. The "From Claude" comment label and the draft-push automation are no longer on the page (2026-11-16, at Daniel's request). |
| Fresh reviewer: a top-effort self-review passed, and a context-free reviewer found three defects (retry defaults, duplicate-check race, description numbers) | PDF p.35, 36 | S |
| A planner-cost finding was disproved by timing: about 3 s warm vs 40–60 s for the rewrites | PDF p.37 (2.7 s warm / 17.8 s cold vs 40–60 s) | S |
| A scheduled sweep left unfinished merges after one run; disabled; now prepares and waits | PDF p.36, 39 | S |
| Retro found three escapes in its first screenings; each fixed within about a day; each became a rule; no baseline | PDF p.38 | S |
| ~~Own changes merged faster and more of them shipped~~ | Removed 2026-11-16 | The page now says only that the effect on delivery speed hasn't been isolated. |
| Too few developer PRs reached Daniel after September to compare review rounds | PDF p.38 | S |
| Lessons: count then recount; built for myself first, pilot with two developers | PDF p.38–39 | S |

## Deliberately left out of the public page

- Exact before/after numbers: 87 h → 35 h, 21% → 36%, and 11 vs 203 PRs. Small, changing sample; the direction is stated with its caveat.
- The 222/738 query-failure count.
- Skill and file line counts, and co-author trailer counts.
- Internal PR stories: the payments PR, the accessibility PR, the shared date picker, POS layout.
- The 563-prompt date range.
- The portable kit.

## Visuals

- **Loop diagram.** An original diagram, describing the actual procedure.
- **Review output.** An example with sample content. The three findings paraphrase the real defects from the menu-save PR, and the file names are invented.
- **No real screenshot needed.** A sanitized screenshot of an actual review would be stronger, if you want one.

## Open questions

1. Do any developers run the pre-review check on their own branches? The PDF leaves this as "fill in". The page calls it a personal setup.

## Revision, 2026-11-16

- **Role:** "Director of Technical Product Management", matching the period (July 2026 on, per `site.ts`), not "engineering manager".
- **Centered on the independent reviewer:** the repeated review work, the context-free reviewer that found three defects a self-review passed, and what changed.
- **Trimmed:**
  - the 560-prompt count, the "mergeable?" ×30 and "commit and push" ×60 counts, and the 3-day flag;
  - the tool name in facts, the effort setting, and the automated-draft-push exception list.
- **Results:** "in daily use; its effect on delivery speed hasn't been isolated". The faster-merges observation is no longer stated, even with its caveat.
- **Added lesson** "don't let the reviewer share the author's assumptions" (**I**), a summary of the fresh-reviewer decision.
- **Retro named explicitly (at Daniel's request):** the "learn from what slips through" step is now called a retro that Daniel created and is still refining, to minimize bugs and regressions in later work. It appears in the summary, the loop step, the diagram and the results. Source: PDF p.36–38 ("a retro a week after release"), plus Daniel's note that it's still being refined.
- **Removed "From Claude":** at Daniel's request, the "From Claude" prefix on the sample review comment and the sentence about labeling drafted comments are gone.
