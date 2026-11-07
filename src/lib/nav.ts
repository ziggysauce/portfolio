// Tracks whether this visit has moved between pages, so a back button can tell
// "return to where you were on this site" from "leave for LinkedIn".
let views = 0;

export function noteView() {
  views += 1;
}

export function canGoBack() {
  return views > 1;
}
