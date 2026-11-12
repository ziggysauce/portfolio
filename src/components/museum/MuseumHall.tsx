"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Exhibit } from "@/content/exhibits";
import type { LabelAnchor, MuseumScene, PlinthAnchor } from "./scene";
import styles from "./museum.module.css";

type Status = "loading" | "ready" | "fallback";

type Props = {
  hall: { name: string; subtitle: string };
  exhibits: Exhibit[];
  /** Every exhibit, planned ones included, for the gallery directory. */
  directory: Pick<Exhibit, "id" | "number" | "title" | "status">[];
  links: { about: string; resume: string; contact: string; linkedin: string; github: string; site: string };
  desk: { summary: string; farewell: string };
  /** The small unnumbered display between the last case and the desk: a card, not a stop. */
  fatherhood: { title: string; note: string };
};

/**
 * Scroll position (in cases) to camera position. Every pixel of scroll moves the camera: a little slower
 * near a case, so it stays framed while you read, and a little faster between cases. No dead zones and
 * no plateaus, so fine input gives fine movement and steady scrolling gives steady travel.
 */
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

export function MuseumHall({ hall, exhibits, directory, links, desk, fatherhood }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<(HTMLElement | null)[]>([]);
  const plinthCard = useRef<HTMLDivElement>(null);
  const notes = useRef<(HTMLElement | null)[]>([]);
  const noteToggles = useRef<(HTMLButtonElement | null)[]>([]);
  const [openNote, setOpenNote] = useState<number | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const directoryToggle = useRef<HTMLButtonElement>(null);
  /** Folds the directory away. If focus was inside it, focus moves to its toggle instead of vanishing. */
  const closeDirectory = useCallback(() => {
    setDirectoryOpen(false);
    const toggle = directoryToggle.current;
    if (toggle && toggle.offsetParent !== null && toggle.parentElement?.contains(document.activeElement)) toggle.focus();
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

    function placeLabels(anchors: LabelAnchor[], progress: number, plinth: PlinthAnchor) {
      // The fatherhood card stays with its plinth and shows whenever the plinth is in view: a quiet
      // discovery on the way to the desk, never a stop, so nothing to tab to or click.
      const card = plinthCard.current;
      if (card) {
        card.style.transform = `translate3d(${plinth.x.toFixed(1)}px, ${plinth.y.toFixed(1)}px, 0)`;
        card.style.opacity = plinth.opacity.toFixed(3);
        card.style.visibility = "visible";
      }
      anchors.forEach((anchor, i) => {
        const label = labels.current[i];
        if (!label) return;
        const distance = Math.abs(i - progress);
        label.style.transform = `translate3d(${anchor.x.toFixed(1)}px, ${anchor.y.toFixed(1)}px, 0)`;
        const opacity = anchor.visible ? Math.max(0, 1 - distance * 1.8) : 0;
        label.style.opacity = String(opacity);
        // Faded, not hidden: every label stays readable to screen readers and reachable with Tab,
        // and tabbing to one walks the camera to its case.
        label.style.visibility = "visible";
        label.style.pointerEvents = opacity > 0.05 ? "auto" : "none";
        // The note comes out beside its drawer; on a portrait screen it lies over the label, from its top.
        const note = notes.current[i];
        const portrait = window.innerWidth / window.innerHeight < 0.8;
        if (note) note.style.transform = `translate3d(${(portrait ? window.innerWidth / 2 : anchor.drawer.x).toFixed(1)}px, ${(portrait ? anchor.y : anchor.drawer.y).toFixed(1)}px, 0)`;
      });
    }

    import("./scene")
      .then(({ createMuseumScene }) =>
        createMuseumScene({
          canvas: canvas.current!,
          exhibits: [
            ...exhibits.map((exhibit) => ({ specimen: exhibit.specimen, status: exhibit.status, kind: "case" as const })),
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
      motion.removeEventListener("change", onMotion);
      scene.current?.dispose();
      scene.current = null;
    };
  }, [exhibits, stopGlide]);

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
    function onScroll() {
      const running = glide.current;
      // A scroll the glide didn't make (scrollbar, keys, a fling) means you've taken over.
      if (running && Math.abs(window.scrollY - running.set) > 1) stopGlide();
      const top = offsetFor(0);
      const progress = Math.max(0, Math.min(count - 1, (window.scrollY - top) / caseHeight()));
      const position = walk(progress);
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
        setOpenNote((open) => (open === nearest ? open : null)); // The drawer shuts behind you.
        // If focus was in a note that just closed, it lands on the label of the case you walked to.
        if (notes.current.some((note, i) => i !== nearest && note?.contains(document.activeElement))) labels.current[nearest]?.focus();
      }
    }
    function onResize() {
      stopGlide(); // Its goal was measured for the old size; the walk finishes itself if you're between cases.
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
  }, [status, count, offsetFor, caseHeight, go, stopGlide]);

  // A click anywhere outside the open directory folds it away.
  useEffect(() => {
    if (!directoryOpen) return;
    function onDown(event: PointerEvent) {
      const nav = directoryToggle.current?.parentElement;
      if (nav?.contains(event.target as Node)) return;
      if (nav?.contains(document.activeElement)) directoryToggle.current?.focus(); // Don't strand focus in a hidden list.
      setDirectoryOpen(false);
    }
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [directoryOpen]);

  // The curator's drawer follows the open note. (Walking on to another case closes the note: see onScroll.)
  useEffect(() => {
    exhibits.forEach((_, i) => scene.current?.setDrawer(i, openNote === i));
  }, [openNote, exhibits, status]);
  const closeNote = useCallback((i: number) => {
    setOpenNote(null);
    // Focus goes back to the control that opened it, if it was inside the note.
    if (notes.current[i]?.contains(document.activeElement)) noteToggles.current[i]?.focus();
  }, []);

  // Left and right arrows walk the hall, unless you're typing somewhere. Escape closes the note.
  useEffect(() => {
    if (status !== "ready") return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && directoryOpen) {
        closeDirectory();
        return;
      }
      if (event.key === "Escape" && openNote !== null) {
        closeNote(openNote);
        return;
      }
      const typing = (event.target as HTMLElement).closest("input, textarea, select, [contenteditable]");
      if (typing || event.altKey || event.metaKey || event.ctrlKey) return;
      if (event.key === "ArrowRight") go(heading() + 1);
      else if (event.key === "ArrowLeft") go(heading() - 1);
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, heading, go, openNote, closeNote, directoryOpen, closeDirectory]);

  // A sideways swipe or trackpad gesture moves one case; vertical scrolling stays the browser's.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  function onPointerDown(event: React.PointerEvent) {
    if (event.pointerType !== "mouse") swipe.current = { x: event.clientX, y: event.clientY };
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
  function onWheel(event: React.WheelEvent) {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) * 1.2) return;
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    window.scrollBy({ top: event.deltaX * scale, behavior: "instant" });
  }

  /** A drawer under this point that holds a note, on the case you're standing at. */
  function noteDrawerAt(clientX: number, clientY: number) {
    const drawer = scene.current?.pickDrawer(clientX, clientY);
    return drawer === index && exhibits[index]?.note ? drawer : null;
  }

  // Hovering a case brightens its light and lifts the specimen a little.
  function onPointerMove(event: React.PointerEvent) {
    if (event.pointerType !== "mouse" || !scene.current) return;
    const hit = scene.current.pick(event.clientX, event.clientY);
    scene.current.setHighlight(hit);
    const drawer = noteDrawerAt(event.clientX, event.clientY);
    if (canvas.current) canvas.current.style.cursor = drawer !== null || (hit !== null && hit !== index) ? "pointer" : "";
  }
  function onClick(event: React.MouseEvent) {
    // The drawer itself opens too; the labelled button in the label does the same for keyboard and touch.
    const drawer = noteDrawerAt(event.clientX, event.clientY);
    if (drawer !== null) {
      setOpenNote((open) => (open === drawer ? null : drawer));
      return;
    }
    const hit = scene.current?.pick(event.clientX, event.clientY);
    if (hit !== null && hit !== undefined && hit !== index) go(hit);
  }

  const fallback = status === "fallback";

  return (
    <div className={`${styles.root} ${fallback ? styles.static : ""}`}>
      <main id="main">
        <section
          ref={stage}
          className={styles.stage}
          style={{ "--cases": count } as React.CSSProperties}
          aria-label="The gallery"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipe.current = null)}
          onWheel={onWheel}
        >
          <div className={styles.viewport}>
            {/* Inside the pinned viewport, so the sign leaves with the gallery instead of floating over the desk. */}
            <header className={styles.top}>
                <div className={styles.sign}>
                  <p className={styles.hallName}>{hall.name}</p>
                  <h1 className={styles.subtitle}>{hall.subtitle}</h1>
                  {/* The premise, in one small ticket stub: the museum has closed, and you're a guest. */}
                  <p className={styles.ticket}>
                    <span className={styles.admission}>After-hours admission</span>
                    <span className={styles.guest}>Guest of Dan</span>
                  </p>
                </div>
                <nav aria-label="Main" className={styles.nav}>
                  <Link href={links.about}>About</Link>
                  <a href={links.resume} target="_blank" rel="noreferrer">
                    Résumé<span className="sr-only"> (PDF, opens in a new tab)</span>
                  </a>
                  <Link href={links.contact}>Contact</Link>
                </nav>
              </header>
            {fallback ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.still}
                src="/museum/hall.jpg"
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
                    <p className={styles.number}>{exhibit.number}</p>
                    <h2 id={`${exhibit.id}-title`} className={styles.title}>
                      {exhibit.title}
                    </h2>
                    {exhibit.lines.map((line) => (
                      <p key={line} className={styles.line}>
                        {line}
                      </p>
                    ))}
                    {exhibit.description ? <p className={styles.description}>{exhibit.description}</p> : null}
                    {exhibit.quote ? <p className={styles.quote}>&ldquo;{exhibit.quote}&rdquo;</p> : null}
                    {exhibit.note && !fallback ? (
                      <button
                        ref={(node) => {
                          noteToggles.current[i] = node;
                        }}
                        type="button"
                        className={styles.noteToggle}
                        aria-expanded={openNote === i}
                        aria-controls={`${exhibit.id}-note`}
                        onClick={() => (openNote === i ? closeNote(i) : setOpenNote(i))}
                      >
                        <span aria-hidden="true" className={styles.drawerIcon} />
                        Curator&rsquo;s note
                      </button>
                    ) : null}
                  </article>
                  {exhibit.note && !fallback ? (
                    <aside
                      id={`${exhibit.id}-note`}
                      hidden={openNote !== i}
                      ref={(node) => {
                        notes.current[i] = node;
                      }}
                      className={styles.note}
                      aria-label="Curator’s note"
                    >
                      {exhibit.note.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                      <p className={styles.signature}>The Curator</p>
                      <button type="button" className={styles.noteClose} onClick={() => closeNote(i)}>
                        Close the drawer
                      </button>
                    </aside>
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
                  <p className={styles.number}>Before you go</p>
                  <h2 id="desk-title" className={styles.title}>
                    Information desk
                  </h2>
                  <p className={styles.line}>{desk.summary}</p>
                  <p className={styles.farewell}>{desk.farewell}</p>
                  <ul className={styles.deskLinks}>
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
                    <li>
                      <a href={links.site} target="_blank" rel="noreferrer">
                        Current site
                      </a>
                    </li>
                  </ul>
                </article>
              </li>
            </ol>

            {fallback ? null : (
              <nav className={styles.directory} aria-label="Gallery directory" data-open={directoryOpen || undefined}>
                <button
                  ref={directoryToggle}
                  type="button"
                  className={styles.directoryToggle}
                  aria-expanded={directoryOpen}
                  aria-controls="gallery-directory"
                  onClick={() => setDirectoryOpen((open) => !open)}
                >
                  <span>Directory</span>
                  {/* Where you are, always visible, even with the directory folded away. */}
                  <span className={styles.dirCurrent}>
                    <span className="sr-only">, you are at </span>
                    {index === deskIndex ? "Desk" : exhibits[index]?.number}
                  </span>
                </button>
                <div id="gallery-directory" className={styles.directoryList}>
                  <p className={styles.directoryTitle} aria-hidden="true">
                    Gallery directory
                  </p>
                  <ol>
                    {directory.map((item) => {
                      const at = exhibits.findIndex((exhibit) => exhibit.id === item.id);
                      const here = at === index;
                      return (
                        <li key={item.id}>
                          {at === -1 ? (
                            // Not built yet: listed honestly, not a control.
                            <span className={styles.closed}>
                              <span className={styles.dirNumber}>{item.number}</span>
                              <span className={styles.dirTitle}>{item.title}</span>
                              <span className={styles.soon}>Opening later</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              aria-current={here ? "location" : undefined}
                              onClick={() => {
                                go(at);
                                closeDirectory();
                              }}
                            >
                              <span className={styles.dirNumber}>{item.number}</span>
                              <span className={styles.dirTitle}>{item.title}</span>
                              {here ? <span className={styles.here}>You are here</span> : null}
                            </button>
                          )}
                        </li>
                      );
                    })}
                    <li key="desk">
                      <button
                        type="button"
                        aria-current={index === deskIndex ? "location" : undefined}
                        onClick={() => {
                          go(deskIndex);
                          closeDirectory();
                        }}
                      >
                        <span className={styles.dirNumber} aria-hidden="true">
                          ·
                        </span>
                        <span className={styles.dirTitle}>Information desk</span>
                        {index === deskIndex ? <span className={styles.here}>You are here</span> : null}
                      </button>
                    </li>
                  </ol>
                </div>
              </nav>
            )}

            {fallback ? null : (
              <div className={styles.controls}>
                <button type="button" onClick={() => go(heading() - 1)} disabled={index === 0}>
                  <span aria-hidden="true">←</span> Previous
                </button>
                <p className={styles.counter} aria-live="polite">
                  {index === deskIndex ? "Information desk" : `Case ${index + 1} of ${exhibits.length}`}
                </p>
                <button type="button" onClick={() => go(heading() + 1)} disabled={index === count - 1}>
                  Next <span aria-hidden="true">→</span>
                </button>
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
