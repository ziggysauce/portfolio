// Where the hall's stops are, by address, and what the walking controls call a step. Plain functions with
// no imports, so they can be tested on their own (stops.test.ts). Stop i is exhibit i; the stop after the
// last exhibit is the Information desk.

export type StopExhibit = { id: string; catalog: string; kind: "role" | "education" | "personal"; title: string };

/**
 * The stop a URL hash names, or null:
 *   "#desk"       the Information desk
 *   "#plans"      an exhibit, by its id (what the hall and case studies write now)
 *   "#case-003"   an exhibit by its original catalog number: links from before the hall was reordered
 */
export function stopFromHash(hash: string, exhibits: Pick<StopExhibit, "id" | "catalog">[]): number | null {
  if (hash === "#desk") return exhibits.length;
  const legacy = /^#case-(\d+)$/.exec(hash);
  const at = legacy ? exhibits.findIndex((exhibit) => exhibit.catalog === legacy[1]) : exhibits.findIndex((exhibit) => `#${exhibit.id}` === hash);
  return at === -1 ? null : at;
}

/** The address of stop i. */
export function hashForStop(i: number, exhibits: Pick<StopExhibit, "id">[]) {
  return i >= exhibits.length ? "#desk" : `#${exhibits[i].id}`;
}

/**
 * Where the walking control that goes from stop `from` to stop `to` leads, for its accessible name (its
 * visible text is always "Prev" or "Next"). Within the career (newest first,
 * so walking on goes back in time) it names the direction: "Earlier role" and "Later role", or just
 * "Earlier" and "Later" when the step lands on a degree. Steps out of the career, to the personal room or
 * the desk, name where they go. `label` is the visible text, `short` its narrow-screen form, and `name` the
 * full accessible name.
 */
export function stepLabel(from: number, to: number, exhibits: StopExhibit[]): { label: string; short: string; name: string } {
  const desk = exhibits.length;
  const into = to >= desk ? null : exhibits[to];
  const out = from >= desk ? null : exhibits[from];
  const title = into ? into.title : "Information desk";
  const chronological = into && out && into.kind !== "personal" && out.kind !== "personal";
  if (chronological) {
    const word = to > from ? "Earlier" : "Later";
    const label = into.kind === "role" ? `${word} role` : word;
    return { label, short: word, name: `${label}: ${title}` };
  }
  if (!into) return { label: "Information desk", short: "Desk", name: "Information desk" };
  if (into.kind === "personal") return { label: into.title, short: into.title, name: into.title };
  return { label: "Back to the career", short: "Career", name: `Back to the career: ${title}` };
}

/** A stop's short code, the same in the field guide, its floor plan and the pager: the career and
 *  education numbered in walking order ("001"), the personal room "AH", the desk "i". */
export function stopCode(i: number, exhibits: StopExhibit[]) {
  if (i >= exhibits.length) return "i";
  const exhibit = exhibits[i];
  if (exhibit.kind === "personal") return "AH";
  const numbered = exhibits.filter((item) => item.kind !== "personal");
  return String(numbered.indexOf(exhibit) + 1).padStart(3, "0");
}

/** The placard's kicker, one format at every stop: "001 · Current role", "002 · Career",
 *  "004 · Education", "AH · Off the clock", "i · Before you go". */
export function kicker(i: number, exhibits: StopExhibit[]) {
  const code = stopCode(i, exhibits);
  if (i >= exhibits.length) return `${code} · Before you go`;
  const exhibit = exhibits[i];
  if (exhibit.kind === "personal") return `${code} · Off the clock`;
  if (exhibit.kind === "education") return `${code} · Education`;
  return `${code} · ${exhibits.findIndex((item) => item.kind === "role") === i ? "Current role" : "Career"}`;
}

/** The pager's middle: "001 / 005" in the numbered rooms, then "AH" and "DESK". */
export function pagerLabel(i: number, exhibits: StopExhibit[]) {
  if (i >= exhibits.length) return "DESK";
  const code = stopCode(i, exhibits);
  if (code === "AH") return code;
  return `${code} / ${String(exhibits.filter((item) => item.kind !== "personal").length).padStart(3, "0")}`;
}
