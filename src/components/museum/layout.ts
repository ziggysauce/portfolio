// Where a label or drawer note may sit on screen: below the sign and navigation, above the directory and
// walking controls, and clear of each other. Plain functions with no imports, so they can be tested on
// their own (layout.test.ts). All values are pixels in the hall's viewport.

/** A piece of the header (the hall's name, title, identity line, ticket, navigation), by its edges. */
export type Obstacle = { left: number; right: number; bottom: number };

/**
 * The highest a box spanning [left, right] may start: just under every header piece that shares columns
 * with it. A label off to the side of the title can rise higher than one underneath it. With a `ramp`, the
 * ceiling eases down over that many pixels of approach instead of jumping, so a label sliding past the
 * sign's edge during a walk glides rather than snaps; any real overlap still gets the full ceiling.
 */
export function ceilingFor(left: number, right: number, obstacles: Obstacle[], gap = 12, edge = 16, ramp = 0) {
  let ceiling = edge;
  for (const piece of obstacles) {
    const apart = Math.max(piece.left - right, left - piece.right); // < 0 when they share columns
    const weight = apart < 0 ? 1 : ramp > 0 ? Math.max(0, 1 - apart / ramp) : 0;
    if (weight > 0) ceiling = Math.max(ceiling, edge + (piece.bottom + gap - edge) * weight);
  }
  return ceiling;
}

/**
 * Where a box of natural height `height`, wanted at top `want`, goes between `ceiling` and `floor`: as
 * close to where it wants to be as fits. If even the whole gap is too short, it fills the gap and is
 * capped (`maxHeight`, never under `least`), and the box scrolls inside itself. Its text is never shrunk to fit.
 */
export function fitBetween(want: number, height: number, ceiling: number, floor: number, least = 160): { top: number; maxHeight: number | null } {
  const room = floor - ceiling;
  // On an absurdly short window it keeps a readable minimum, even if that runs past the floor.
  if (height > room) return { top: ceiling, maxHeight: Math.min(height, Math.max(least, room)) };
  return { top: Math.min(Math.max(want, ceiling), floor - height), maxHeight: null };
}

/**
 * The left edge for a box that wants to start at `left` but must not cover `other` (the case label beside
 * an open drawer note): unchanged if they don't meet, otherwise just past the other box's right edge,
 * kept on screen.
 */
export function clearOf(
  box: { left: number; top: number; width: number; height: number },
  other: { left: number; top: number; width: number; height: number } | null,
  viewportWidth: number,
  gap = 16,
) {
  if (!other) return box.left;
  const meets =
    box.left < other.left + other.width && box.left + box.width > other.left && box.top < other.top + other.height && box.top + box.height > other.top;
  if (!meets) return box.left;
  return Math.min(other.left + other.width + gap, viewportWidth - box.width - gap);
}
