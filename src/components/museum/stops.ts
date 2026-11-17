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
 * What the walking control that goes from stop `from` to stop `to` says. Within the career (newest first,
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

/** What the counter says at stop i: the place in the career, or the room's name. */
export function positionLabel(i: number, exhibits: StopExhibit[]) {
  if (i >= exhibits.length) return "Information desk";
  const exhibit = exhibits[i];
  if (exhibit.kind === "personal") return "Off the clock";
  const career = exhibits.filter((item) => item.kind !== "personal");
  const at = career.indexOf(exhibit);
  return at === 0 ? `Current role · 1 of ${career.length}` : `Career · ${at + 1} of ${career.length}`;
}
