// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { ceilingFor, clearOf, fitBetween, type Obstacle } from "./layout.ts";

// The header at 1280 × 720, as measured: the sign's lines down the left (the identity line runs to x 546,
// the ticket ends at y 190) and the navigation pill top right.
const header: Obstacle[] = [
  { left: 20, right: 363, bottom: 34 }, // hall name
  { left: 20, right: 426, bottom: 104 }, // title
  { left: 20, right: 546, bottom: 128 }, // identity line
  { left: 20, right: 216, bottom: 190 }, // ticket
  { left: 880, right: 1260, bottom: 66 }, // navigation
];

test("a label under the identity line starts below the whole sign it shares columns with", () => {
  // The current-role label at 1280 × 720 sits at x 483–703: under the identity line, clear of the ticket.
  assert.equal(ceilingFor(483, 703, header), 140);
  // Wide enough to reach back over the ticket: below the ticket too.
  assert.equal(ceilingFor(200, 420, header), 202);
  // Off to the side of everything: only the screen's edge.
  assert.equal(ceilingFor(600, 860, header), 16);
});

test("with a ramp, the ceiling eases in as a label approaches a piece, and is full on contact", () => {
  // 54 px right of the identity line's end (x 546), over a 120 px ramp: part way down.
  assert.equal(ceilingFor(600, 860, header, 12, 16, 120), 16 + (140 - 16) * (1 - 54 / 120));
  assert.equal(ceilingFor(546, 760, header, 12, 16, 120), 140); // touching
  assert.equal(ceilingFor(483, 703, header, 12, 16, 120), 140); // overlapping: unchanged
  assert.equal(ceilingFor(700, 760, header, 12, 16, 120), 16); // far from everything
});

test("the 1280 × 720 overlap: a label centred above the ceiling is moved down, not shrunk", () => {
  // Before: 393 px tall, centred on its case at y 220, so its top was at y 23, behind the identity line.
  const fit = fitBetween(220 - 393 / 2, 393, 140, 638);
  assert.deepEqual(fit, { top: 140, maxHeight: null });
});

test("a label stays where it wants to be when it fits, and above the controls", () => {
  assert.deepEqual(fitBetween(300, 200, 140, 638), { top: 300, maxHeight: null });
  assert.deepEqual(fitBetween(500, 200, 140, 638), { top: 438, maxHeight: null }); // would run under the controls
});

test("when the gap is too short for the label, it fills the gap and scrolls instead", () => {
  assert.deepEqual(fitBetween(0, 393, 202, 518), { top: 202, maxHeight: 316 });
  // A window too short for even that keeps the label readable rather than collapsing it.
  assert.deepEqual(fitBetween(0, 393, 202, 250), { top: 202, maxHeight: 160 });
});

test("an open note steps right of the label it would cover, and stays on screen", () => {
  const label = { left: 483, top: 140, width: 220, height: 393 };
  assert.equal(clearOf({ left: 603, top: 337, width: 264, height: 300 }, label, 1280), 719);
  assert.equal(clearOf({ left: 760, top: 337, width: 264, height: 300 }, label, 1280), 760); // already clear
  assert.equal(clearOf({ left: 603, top: 337, width: 264, height: 300 }, label, 960), 680); // kept on screen
  assert.equal(clearOf({ left: 603, top: 337, width: 264, height: 300 }, null, 1280), 603);
});
