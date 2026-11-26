# PR #9 review: responsive museum, before and after

Screenshots for the phone and short-landscape work in PR #9 (`claude/museum-guide-rail`). All are Chrome, emulated, at a device pixel ratio of 2. None are from a real device.

- **`before/`**:
  - The phone, desktop-link and drawer shots come from the PR's preview at f0fe628, before this work.
  - The two landscape shots come from a local dev server at the same commit.
- **`after/`**: the production build (`VERCEL_ENV=preview npm run build`, served from `out/`) at the commit that added this folder.

| What | Before | After |
|---|---|---|
| KDS, 375×667 (the reported case) | `before/phone-375x667-kds.jpg` | `after/phone-375x667-kds.jpg` |
| KDS, 390×844 | `before/phone-390x844-kds.jpg` | `after/phone-390x844-kds.jpg` |
| Longest placard (001), unfolded | `before/phone-390x844-plans-longest-placard.jpg` | `after/phone-390x844-plans-longest-placard-read.jpg`, `after/phone-375x667-plans-longest-placard-read.jpg` |
| Open drawer (KDS bell) | `before/phone-390x844-kds-drawer-open.jpg` | `after/phone-390x844-kds-drawer-open.jpg` |
| Phone guide (sheet) open | (n/a) | `after/phone-390x844-guide-open.jpg`, `after/phone-375x667-guide-open.jpg` |
| Other phone stops | (n/a) | `after/phone-390x844-after-hours.jpg`, `after/phone-390x844-desk.jpg` |
| Short landscape, guide closed | `before/landscape-667x375-kds.jpg` | `after/landscape-667x375-kds-guide-closed.jpg`, `after/landscape-844x390-kds-guide-closed.jpg` |
| Short landscape, guide open (overlay) | (n/a: the 340px rail pushed the hall) | `after/landscape-667x375-guide-open.jpg`, `after/landscape-844x390-guide-open.jpg` |
| Short landscape, drawer open | `before/landscape-667x375-kds-drawer-open.jpg` | `after/landscape-667x375-kds-drawer-open.jpg` |
| Short landscape, wide case | (n/a) | `after/landscape-667x375-after-hours.jpg` |
| Narrow window (900×700), guide open (overlay) | (n/a) | `after/narrow-900x700-guide-open.jpg` |
| Case-study links, desktop | `before/desktop-1280x744-case-study-links.jpg` (crop) | `after/desktop-1280x744-plans-links.jpg` |

`npm run test:layout` writes a screenshot of every state it checks to `test-results/layout/`, which is git-ignored.
