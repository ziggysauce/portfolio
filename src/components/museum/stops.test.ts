// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { hashForStop, positionLabel, stepLabel, stopFromHash, type StopExhibit } from "./stops.ts";

// The walking order (newest first), with each exhibit's original catalog number.
const exhibits: StopExhibit[] = [
  { id: "plans", catalog: "005", kind: "role", title: "Plans & Pull Requests" },
  { id: "marker", catalog: "004", kind: "role", title: "The Nearly Dry Marker" },
  { id: "kds", catalog: "003", kind: "role", title: "The First KDS" },
  { id: "research", catalog: "002", kind: "education", title: "The Research Years" },
  { id: "origin", catalog: "001", kind: "education", title: "The Origin Specimen" },
  { id: "after-hours", catalog: "006", kind: "personal", title: "After Hours" },
];
const DESK = exhibits.length;

test("old #case-NNN links still open the same exhibit after the reorder", () => {
  assert.equal(stopFromHash("#case-001", exhibits), 4); // The Origin Specimen, now last in the career
  assert.equal(stopFromHash("#case-003", exhibits), 2); // The First KDS
  assert.equal(stopFromHash("#case-005", exhibits), 0); // Plans & Pull Requests, now first
  assert.equal(stopFromHash("#case-006", exhibits), 5); // After Hours
  assert.equal(stopFromHash("#case-009", exhibits), null);
});

test("id addresses and the desk", () => {
  assert.equal(stopFromHash("#plans", exhibits), 0);
  assert.equal(stopFromHash("#after-hours", exhibits), 5);
  assert.equal(stopFromHash("#desk", exhibits), DESK);
  assert.equal(stopFromHash("#main", exhibits), null);
  assert.equal(stopFromHash("", exhibits), null);
  for (let i = 0; i <= DESK; i++) assert.equal(stopFromHash(hashForStop(i, exhibits), exhibits), i);
});

test("step labels say which way in time, and where a step leaves the career", () => {
  assert.equal(stepLabel(0, 1, exhibits).label, "Earlier role");
  assert.equal(stepLabel(1, 0, exhibits).label, "Later role");
  assert.equal(stepLabel(2, 3, exhibits).label, "Earlier"); // onto a degree
  assert.equal(stepLabel(3, 2, exhibits).label, "Later role");
  assert.equal(stepLabel(3, 2, exhibits).name, "Later role: The First KDS");
  assert.equal(stepLabel(4, 5, exhibits).label, "After Hours");
  assert.equal(stepLabel(5, 4, exhibits).label, "Back to the career");
  assert.equal(stepLabel(5, DESK, exhibits).label, "Information desk");
  assert.equal(stepLabel(DESK, 5, exhibits).label, "After Hours");
  assert.equal(stepLabel(0, 1, exhibits).short, "Earlier");
  assert.equal(stepLabel(5, DESK, exhibits).short, "Desk");
});

test("the counter counts the career only", () => {
  assert.equal(positionLabel(0, exhibits), "Current role · 1 of 5");
  assert.equal(positionLabel(4, exhibits), "Career · 5 of 5");
  assert.equal(positionLabel(5, exhibits), "Off the clock");
  assert.equal(positionLabel(DESK, exhibits), "Information desk");
});
