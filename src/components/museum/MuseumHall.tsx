"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Exhibit } from "@/content/exhibits";
import type { LabelAnchor, MuseumScene } from "./scene";
import styles from "./museum.module.css";

type Status = "loading" | "ready" | "fallback";

type Props = {
  hall: { name: string; subtitle: string };
  exhibits: Exhibit[];
  links: { about: string; resume: string; contact: string; linkedin: string; github: string; site: string };
  summary: string;
};

/**
 * Scroll position to camera position. The camera rests at each case for the first and last 18% of
 * the scroll between two cases and glides through the middle, so ordinary scrolling never has to land
 * exactly on a case to frame it. No scroll snapping: the page always scrolls the way the browser does.
 */
const REST = 0.18;
function walk(progress: number) {
  const i = Math.floor(progress);
  const t = Math.min(1, Math.max(0, (progress - i - REST) / (1 - 2 * REST)));
  return i + t * t * (3 - 2 * t);
}

function supportsWebGL() {
  try {
    const probe = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && probe.getContext("webgl2"));
  } catch {
    return false;
  }
}

export function MuseumHall({ hall, exhibits, links, summary }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<(HTMLElement | null)[]>([]);
  const scene = useRef<MuseumScene | null>(null);
  const reduced = useRef(false);
  const [status, setStatus] = useState<Status>("loading");
  const [loaded, setLoaded] = useState(0);
  const [index, setIndex] = useState(0);
  const count = exhibits.length;
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

  const go = useCallback(
    (i: number) => {
      if (!ready.current) return; // The fallback and loading states have no hall to walk.
      const top = offsetFor(Math.max(0, Math.min(count - 1, i)));
      window.clearTimeout(idle.current);
      direction.current = Math.sign(top - window.scrollY);
      window.scrollTo({ top, behavior: reduced.current ? "auto" : "smooth" });
    },
    [count, offsetFor],
  );

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

    function placeLabels(anchors: LabelAnchor[], progress: number) {
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
      });
    }

    import("./scene")
      .then(({ createMuseumScene }) =>
        createMuseumScene({
          canvas: canvas.current!,
          exhibits: exhibits.map((exhibit) => ({ specimen: exhibit.specimen, status: exhibit.status })),
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
      scene.current?.setReducedMotion(motion.matches);
    };
    motion.addEventListener("change", onMotion);
    return () => {
      cancelled = true;
      motion.removeEventListener("change", onMotion);
      scene.current?.dispose();
      scene.current = null;
    };
  }, [exhibits]);

  // Scrolling moves the camera. With reduced motion it cuts between cases instead of gliding.
  useEffect(() => {
    if (status !== "ready") return;
    const fade = canvas.current;
    let shown = -1;
    let lastY = window.scrollY;
    // If you stop partway between two cases, finish the walk in the direction you were going.
    // Never while a finger is still on the screen: that's a pause, not a stop.
    function settle() {
      if (pressing.current) return;
      const progress = (window.scrollY - offsetFor(0)) / caseHeight();
      if (progress <= 0 || progress >= count - 1) return;
      const f = progress - Math.floor(progress);
      if (f <= REST || f >= 1 - REST) return; // Already resting at a case.
      go(direction.current >= 0 ? Math.ceil(progress) : Math.floor(progress));
    }
    function arm() {
      window.clearTimeout(idle.current);
      idle.current = window.setTimeout(settle, 180);
    }
    function onScroll() {
      const top = offsetFor(0);
      const progress = Math.max(0, Math.min(count - 1, (window.scrollY - top) / caseHeight()));
      const position = walk(progress);
      const nearest = Math.round(position);
      if (window.scrollY !== lastY) direction.current = Math.sign(window.scrollY - lastY);
      lastY = window.scrollY;
      arm();
      scene.current?.setTarget(reduced.current ? nearest : position);
      if (nearest !== shown) {
        if (reduced.current && shown !== -1 && fade) {
          fade.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 240, easing: "ease-out" });
        }
        shown = nearest;
        setIndex(nearest);
      }
    }
    function onResize() {
      scene.current?.resize();
      onScroll();
    }
    function onPress(event: PointerEvent) {
      if (event.pointerType !== "mouse") pressing.current = true;
    }
    function onRelease() {
      if (!pressing.current) return;
      pressing.current = false;
      arm();
    }
    // The room's ambient motion pauses once the hall scrolls out of view.
    const watcher = new IntersectionObserver(([entry]) => scene.current?.setVisible(entry.isIntersecting));
    if (stage.current) watcher.observe(stage.current);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointerdown", onPress, { passive: true });
    window.addEventListener("pointerup", onRelease, { passive: true });
    window.addEventListener("pointercancel", onRelease, { passive: true });
    const timer = idle;
    return () => {
      watcher.disconnect();
      window.clearTimeout(timer.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", onPress);
      window.removeEventListener("pointerup", onRelease);
      window.removeEventListener("pointercancel", onRelease);
    };
  }, [status, count, offsetFor, caseHeight, go]);

  // Left and right arrows walk the hall, unless you're typing somewhere.
  useEffect(() => {
    if (status !== "ready") return;
    function onKey(event: KeyboardEvent) {
      const typing = (event.target as HTMLElement).closest("input, textarea, select, [contenteditable]");
      if (typing || event.altKey || event.metaKey || event.ctrlKey) return;
      if (event.key === "ArrowRight") go(index + 1);
      else if (event.key === "ArrowLeft") go(index - 1);
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, index, go]);

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
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) go(index + (dx < 0 ? 1 : -1));
  }
  function onWheel(event: React.WheelEvent) {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.2) window.scrollBy({ top: event.deltaX, behavior: "instant" });
  }

  // Hovering a case brightens its light and lifts the specimen a little.
  function onPointerMove(event: React.PointerEvent) {
    if (event.pointerType !== "mouse" || !scene.current) return;
    const hit = scene.current.pick(event.clientX, event.clientY);
    scene.current.setHighlight(hit);
    if (canvas.current) canvas.current.style.cursor = hit !== null && hit !== index ? "pointer" : "";
  }
  function onClick(event: React.MouseEvent) {
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
                alt="A plaster skull cast in a bronze-framed glass case on an oak plinth, lit warmly in an arched plaster niche."
              />
            ) : (
              <canvas
                ref={canvas}
                className={styles.canvas}
                role="img"
                aria-label="The gallery: lit glass cases on oak plinths, each in an arched plaster niche."
                onPointerMove={onPointerMove}
                onPointerLeave={() => scene.current?.setHighlight(null)}
                onClick={onClick}
              />
            )}

            <ol className={styles.labels} aria-label="Exhibits">
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
                      if (i !== index) go(i);
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
                    {exhibit.quote ? <p className={styles.quote}>&ldquo;{exhibit.quote}&rdquo;</p> : null}
                  </article>
                </li>
              ))}
            </ol>

            {fallback ? null : (
              <div className={styles.controls}>
                <button type="button" onClick={() => go(index - 1)} disabled={index === 0}>
                  <span aria-hidden="true">←</span> Previous
                </button>
                <p className={styles.counter} aria-live="polite">
                  Case {index + 1} of {count}
                </p>
                <button type="button" onClick={() => go(index + 1)} disabled={index === count - 1}>
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

        <section className={styles.desk} aria-labelledby="desk-title">
          <h2 id="desk-title">Information desk</h2>
          <p>{summary}</p>
          <ul>
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
              <a href={links.resume} target="_blank" rel="noreferrer">
                Résumé (PDF)
              </a>
            </li>
            <li>
              <a href={links.site} target="_blank" rel="noreferrer">
                Current site
              </a>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
