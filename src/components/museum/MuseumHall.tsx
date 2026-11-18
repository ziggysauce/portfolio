"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Exhibit } from "@/content/exhibits";
import type { LabelAnchor, MuseumScene, PlinthAnchor } from "./scene";
import { STEP_MS } from "./discoveries";
import { DrawerContents, stepsFor } from "./DrawerContents";
import { ceilingFor, fitBetween, type Obstacle } from "./layout";
import { GuideRail, GuideSheet } from "./GuideRail";
import { hashForStop, kicker, pagerLabel, stepLabel, stopFromHash } from "./stops";
import styles from "./museum.module.css";

type Status = "loading" | "ready" | "fallback";

type Props = {
  hall: { name: string; subtitle: string };
  /** Who this is, readable on the first screen under the hall's name. */
  identity: string;
  /** In walking order: the career newest first, then personal rooms. */
  exhibits: Exhibit[];
  links: { work: string; about: string; resume: string; contact: string; email: string; linkedin: string; github: string };
  /** Cases with a case study to read, keyed by exhibit id. */
  studies: Record<string, { href: string; title: string; shortTitle: string }[]>;
  desk: { summary: string; farewell: string };
  /** The small unnumbered display between the last case and the desk: a card, not a stop. */
  fatherhood: { title: string; note: string; setting: string };
};

/**
 * Scroll position (in cases) to camera position. Every pixel of scroll moves the camera: a little slower
 * near a case, so it stays framed while you read, and a little faster between cases. No dead zones and
 * no plateaus, so fine input gives fine movement and steady scrolling gives steady travel.
 */
/** The field guide's widths, open and folded, in CSS pixels (the stylesheet matches). */
const RAIL_OPEN = 340;
const RAIL_FOLDED = 72;
/** On a phone, the least height an open drawer's sheet gets before the picture slides up to make room. */
const PHONE_SHEET_MIN = 260;
const RAIL_KEY = "museum-guide"; // Also read by the inline script in app/page.tsx.

// The guide's state lives on <html data-rail>, set before first paint (app/page.tsx): the remembered choice,
// or folded under 900px wide. After that it changes only when the visitor folds or opens it.
const GUIDE_EVENT = "museum-guide";
const guideFolded = () => {
  const stored = document.documentElement.dataset.rail;
  return stored ? stored === "folded" : window.innerWidth < 900;
};
/** The same as app/page.tsx's inline script, for arriving from another page by a client-side link, which
 *  doesn't run that script: the stylesheet needs <html data-rail>. */
function ensureGuideState() {
  const root = document.documentElement;
  if (root.dataset.rail) return;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(RAIL_KEY);
  } catch {
    // Blocked storage: fall back to the width rule.
  }
  root.dataset.rail = stored === "folded" || stored === "open" ? stored : window.innerWidth < 900 ? "folded" : "open";
  window.dispatchEvent(new Event(GUIDE_EVENT));
}
function setGuideFolded(folded: boolean) {
  document.documentElement.dataset.rail = folded ? "folded" : "open";
  try {
    localStorage.setItem(RAIL_KEY, folded ? "folded" : "open");
  } catch {
    // Private windows and blocked storage: the guide still folds, it just isn't remembered.
  }
  window.dispatchEvent(new Event(GUIDE_EVENT));
}
function onGuideChange(callback: () => void) {
  window.addEventListener(GUIDE_EVENT, callback);
  return () => window.removeEventListener(GUIDE_EVENT, callback);
}
const PHONE = "(max-width: 639px)";
const isPhone = () => window.matchMedia(PHONE).matches;
function onPhoneChange(callback: () => void) {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const noSubscribe = () => () => {};

const HOLD = 0.3; // Camera speed is 1 - HOLD at a case and 1 + HOLD halfway between.
function walk(progress: number) {
  const i = Math.floor(progress);
  const t = progress - i;
  return i + t - (HOLD * Math.sin(2 * Math.PI * t)) / (2 * Math.PI);
}

/** A stop between cases this close to one is left alone: it's a deliberate small adjustment. */
const NEAR = 0.12;
/** How long scrolling must have stopped before the walk finishes itself. Longer than the gap between two
 *  trackpad strokes, so it never starts between strokes and gets interrupted by the next one. */
const IDLE_MS = 450;

/** A programmatic walk: a cubic from the current scroll position and speed to rest at the goal. */
type Glide = { from: number; to: number; speed: number; start: number; duration: number; set: number; stop: number | null };
function glideAt(glide: Glide, now: number) {
  const s = Math.min(1, Math.max(0, (now - glide.start) / glide.duration));
  const T = glide.duration;
  const s2 = s * s;
  const s3 = s2 * s;
  const y = (2 * s3 - 3 * s2 + 1) * glide.from + (s3 - 2 * s2 + s) * T * glide.speed + (3 * s2 - 2 * s3) * glide.to;
  const v = ((6 * s2 - 6 * s) * glide.from + (3 * s2 - 4 * s + 1) * T * glide.speed + (6 * s - 6 * s2) * glide.to) / T;
  return { y, v, done: s >= 1 };
}

function supportsWebGL() {
  try {
    const probe = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && probe.getContext("webgl2"));
  } catch {
    return false;
  }
}

// Each stop's address in the URL (/#kds, /#desk, or an old /#case-003; see stops.ts). A case study's
// "Return to the museum" link uses it, and leaving the hall by one of its own links writes it, so Back lands
// on the same case. These are not element ids: the browser leaves them alone and the hall walks there itself.

export function MuseumHall({ hall, identity, exhibits, links, desk, fatherhood, studies }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<(HTMLElement | null)[]>([]);
  const plinthCard = useRef<HTMLDivElement>(null);
  // An open drawer's discovery shows in its placard, in place of the placard's body (see the markup).
  const notes = useRef<(HTMLElement | null)[]>([]);
  // The extra slide that makes room for an open drawer's placard beside (or, on a phone, under) its
  // discovery, on top of the field guide's inset. Set while placing labels; zero with every drawer shut.
  const extra = useRef({ x: 0, y: 0 });
  const captions = useRef<(HTMLElement | null)[]>([]);
  const noteToggles = useRef<(HTMLButtonElement | null)[]>([]);
  const [openNote, setOpenNote] = useState<number | null>(null);
  // Each drawer discovery's progress (bell rings, stamped cards, the card opened), and which drawer is
  // still animating its last step: input to it is ignored until then, never queued.
  const [steps, setSteps] = useState<number[]>(() => exhibits.map(() => 0));
  const [busy, setBusy] = useState<number | null>(null);
  const busyTimer = useRef(0);
  const openRef = useRef<number | null>(null); // openNote, readable from event handlers.
  /** The one way a drawer opens or closes. Only one is ever open, and whichever closes starts over next
   *  time (the scene resets its props once they're out of sight). */
  const changeDrawer = useCallback((next: number | null) => {
    openRef.current = next;
    setOpenNote(next);
    setSteps((prev) => (prev.every((step) => step === 0) ? prev : prev.map(() => 0)));
    window.clearTimeout(busyTimer.current);
    setBusy(null);
  }, []);
  // The field guide: open (340px) or folded to a strip (72px) down the left on a wide screen, a bottom
  // sheet on a phone. The scene and its labels slide over by the guide's width (scene.setOffset), so the case
  // stays centred in what's visible. The choice is remembered; an inline script in the page applies it
  // before first paint (see app/page.tsx), so the hall never jumps after loading.
  const folded = useSyncExternalStore(onGuideChange, guideFolded, () => false);
  const sheet = useSyncExternalStore(onPhoneChange, isPhone, () => false);
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false); // Until then the stylesheet alone decides how the guide looks.
  const inset = sheet ? 0 : folded ? RAIL_FOLDED : RAIL_OPEN;
  const insetRef = useRef(inset);
  useLayoutEffect(ensureGuideState, []);
  // Folding or opening hides the form of the guide that had focus (the stop rows, or the strip's Guide
  // button), so focus moves to the handle instead of dropping to the top of the page.
  const toggleRail = useCallback(() => {
    const guide = document.getElementById("field-guide");
    const hadFocus = !!guide?.contains(document.activeElement);
    setGuideFolded(!guideFolded());
    if (hadFocus) requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-controls="field-guide"]')?.focus({ preventScroll: true }));
  }, []);
  const scene = useRef<MuseumScene | null>(null);
  const reduced = useRef(false);
  const [status, setStatus] = useState<Status>("loading");
  const [loaded, setLoaded] = useState(0);
  const [index, setIndex] = useState(0);
  // Stops on the walk: every exhibit, then the Information desk.
  const deskIndex = exhibits.length;
  const count = exhibits.length + 1;
  const ready = useRef(false);
  const arrival = useRef<number | null>(null); // A stop named in the URL, to focus once the hall is ready.
  const idle = useRef(0); // The "finish the walk" timer.
  const direction = useRef(0); // Which way the visitor was last walking.
  const pressing = useRef(false); // A finger is on the screen.

  useEffect(() => {
    ready.current = status === "ready";
  }, [status]);

  /** One case's share of the scroll, measured from the stage (100svh each), not the window. */
  const caseHeight = useCallback(() => (stage.current ? stage.current.offsetHeight / count : window.innerHeight), [count]);

  /** The scroll position that rests the camera on case i. */
  const offsetFor = useCallback(
    (i: number) => {
      const top = stage.current ? stage.current.getBoundingClientRect().top + window.scrollY : 0;
      return top + i * caseHeight();
    },
    [caseHeight],
  );

  // One movement system: the page's scroll position is the only source of truth for where you are, and
  // the camera follows it on a spring (see scene.ts). Buttons, the directory, focus, keys and the finishing
  // walk all move the scroll position with one interruptible glide; any input of your own ends it at once,
  // and a new glide starts from the current position and speed, so nothing ever restarts from rest.
  const glide = useRef<Glide | null>(null);
  const glideFrame = useRef(0);
  const stopGlide = useCallback(() => {
    cancelAnimationFrame(glideFrame.current);
    glideFrame.current = 0;
    glide.current = null;
  }, []);
  const glideTo = useCallback((top: number, stop: number | null) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const to = Math.max(0, Math.min(max, top));
    const now = performance.now();
    const running = glide.current;
    // Start where the running glide is now (the page's scroll can be a frame behind it), carrying its
    // speed if it's heading the same way; a reversal starts from rest, so it turns at once.
    const state = running ? glideAt(running, now) : null;
    const from = state ? state.y : window.scrollY;
    const speed = state && Math.sign(state.v) === Math.sign(to - from) ? state.v : 0;
    cancelAnimationFrame(glideFrame.current);
    const cases = Math.abs(to - from) / Math.max(1, caseHeight());
    if (cases < 0.002) {
      glide.current = null;
      return;
    }
    // Longer walks take longer, but not proportionally: about 0.65 s for one case, 1.1 s at most.
    const duration = Math.min(1100, Math.max(420, 380 + 270 * Math.sqrt(cases)));
    // `set` is where the page actually is: the takeover check in onScroll compares against it.
    glide.current = { from, to, speed, start: now, duration, set: window.scrollY, stop };
    const step = (time: number) => {
      const current = glide.current;
      if (!current) return;
      const { y, done } = glideAt(current, time);
      window.scrollTo({ top: Math.max(0, Math.min(max, y)), behavior: "instant" });
      current.set = window.scrollY;
      if (done) glide.current = null;
      else glideFrame.current = requestAnimationFrame(step);
    };
    glideFrame.current = requestAnimationFrame(step);
  }, [caseHeight]);

  const go = useCallback(
    (i: number) => {
      if (!ready.current) return; // The fallback and loading states have no hall to walk.
      const stop = Math.max(0, Math.min(count - 1, i));
      const top = offsetFor(stop);
      window.clearTimeout(idle.current);
      direction.current = Math.sign(top - window.scrollY);
      if (reduced.current) {
        stopGlide();
        window.scrollTo({ top, behavior: "instant" });
      } else glideTo(top, stop);
    },
    [count, offsetFor, glideTo, stopGlide],
  );
  /** The stop you're at or headed to: mid-glide that's the glide's goal, so Next, Next goes two cases. */
  const heading = useCallback(() => glide.current?.stop ?? index, [index]);

  // The hall's own page settings, undone when you leave it.
  useEffect(() => {
    const root = document.documentElement;
    const saved = { padTop: root.style.scrollPaddingTop, padBottom: root.style.scrollPaddingBottom, bg: root.style.background };
    root.style.scrollPaddingTop = "0px";
    root.style.scrollPaddingBottom = "0px";
    root.style.background = "#222a29"; // So overscroll shows the hall, not the v3 canvas color.
    return () => {
      root.style.scrollPaddingTop = saved.padTop;
      root.style.scrollPaddingBottom = saved.padBottom;
      root.style.background = saved.bg;
    };
  }, []);

  // Build the scene once. three.js loads only here, so the page's first paint doesn't wait on it.
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = motion.matches;
    if (!canvas.current || !supportsWebGL()) {
      setStatus("fallback");
      return;
    }
    let cancelled = false;
    const debug = new URLSearchParams(window.location.search).has("debug");
    const frameLog: number[] = [];
    if (debug) (window as unknown as { __museumFrames: number[] }).__museumFrames = frameLog;

    // Labels and notes are kept between the sign and navigation above and the directory and walking
    // controls below. Their natural heights, those bounds and the header's pieces are measured on resize,
    // not every frame.
    const heights = new Map<Element, number>();
    const widths = new Map<Element, number>();
    let floor = Infinity;
    let ceiling = 0; // Just under the whole header: on a phone, where a label spans the screen, it stops here.
    let obstacles: Obstacle[] = []; // The header's pieces, one by one: on a wide screen a label clears only those above it.
    const measure = () => {
      // Measured within the pinned viewport, where labels are placed, so it holds while the hall scrolls in.
      const layer = labels.current[0]?.closest("ol");
      const header = layer?.parentElement?.querySelector("header");
      const origin = layer?.getBoundingClientRect().top ?? 0;
      const bottomBar = [layer?.parentElement?.querySelector(`.${styles.sheetHandle}`), layer?.parentElement?.querySelector(`.${styles.controls}`)];
      // Only what's showing: the phone's guide handle is in the page on a wide screen too, just hidden.
      const shown = (node: Element | null | undefined): node is Element => !!node && node.getClientRects().length > 0;
      const tops = bottomBar.filter(shown).map((node) => node.getBoundingClientRect().top - origin);
      floor = tops.length ? Math.min(...tops) - 12 : Infinity;
      ceiling = header ? header.getBoundingClientRect().bottom - origin + 8 : 0;
      obstacles = header
        ? [...header.querySelectorAll(":scope > div > *, :scope > nav")].filter(shown).map((node) => {
            const box = node.getBoundingClientRect();
            return { left: box.left, right: box.right, bottom: box.bottom - origin };
          })
        : [];
      // scrollHeight, not the rendered height: a label capped to fit a short screen still knows its full height.
      for (const node of labels.current) if (node) {
          heights.set(node, node.scrollHeight);
          widths.set(node, node.offsetWidth);
        }
    };
    const sizes = new ResizeObserver(measure);
    const watchSizes = () => {
      for (const node of labels.current) if (node) sizes.observe(node);
      window.addEventListener("resize", measure);
      measure();
    };
    const above = (node: Element, y: number) => Math.min(y, floor - (heights.get(node) ?? 0));

    /**
     * The slide that gives an open drawer's placard its room, at most enough to keep the discovery clear of
     * the field guide (wide screens) or the title block (phones). `room` is the discovery as drawn now, so
     * it's first moved back to where it would be with no extra slide: the slide is a pure 2D shift, so
     * that's exact, and the answer doesn't depend on the slide already applied.
     */
    function makeRoom(room: NonNullable<LabelAnchor["discovery"]>, placardWidth: number, portrait: boolean) {
      const applied = scene.current?.offset() ?? { x: insetRef.current, y: 0 };
      const dx = insetRef.current - applied.x; // How far left of its unshifted place the picture is now (negative: right).
      const dy = applied.y; // How far up.
      let x = 0;
      let y = 0;
      if (portrait) {
        const bottom = room.bottom + dy;
        const top = room.top + dy;
        const free = (Number.isFinite(floor) ? floor : window.innerHeight - 16) - (bottom + 8);
        y = Math.max(0, Math.min(PHONE_SHEET_MIN - free, top - ceiling));
        // Sideways too, if the discovery runs off an edge (the toppled books are wider than a small phone's
        // view of the cabinet): the least slide that brings it on screen, centred if it's wider still.
        const left = room.left + dx;
        const right = room.right + dx;
        const edge = 8;
        if (right - left > window.innerWidth - 2 * edge) x = (left + right) / 2 - window.innerWidth / 2;
        else if (left < edge) x = left - edge;
        else if (right > window.innerWidth - edge) x = right - (window.innerWidth - edge);
      } else {
        const left = room.left + dx;
        const right = room.right + dx;
        const over = right + 16 + placardWidth + 16 - window.innerWidth;
        x = Math.max(0, Math.min(over, left - (insetRef.current + 16)));
      }
      x = Math.round(x);
      y = Math.round(y);
      if (x !== extra.current.x || y !== extra.current.y) {
        extra.current = { x, y };
        scene.current?.setOffset(insetRef.current - x, y);
      }
    }

    function placeLabels(anchors: LabelAnchor[], progress: number, plinth: PlinthAnchor) {
      // ?debug: where each discovery is on screen, for the layout check (tests/layout.mjs).
      if (debug) (window as unknown as { __hall: unknown }).__hall = { discoveries: anchors.map((anchor) => anchor.discovery), open: openRef.current, progress };
      // The fatherhood card stays with its plinth and shows whenever the plinth is in view: a quiet
      // discovery on the way to the desk, never a stop, so nothing to tab to or click.
      const card = plinthCard.current;
      if (card) {
        card.style.transform = `translate3d(${plinth.x.toFixed(1)}px, ${plinth.y.toFixed(1)}px, 0)`;
        // Not while it's behind the field guide: it would peek out from under the guide's edge.
        const covered = plinth.x - card.offsetWidth / 2 < insetRef.current + 8;
        card.style.opacity = covered ? "0" : plinth.opacity.toFixed(3);
        card.style.visibility = "visible";
      }
      anchors.forEach((anchor, i) => {
        const label = labels.current[i];
        if (!label) return;
        const distance = Math.abs(i - progress);
        const portrait = window.innerWidth / window.innerHeight < 0.8;
        // On a portrait screen the label sits under the case, above the controls, and never up under the sign;
        // if a short screen leaves too little room, it scrolls inside itself instead.
        // On a wide screen it stays beside its case, centred on the case's corner where it fits, but never up
        // under the sign or navigation above it nor down over the controls; if even that gap is too short,
        // it fills the gap and scrolls inside itself.
        // With its drawer open, the placard shows the discovery's words and controls, and keeps clear of the
        // discovery itself (its whole sequence, from the scene): beside it on a wide screen, under it on a
        // phone, where it becomes a compact sheet that scrolls inside itself.
        const open = openRef.current === i && !!anchor.discovery;
        const room = anchor.discovery;
        const bottom = Number.isFinite(floor) ? floor : window.innerHeight - 16;
        const w = widths.get(label) ?? 0;
        let x = anchor.x;
        let y: number;
        if (portrait) {
          if (open && room) {
            // Centred on the screen, not the case: the picture may slide sideways to fit the discovery.
            x = (insetRef.current + window.innerWidth) / 2;
            // Never down over the pager: on a very short screen it rises over the discovery's foot instead.
            y = Math.min(Math.max(ceiling, room.bottom + 8), bottom - 120);
            label.style.maxHeight = `${(bottom - y).toFixed(0)}px`;
          } else {
            y = Math.max(ceiling, above(label, anchor.y));
            label.style.maxHeight = Number.isFinite(floor) ? `${Math.max(160, floor - y).toFixed(0)}px` : "";
          }
        } else {
          if (open && room) x = Math.min(Math.max(anchor.x, room.right + 16), window.innerWidth - w - 16);
          const h = heights.get(label) ?? 0;
          const fit = fitBetween(anchor.y - h / 2, h, ceilingFor(x, x + w, obstacles, 12, 16, 120), bottom);
          y = fit.top + (fit.maxHeight ?? h) / 2; // The stylesheet centres it on this point.
          label.style.maxHeight = fit.maxHeight === null ? "" : `${fit.maxHeight.toFixed(0)}px`;
        }
        label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        if (open && room) makeRoom(room, w, portrait);
        const opacity = anchor.visible ? Math.max(0, 1 - distance * 1.8) : 0;
        // The specimen's own caption, pinned to it: shown while its case is the one you're at.
        const caption = captions.current[i];
        if (caption) {
          const shown = anchor.caption?.visible ? Math.max(0, 1 - distance * 2.4) : 0;
          if (anchor.caption) caption.style.transform = `translate3d(${anchor.caption.x.toFixed(1)}px, ${anchor.caption.y.toFixed(1)}px, 0)`;
          caption.style.opacity = shown.toFixed(3);
          caption.style.visibility = shown > 0.01 ? "visible" : "hidden";
        }
        label.style.opacity = String(opacity);
        // Faded, not hidden: every label stays readable to screen readers and reachable with Tab,
        // and tabbing to one walks the camera to its case.
        label.style.visibility = "visible";
        label.style.pointerEvents = opacity > 0.05 ? "auto" : "none";
      });
    }

    import("./scene")
      .then(({ createMuseumScene }) =>
        createMuseumScene({
          canvas: canvas.current!,
          exhibits: [
            ...exhibits.map((exhibit) => ({ specimen: exhibit.specimen, status: exhibit.status, kind: "case" as const, discovery: exhibit.drawer, catalog: exhibit.catalog })),
            { status: "on-view", kind: "desk" as const },
          ],
          url: "/museum/museum.glb",
          reducedMotion: motion.matches,
          onProgress: (fraction) => setLoaded(fraction),
          onFrame: placeLabels,
          frameLog: debug ? frameLog : undefined,
        }),
      )
      .then((created) => {
        if (cancelled) return created.dispose();
        scene.current = created;
        watchSizes();
        // Arriving at a named stop (from a case study, or Back to the hall): stand there, no walk. The
        // camera also starts at any restored scroll position instead of walking to it from the first case.
        const named = stopFromHash(window.location.hash, exhibits);
        if (named !== null) window.scrollTo({ top: offsetFor(named), behavior: "instant" });
        arrival.current = named;
        const progress = Math.max(0, Math.min(count - 1, (window.scrollY - offsetFor(0)) / caseHeight()));
        created.setTarget(motion.matches ? Math.round(walk(progress)) : walk(progress), true);
        setStatus("ready");
        window.dispatchEvent(new Event("scroll")); // Pick up a restored scroll position.
      })
      .catch((error) => {
        console.error("Museum could not load:", error);
        if (!cancelled) setStatus("fallback");
      });

    const onMotion = () => {
      reduced.current = motion.matches;
      if (motion.matches) stopGlide();
      scene.current?.setReducedMotion(motion.matches);
    };
    motion.addEventListener("change", onMotion);
    return () => {
      cancelled = true;
      sizes.disconnect();
      window.removeEventListener("resize", measure);
      motion.removeEventListener("change", onMotion);
      scene.current?.dispose();
      scene.current = null;
    };
  }, [exhibits, stopGlide, offsetFor, caseHeight, count]);

  // Scrolling moves the camera. With reduced motion it cuts between cases instead of gliding.
  useEffect(() => {
    if (status !== "ready") return;
    const fade = canvas.current;
    let shown = -1;
    let lastY = window.scrollY;
    // If you stop partway between two cases, the walk finishes itself: on to the next case if you'd come
    // most of a third of the way, back otherwise. Not while a finger is on the screen (a pause, not a stop),
    // and not when you've stopped just off a case on purpose.
    function settle() {
      if (pressing.current || glide.current) return;
      const progress = (window.scrollY - offsetFor(0)) / caseHeight();
      if (progress <= 0 || progress >= count - 1) return;
      const f = progress - Math.floor(progress);
      if (f <= NEAR || f >= 1 - NEAR) return;
      const forward = direction.current > 0 ? f > 0.3 : direction.current < 0 ? f > 0.7 : f > 0.5;
      go(forward ? Math.ceil(progress) : Math.floor(progress));
    }
    function arm() {
      window.clearTimeout(idle.current);
      idle.current = window.setTimeout(settle, IDLE_MS);
    }
    // Where you are in the hall, in cases: kept across a resize. Every case is one screen tall, so a new
    // height with the same scroll offset would land somewhere else in the hall (another case, or between
    // two, with its drawer still open); the scroll offset is moved to keep you where you were.
    let where = 0;
    function onScroll() {
      const running = glide.current;
      // A scroll the glide didn't make (scrollbar, keys, a fling) means you've taken over.
      if (running && Math.abs(window.scrollY - running.set) > 1) stopGlide();
      const top = offsetFor(0);
      const progress = Math.max(0, Math.min(count - 1, (window.scrollY - top) / caseHeight()));
      const position = walk(progress);
      where = progress;
      // The case you're "at" changes a little past halfway, so a pause right at the midpoint can't make the
      // counter, the directory and the drawer flicker between two cases.
      const nearest = shown === -1 || Math.abs(position - shown) > 0.58 ? Math.round(position) : shown;
      if (window.scrollY !== lastY && !glide.current) direction.current = Math.sign(window.scrollY - lastY);
      lastY = window.scrollY;
      if (!glide.current) arm();
      scene.current?.setTarget(reduced.current ? nearest : position);
      if (nearest !== shown) {
        if (reduced.current && shown !== -1 && fade) {
          fade.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 240, easing: "ease-out" });
        }
        shown = nearest;
        setIndex(nearest);
        // A stop already named in the URL follows you, so a refresh doesn't send you back to the old one.
        // (The hall never adds one on its own; links in and out of it do.)
        const named = stopFromHash(window.location.hash, exhibits);
        if (named !== null && named !== nearest) {
          const hash = hashForStop(nearest, exhibits);
          window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${hash}`);
        }
        // The drawer shuts behind you. If focus was in it, it moves to the placard of the case you walked to
        // (without scrolling anything to reveal it: see the stylesheet's .viewport).
        const left = openRef.current;
        if (left !== null && left !== nearest) {
          const hadFocus = !!notes.current[left]?.contains(document.activeElement);
          changeDrawer(null);
          if (hadFocus) labels.current[nearest]?.focus({ preventScroll: true });
        }
      }
    }
    function onResize() {
      stopGlide(); // Its goal was measured for the old size.
      const keep = offsetFor(0) + where * caseHeight();
      if (Math.abs(window.scrollY - keep) > 1) window.scrollTo({ top: keep, behavior: "instant" });
      scene.current?.resize();
      onScroll();
    }
    // Your own input always wins over a glide, at once. A touch only counts once it moves: a tap on Next
    // mid-walk should carry the walk on, not stop it dead first.
    function onWheel() {
      stopGlide();
    }
    function onTouchStart() {
      pressing.current = true;
    }
    function onTouchMove() {
      stopGlide();
    }
    // Touch events, not pointer events, track the finger: the browser cancels the pointer as soon as it
    // takes over a pan, while the finger is still down.
    function onTouchEnd(event: TouchEvent) {
      if (event.touches.length > 0 || !pressing.current) return;
      pressing.current = false;
      arm();
    }
    function onScrollKey(event: KeyboardEvent) {
      const onButton = event.target instanceof Element && event.target.closest("button, a, summary");
      if (/^(PageUp|PageDown|Home|End|ArrowUp|ArrowDown)$/.test(event.key) || (event.key === " " && !onButton)) stopGlide();
    }
    // The room's ambient motion pauses once the hall scrolls out of view.
    const watcher = new IntersectionObserver(([entry]) => scene.current?.setVisible(entry.isIntersecting));
    if (stage.current) watcher.observe(stage.current);
    onScroll();
    // Keyboard focus lands on the case you came back to, not the top of the page. Focusing a label walks
    // to it, and the hall is already there, so nothing moves.
    if (arrival.current !== null) {
      labels.current[arrival.current]?.focus({ preventScroll: true });
      arrival.current = null;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onScrollKey);
    const timer = idle;
    return () => {
      watcher.disconnect();
      window.clearTimeout(timer.current);
      stopGlide();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("keydown", onScrollKey);
    };
  }, [status, count, offsetFor, caseHeight, go, stopGlide, changeDrawer, exhibits, deskIndex]);

  // A new stop typed or pasted into the address bar while the hall is open is a same-page navigation:
  // walk there like the directory does. (The hall's own replaceState calls don't fire this.)
  useEffect(() => {
    if (status !== "ready") return;
    function onHash() {
      const named = stopFromHash(window.location.hash, exhibits);
      if (named !== null) go(named);
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [status, exhibits, go]);

  // Without the 3D hall, a stop named in the URL just brings its label into view, with focus on it.
  useEffect(() => {
    if (status !== "fallback") return;
    const named = stopFromHash(window.location.hash, exhibits);
    const label = named === null ? null : labels.current[named];
    if (!label) return;
    label.scrollIntoView({ block: "center" });
    label.focus({ preventScroll: true });
  }, [status, exhibits]);

  /** Leaving by one of the hall's own links writes the stop into this page's URL, so Back returns to it. */
  function rememberStop(event: React.MouseEvent) {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.origin !== window.location.origin) return;
    if (link.pathname === window.location.pathname) return;
    // A link on a label belongs to that stop; the header's links, to wherever you're standing.
    const holder = labels.current.findIndex((node) => node?.contains(link));
    const stop = holder !== -1 ? holder : ready.current ? heading() : null;
    if (stop === null) return;
    const hash = hashForStop(stop, exhibits);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${hash}`);
  }

  // The scene slides with the field guide: at once when the hall first appears, eased after that.
  const insetShown = useRef(false);
  useEffect(() => {
    insetRef.current = inset;
    if (status !== "ready" || !scene.current) return;
    scene.current.setOffset(inset - extra.current.x, extra.current.y, !insetShown.current);
    insetShown.current = true;
  }, [inset, status]);

  // The curator's drawer follows the open note. (Walking on to another case closes the note: see onScroll.)
  useEffect(() => {
    exhibits.forEach((_, i) => scene.current?.setDrawer(i, openNote === i));
  }, [openNote, exhibits, status]);
  // Opening a drawer replaces the placard's body, Open drawer button and all, so focus that was in the
  // placard moves into the drawer's contents; Back to exhibit (closeNote) brings it back to that button.
  const returnFocus = useRef<number | null>(null);
  useEffect(() => {
    if (openNote !== null) {
      const view = notes.current[openNote];
      if (labels.current[openNote]?.contains(document.activeElement) || document.activeElement === document.body) view?.focus({ preventScroll: true });
      return;
    }
    const back = returnFocus.current;
    returnFocus.current = null;
    if (back !== null) noteToggles.current[back]?.focus({ preventScroll: true });
    // The slide that made room for the placard goes back with the drawer.
    if (extra.current.x || extra.current.y) {
      extra.current = { x: 0, y: 0 };
      scene.current?.setOffset(insetRef.current, 0);
    }
  }, [openNote]);
  useEffect(() => {
    steps.forEach((step, i) => scene.current?.setDiscoveryStep(i, step));
  }, [steps, status]);
  useEffect(() => () => window.clearTimeout(busyTimer.current), []);
  /** The open drawer's next step: ring, stamp, or open or close the card. */
  const act = useCallback(
    (i: number) => {
      const drawer = exhibits[i]?.drawer;
      if (!drawer || openNote !== i || busy !== null) return;
      const current = steps[i];
      const last = stepsFor(drawer);
      // The card toggles; the reading list cycles back to the start after its spill; the rest only advance.
      const next = drawer.kind === "card" ? (current ? 0 : 1) : drawer.kind === "books" && current >= last ? 0 : Math.min(last, current + 1);
      if (next === current) return;
      setSteps((prev) => prev.map((step, n) => (n === i ? next : step)));
      const ms = reduced.current
        ? 120
        : drawer.kind === "bell"
          ? STEP_MS.bell
          : drawer.kind === "stamp"
            ? STEP_MS.stamp
            : drawer.kind === "books"
              ? STEP_MS.books[next]
              : STEP_MS.card;
      setBusy(i);
      window.clearTimeout(busyTimer.current);
      busyTimer.current = window.setTimeout(() => setBusy(null), ms);
    },
    [exhibits, openNote, busy, steps],
  );
  const closeNote = useCallback((i: number) => {
    // Focus goes back to the Open drawer button once it's back in the placard, if it was in the drawer.
    if (labels.current[i]?.contains(document.activeElement)) returnFocus.current = i;
    changeDrawer(null);
  }, [changeDrawer]);

  // Left and right arrows walk the hall, unless you're typing somewhere. Escape closes the note.
  useEffect(() => {
    if (status !== "ready") return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && openNote !== null) {
        closeNote(openNote);
        return;
      }
      const typing = (event.target as HTMLElement).closest("input, textarea, select, [contenteditable]");
      if (typing || event.altKey || event.metaKey || event.ctrlKey) return;
      if (event.key === "[" && !sheet) toggleRail();
      else if (event.key === "ArrowRight") go(heading() + 1);
      else if (event.key === "ArrowLeft") go(heading() - 1);
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, heading, go, openNote, closeNote, sheet, toggleRail]);

  // A sideways swipe or trackpad gesture moves one case; vertical scrolling stays the browser's.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  function onPointerDown(event: React.PointerEvent) {
    // Not from inside a panel that scrolls (the guide, the sheet, an open drawer's placard): a drag there is
    // reading, not walking.
    if (event.pointerType !== "mouse" && !insidePanel(event.target)) swipe.current = { x: event.clientX, y: event.clientY };
  }
  function onPointerUp(event: React.PointerEvent) {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) go(heading() + (dx < 0 ? 1 : -1));
  }
  // A sideways trackpad gesture walks the hall continuously, pixel for pixel, like vertical scrolling.
  /** The guide, the phone's sheet, or the placard of an open drawer: panels that scroll themselves. */
  const insidePanel = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    if (target.closest("#field-guide, #guide-sheet")) return true;
    const open = openRef.current;
    return open !== null && !!labels.current[open]?.contains(target);
  }, []);

  // Browsers without overflow: clip (Safari before 16) can still scroll the hall's frame sideways to reveal
  // a focused placard far off to the side; put it straight back.
  useEffect(() => {
    const frame = canvas.current?.parentElement;
    if (!frame) return;
    const reset = () => {
      if (frame.scrollLeft || frame.scrollTop) frame.scrollTo(0, 0);
    };
    frame.addEventListener("scroll", reset);
    return () => frame.removeEventListener("scroll", reset);
  }, [status]);

  // Wheel and trackpad input over the hall (a native, non-passive listener, so it can be consumed):
  //  - A sideways gesture walks the hall pixel for pixel, like vertical scrolling. Its own default (the
  //    browser's swipe back and forward) is consumed, over the hall only.
  //  - Over an open drawer's placard, the placard scrolls; once it can't, the gesture stops there instead of
  //    walking the visitor (and shutting the drawer). Over the guide and the sheet, nothing is touched.
  //  - Pinch-zoom (ctrlKey) is always the browser's.
  // Touch does the same for an open drawer's placard: a drag it can't scroll further doesn't move the hall.
  useEffect(() => {
    const node = stage.current;
    if (!node || status !== "ready") return;
    const canScroll = (panel: Element, dy: number) => (dy > 0 ? panel.scrollTop + panel.clientHeight < panel.scrollHeight - 1 : dy < 0 ? panel.scrollTop > 0 : false);
    const openPlacard = (target: EventTarget | null) => {
      const open = openRef.current;
      const label = open === null ? null : labels.current[open];
      return label && target instanceof Node && label.contains(target) ? label : null;
    };
    function onWheel(event: WheelEvent) {
      if (event.ctrlKey) return;
      const placard = openPlacard(event.target);
      const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.2;
      if (placard) {
        if (sideways || !canScroll(placard, event.deltaY)) event.preventDefault();
        return;
      }
      if (insidePanel(event.target) || !sideways) return;
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      window.scrollBy({ top: event.deltaX * scale, behavior: "instant" });
    }
    let touchY = 0;
    function onTouchStart(event: TouchEvent) {
      touchY = event.touches[0]?.clientY ?? 0;
    }
    function onTouchMove(event: TouchEvent) {
      const placard = openPlacard(event.target);
      if (!placard || event.touches.length !== 1) return;
      const y = event.touches[0].clientY;
      const dy = touchY - y; // Positive: the finger moves up, the content would scroll down.
      touchY = y;
      if (!canScroll(placard, dy)) event.preventDefault();
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
    };
  }, [status, insidePanel]);

  /** A drawer under this point with a discovery in it, on the case you're standing at. */
  function noteDrawerAt(clientX: number, clientY: number) {
    const drawer = scene.current?.pickDrawer(clientX, clientY);
    return drawer === index && exhibits[index]?.drawer ? drawer : null;
  }
  /** The open drawer's bell or stamp under this point, on the case you're standing at. */
  function propAt(clientX: number, clientY: number) {
    return openNote === index && scene.current?.pickProp(clientX, clientY) === index;
  }

  // Hovering a case brightens its light and lifts the specimen a little.
  function onPointerMove(event: React.PointerEvent) {
    if (event.pointerType !== "mouse" || !scene.current) return;
    const hit = scene.current.pick(event.clientX, event.clientY);
    scene.current.setHighlight(hit);
    const drawer = noteDrawerAt(event.clientX, event.clientY);
    const prop = propAt(event.clientX, event.clientY);
    if (canvas.current) canvas.current.style.cursor = prop || drawer !== null || (hit !== null && hit !== index) ? "pointer" : "";
  }
  function onClick(event: React.MouseEvent) {
    // The bell and the stamp work by clicking them too; their buttons beside the drawer do the same.
    if (propAt(event.clientX, event.clientY)) {
      act(index);
      return;
    }
    // The drawer itself opens too; the labelled button in the label does the same for keyboard and touch.
    const drawer = noteDrawerAt(event.clientX, event.clientY);
    if (drawer !== null) {
      changeDrawer(openRef.current === drawer ? null : drawer);
      return;
    }
    const hit = scene.current?.pick(event.clientX, event.clientY);
    if (hit !== null && hit !== undefined && hit !== index) go(hit);
  }

  const fallback = status === "fallback";

  return (
    <div
      className={`${styles.root} ${fallback ? styles.static : ""}`}
      data-guide={fallback || !mounted ? undefined : sheet ? "sheet" : folded ? "folded" : "open"}
      onClickCapture={rememberStop}
    >
      <main id="main">
        <section
          ref={stage}
          className={styles.stage}
          style={{ "--cases": count } as React.CSSProperties}
          aria-label="The gallery"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipe.current = null)}
        >
          <div className={styles.viewport}>
            {/* First in the page, as on screen: the field guide down the left. Both forms are in the page; the
                stylesheet shows the rail on a wide screen and the sheet on a phone. */}
            {fallback ? null : (
              <>
                <GuideRail hall={hall} identity={identity} exhibits={exhibits} index={index} onGo={go} links={links} folded={folded} onToggle={toggleRail} />
                <GuideSheet exhibits={exhibits} index={index} onGo={go} links={links} />
              </>
            )}
            {/* Inside the pinned viewport, so the sign leaves with the gallery instead of floating over the desk. */}
            <header className={styles.top}>
                {/* The title block. With the field guide open, the guide carries it instead (its lockup). */}
                <div className={styles.sign}>
                  <p className={styles.hallName}>{hall.name}</p>
                  <h1 className={styles.subtitle}>{hall.subtitle}</h1>
                  <p className={styles.identity}>{identity}</p>
                </div>
                {/* In the hall no item is current: each lights up only on its own page. */}
                <nav aria-label="Main" className={styles.nav}>
                  <Link href={links.work}>Selected work</Link>
                  <Link href={links.about}>About</Link>
                </nav>
              </header>
            {fallback ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.still}
                src="/museum/hall.jpg"
                width={1600}
                height={1000} // Reserves its space, so a label scrolled into view stays there as it loads.
                alt="A plaster skull cast in a bronze-framed glass case on a squat oak cabinet with a drawer, a mug and field notebooks beside it, lit warmly in an arched plaster niche at dusk."
              />
            ) : (
              <canvas
                ref={canvas}
                className={styles.canvas}
                role="img"
                aria-label="The gallery after hours: lit glass cases on oak cabinets in arched plaster niches, a runner rug, and deep blue evening in the windows."
                onPointerMove={onPointerMove}
                onPointerLeave={() => scene.current?.setHighlight(null)}
                onClick={onClick}
              />
            )}

            <ol className={styles.labels} aria-label="Exhibits and the information desk">
              {exhibits.map((exhibit, i) => (
                <li key={exhibit.id}>
                  <article
                    ref={(node) => {
                      labels.current[i] = node;
                    }}
                    tabIndex={0}
                    aria-labelledby={`${exhibit.id}-title`}
                    className={`${styles.label} ${exhibit.status === "in-preparation" ? styles.pending : ""}`}
                    onFocus={() => {
                      scene.current?.setHighlight(i);
                      // Always walk, even if this case is the one on screen: mid-walk, "on screen" still
                      // names the case being left, and a quick Tab then Shift+Tab would strand the camera.
                      go(i);
                    }}
                    onBlur={() => scene.current?.setHighlight(null)}
                    onPointerEnter={() => scene.current?.setHighlight(i)}
                    onPointerLeave={() => scene.current?.setHighlight(null)}
                  >
                    <Kicker text={kicker(i, exhibits)} />
                    <h2 id={`${exhibit.id}-title`} className={styles.title}>
                      {exhibit.title}
                    </h2>
                    {exhibit.lines[0] && openNote !== i ? <p className={styles.line}>{exhibit.lines[0]}</p> : null}
                    {exhibit.lines[1] ? <p className={styles.org}>{exhibit.lines[1]}</p> : null}
                    {/* With the drawer open, the discovery takes the placard's body (below); title and context stay. */}
                    {openNote === i ? null : (
                      <>
                    {exhibit.description ? <p className={styles.description}>{exhibit.description}</p> : null}
                    {exhibit.quote ? <p className={styles.quote}>&ldquo;{exhibit.quote}&rdquo;</p> : null}
                    {/* The evidence behind the case, one click away: no drawer, bell or animation needed. */}
                    {studies[exhibit.id]?.length === 1 ? (
                      <Link href={studies[exhibit.id][0].href} className={styles.studyLink}>
                        Read the case study
                        <span className="sr-only">: {studies[exhibit.id][0].title}</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    ) : studies[exhibit.id]?.length ? (
                      <div className={styles.studyLinks}>
                        <p className={styles.studyLinksTitle} id={`${exhibit.id}-studies`}>
                          Case studies
                        </p>
                        <ul aria-labelledby={`${exhibit.id}-studies`}>
                          {studies[exhibit.id].map((study) => (
                            <li key={study.href}>
                              <Link href={study.href} className={styles.studyLink}>
                                {study.shortTitle}
                                <span className="sr-only">: {study.title}</span>
                                <span aria-hidden="true">→</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {exhibit.drawer && !fallback ? (
                      <button
                        ref={(node) => {
                          noteToggles.current[i] = node;
                        }}
                        type="button"
                        className={styles.noteToggle}
                        aria-expanded="false"
                        aria-controls={`${exhibit.id}-drawer`}
                        onClick={() => changeDrawer(i)}
                      >
                        Open drawer
                        <span className="sr-only">: {exhibit.title}</span>
                      </button>
                    ) : null}
                      </>
                    )}
                    {exhibit.drawer && !fallback ? (
                      <div
                        id={`${exhibit.id}-drawer`}
                        hidden={openNote !== i}
                        ref={(node) => {
                          notes.current[i] = node;
                        }}
                        className={styles.drawerView}
                        tabIndex={-1}
                        role="group"
                        aria-label={`From the drawer: ${exhibit.title}`}
                      >
                        <p className={styles.noteKicker}>From the drawer</p>
                        <DrawerContents drawer={exhibit.drawer} step={steps[i]} busy={busy === i} onAct={() => act(i)} id={exhibit.id} />
                        <DrawerExtra note={exhibit.drawerNote} work={exhibit.kind === "role" ? links.work : null} />
                        {/* The one way back: shuts the drawer and brings the placard back as it was. */}
                        <button type="button" className={`${styles.pill} ${styles.backButton}`} onClick={() => closeNote(i)}>
                          <span aria-hidden="true">←</span> Back to exhibit<span className="sr-only">: {exhibit.title}</span>
                        </button>
                      </div>
                    ) : null}
                    {exhibit.drawer && fallback ? (
                      // Without the 3D hall, every drawer's discovery as plain text.
                      <details className={styles.drawerStatic}>
                        <summary>Open drawer</summary>
                        <DrawerContents drawer={exhibit.drawer} step={0} id={`${exhibit.id}-static`} />
                        <DrawerExtra note={exhibit.drawerNote} work={null} />
                      </details>
                    ) : null}
                  </article>
                  {exhibit.caption && !fallback ? (
                    // Words on the object itself (006's plaque), pinned to it as crisp text.
                    <p
                      ref={(node) => {
                        captions.current[i] = node;
                      }}
                      className={`${styles.caption} ${exhibit.specimen === "AfterHours" ? styles.plaque : ""}`}
                    >
                      {exhibit.caption}
                    </p>
                  ) : null}
                </li>
              ))}
              <li key="fatherhood">
                {/* Between the last case and the desk: an empty plinth and its card. Read in order, not a stop. */}
                <div ref={plinthCard} className={styles.plinthCard}>
                  <h2 id="fatherhood-title" className={styles.plinthTitle}>
                    {fatherhood.title}
                  </h2>
                  <p className={styles.plinthNote}>
                    <em>{fatherhood.note}</em>
                  </p>
                  <p className="sr-only">{fatherhood.setting}</p>
                </div>
              </li>
              <li key="desk">
                {/* The last stop: the Information desk, with the summary and every way to get in touch. */}
                <article
                  ref={(node) => {
                    labels.current[deskIndex] = node;
                  }}
                  tabIndex={0}
                  aria-labelledby="desk-title"
                  className={`${styles.label} ${styles.deskCard}`}
                  onFocus={() => {
                    scene.current?.setHighlight(deskIndex);
                    go(deskIndex);
                  }}
                  onBlur={() => scene.current?.setHighlight(null)}
                  onPointerEnter={() => scene.current?.setHighlight(deskIndex)}
                  onPointerLeave={() => scene.current?.setHighlight(null)}
                >
                  <Kicker text={kicker(deskIndex, exhibits)} />
                  <h2 id="desk-title" className={styles.title}>
                    Information desk
                  </h2>
                  <p className={styles.line}>{desk.summary}</p>
                  <p className={styles.farewell}>{desk.farewell}</p>
                  <ul className={styles.deskLinks}>
                    <li>
                      <Link href={links.work}>Browse selected work</Link>
                    </li>
                    <li>
                      <a href={links.resume} target="_blank" rel="noreferrer">
                        Résumé<span className="sr-only"> (PDF, opens in a new tab)</span>
                      </a>
                    </li>
                    <li>
                      <Link href={links.contact}>Contact</Link>
                    </li>
                    <li>
                      <a href={links.linkedin} target="_blank" rel="noreferrer">
                        LinkedIn
                      </a>
                    </li>
                    <li>
                      <a href={links.github} target="_blank" rel="noreferrer">
                        GitHub
                      </a>
                    </li>
                  </ul>
                </article>
              </li>
            </ol>

            {fallback ? null : (
              // Prev and Next never change their words or width; where they lead is in their accessible names.
              <div className={styles.controls}>
                <StepButton exhibits={exhibits} from={index} to={index - 1} onGo={() => go(heading() - 1)} edge="Previous: none, this is the first stop" />
                <p className={styles.counter} aria-live="polite">
                  <span className="sr-only">Stop </span>
                  {pagerLabel(index, exhibits)}
                </p>
                <StepButton exhibits={exhibits} from={index} to={index + 1} onGo={() => go(heading() + 1)} edge="Next: none, this is the last stop" />
              </div>
            )}

            {status === "loading" ? (
              <div className={styles.loader} role="status">
                <p>Turning on the lights</p>
                <span className={styles.bar}>
                  <span style={{ transform: `scaleX(${Math.max(0.06, loaded)})` }} />
                </span>
              </div>
            ) : null}
          </div>
        </section>

      </main>
    </div>
  );
}

/** The placard's kicker: the stop's code as written (the desk's "i" stays lowercase), the section in caps. */
function Kicker({ text }: { text: string }) {
  const [code, section] = text.split(" · ");
  return (
    <p className={styles.number}>
      <span className={styles.code}>{code}</span>
      {` · ${section}`}
    </p>
  );
}

/** One walking control: "Prev" or "Next", always; disabled at either end of the hall. */
function StepButton({ exhibits, from, to, onGo, edge }: { exhibits: Exhibit[]; from: number; to: number; onGo: () => void; edge: string }) {
  const back = to < from;
  const end = to < 0 || to > exhibits.length;
  const where = end ? edge : `${back ? "Previous" : "Next"}: ${stepLabel(from, to, exhibits).name}`;
  return (
    <button type="button" onClick={onGo} disabled={end} aria-label={where}>
      {back ? "← Prev" : "Next →"}
    </button>
  );
}

/** Under a drawer's discovery: one concrete line about the real work, and (for a role) the way to the
 *  write-ups. The label above already links its own case studies, so the drawer doesn't repeat them. */
function DrawerExtra({ note, work }: { note?: string; work: string | null }) {
  if (!note && !work) return null;
  return (
    <div className={styles.drawerExtra}>
      {note ? <p className={styles.drawerNote}>{note}</p> : null}
      {work ? (
        <p className={styles.drawerLinks}>
          <Link href={work}>
            Selected work <span aria-hidden="true">→</span>
          </Link>
        </p>
      ) : null}
    </div>
  );
}
