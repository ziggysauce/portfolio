"use client";

// The field guide: the hall's whole map, the résumé and every way to get in touch, always one look away.
// A panel down the left (open or folded to a strip) on a wide screen; a bottom sheet on a phone.

import { useEffect, useRef, useState } from "react";
import type { Exhibit } from "@/content/exhibits";
import { stopCode } from "./stops";
import styles from "./museum.module.css";

export type GuideLinks = { resume: string; email: string; linkedin: string; github: string };

type Props = {
  hall: { name: string; subtitle: string };
  identity: string;
  exhibits: Exhibit[];
  /** The stop you're at: an exhibit's index, or exhibits.length for the desk. */
  index: number;
  onGo: (stop: number) => void;
  links: GuideLinks;
  folded: boolean;
  onToggle: () => void;
  /** Open over the hall (constrained screens): a modal dialog while it lasts. */
  overlay?: boolean;
};

/** The year a row shows: the first year on the exhibit's second line ("GoTab · 2021–2026" → 2021). */
const yearOf = (exhibit: Exhibit) => exhibit.lines[1]?.match(/\d{4}/)?.[0] ?? "";

const GROUPS: { title: string; kind: Exhibit["kind"] | "desk" }[] = [
  { title: "Career · GoTab", kind: "role" },
  { title: "Education", kind: "education" },
  { title: "Off the clock", kind: "personal" },
];

/** Every stop in walking order, with what the guide shows for it. */
function stopsOf(exhibits: Exhibit[]) {
  return [
    ...exhibits.map((exhibit, i) => ({ i, code: stopCode(i, exhibits), title: exhibit.title, year: yearOf(exhibit), kind: exhibit.kind as Exhibit["kind"] | "desk" })),
    { i: exhibits.length, code: "i", title: "Information desk", year: "", kind: "desk" as const },
  ];
}

export function GuideRail({ hall, identity, exhibits, index, onGo, links, folded, onToggle, overlay = false }: Props) {
  const stops = stopsOf(exhibits);
  return (
    <>
      <aside id="field-guide" className={styles.rail} aria-label="Field guide" role={overlay ? "dialog" : undefined} aria-modal={overlay || undefined}>
        {/* Both states are in the page, and the stylesheet shows one (from the remembered choice, before
            the page has even hydrated), so the guide is right from the first paint. */}
        <div className={styles.strip}>
            <button type="button" className={styles.guideButton} onClick={onToggle} aria-label="Open the field guide">
              <span className={styles.guideIcon} aria-hidden="true" />
              <span className={styles.guideWord}>Guide</span>
            </button>
            <ol className={styles.stripStops} aria-label="Stops">
              {stops.map((stop) => (
                <li key={stop.code}>
                  <button type="button" aria-current={stop.i === index ? "location" : undefined} aria-label={`${stop.code === "i" ? "" : `${stop.code} `}${stop.title}`} onClick={() => onGo(stop.i)}>
                    {stop.code}
                  </button>
                </li>
              ))}
            </ol>
            <span className={styles.railSpacer} />
            <a className={styles.cvPill} href={links.resume} download>
              CV <span aria-hidden="true">↓</span>
              <span className="sr-only">: download résumé (PDF)</span>
            </a>
          </div>
          <div className={styles.railOpen}>
            <Lockup hall={hall} identity={identity} />
            <FloorPlan stops={stops} index={index} onGo={onGo} />
            <StopList stops={stops} index={index} onGo={onGo} idPrefix="guide" />
            <span className={styles.railSpacer} />
            <Contact links={links} />
          </div>
      </aside>
      <button type="button" className={styles.railHandle} aria-expanded={!folded} aria-controls="field-guide" onClick={onToggle} title="Field guide ( [ )">
        <span aria-hidden="true" className={styles.handleChevron}>
          ‹
        </span>
        <span className="sr-only">Field guide</span>
      </button>
    </>
  );
}

/** The phone's field guide: the middle of the bottom bar, "Guide · 003", which opens into the lockup (the
 *  hall's name, title and who this is), the stops and the contact links. */
export function GuideSheet({ hall, identity, exhibits, index, onGo, links }: Pick<Props, "hall" | "identity" | "exhibits" | "index" | "onGo" | "links">) {
  const [open, setOpen] = useState(false);
  const handle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);
  const stops = stopsOf(exhibits);
  const close = () => {
    setOpen(false);
    if (panel.current?.contains(document.activeElement)) handle.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('[aria-current="location"], button, a')?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      // Only while the sheet is showing: on a wider screen it's hidden, and Escape belongs to the drawer.
      if (event.key !== "Escape" || !handle.current?.getClientRects().length) return;
      event.stopPropagation();
      setOpen(false);
      handle.current?.focus();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);
  // A swipe up on the handle opens the sheet; a swipe down on the handle closes it. Not on the list: a drag
  // down there is scrolling it.
  const onTouchStart = (event: React.TouchEvent) => {
    drag.current = handle.current?.contains(event.target as Node) ? event.touches[0].clientY : null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = drag.current;
    drag.current = null;
    if (start === null) return;
    const dy = event.changedTouches[0].clientY - start;
    if (dy < -36) setOpen(true);
    else if (dy > 36) close();
  };
  return (
    <div className={styles.sheet} data-open={open || undefined} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <button ref={handle} type="button" className={styles.sheetHandle} aria-expanded={open} aria-controls="guide-sheet" onClick={() => (open ? close() : setOpen(true))}>
        <span className={styles.guideIcon} aria-hidden="true" />
        <span>
          Guide<span aria-hidden="true"> · </span>
          <span className="sr-only">, at stop </span>
          <span className={styles.sheetCode}>{stopCode(index, exhibits)}</span>
        </span>
      </button>
      <div ref={panel} id="guide-sheet" className={styles.sheetPanel} hidden={!open} aria-label="Field guide" role="region">
        <Lockup hall={hall} identity={identity} />
        <StopList
          idPrefix="sheet"
          stops={stops}
          index={index}
          onGo={(stop) => {
            onGo(stop);
            close();
          }}
        />
        <Contact links={links} />
      </div>
    </div>
  );
}

function Lockup({ hall, identity }: Pick<Props, "hall" | "identity">) {
  return (
    <div className={styles.lockup}>
      <p className={styles.lockupKicker}>{hall.name}</p>
      <p className={styles.lockupTitle}>{hall.subtitle}</p>
      <p className={styles.lockupLine}>{identity}</p>
    </div>
  );
}

type Stop = ReturnType<typeof stopsOf>[number];

/** A small plan of the hall: the numbered rooms in a row, the personal room and the desk off to the side. */
function FloorPlan({ stops, index, onGo }: { stops: Stop[]; index: number; onGo: (stop: number) => void }) {
  return (
    <nav className={styles.plan} aria-label="Floor plan">
      <ol className={styles.planRooms}>
        {stops.map((stop) => {
          const here = stop.i === index;
          const side = stop.kind === "personal" || stop.kind === "desk";
          return (
            <li key={stop.code} className={side ? styles.planSide : undefined}>
              <button type="button" aria-current={here ? "location" : undefined} aria-label={`${stop.code === "i" ? "" : `${stop.code} `}${stop.title}`} onClick={() => onGo(stop.i)}>
                {stop.code === "i" ? "Desk" : stop.code}
              </button>
              {here ? (
                <span className={styles.youAreHere} aria-hidden="true">
                  You are here
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** The exhibits by group: career, education, and the rest. Every row walks to its stop. */
function StopList({ stops, index, onGo, idPrefix }: { stops: Stop[]; index: number; onGo: (stop: number) => void; idPrefix: string }) {
  return (
    <div className={styles.stopList}>
      {GROUPS.map((group) => {
        const rows = stops.filter((stop) => stop.kind === group.kind || (group.kind === "personal" && stop.kind === "desk"));
        const id = `${idPrefix}-${group.kind}`;
        return (
          <section key={group.title} aria-labelledby={id}>
            <h2 id={id} className={styles.groupTitle}>
              {group.title}
            </h2>
            <ol>
              {rows.map((stop) => (
                <li key={stop.code}>
                  <button type="button" className={styles.stopRow} aria-current={stop.i === index ? "location" : undefined} onClick={() => onGo(stop.i)}>
                    <span className={styles.stopCode}>{stop.code}</span>
                    <span className={styles.stopTitle}>{stop.title}</span>
                    <span className={styles.stopYear}>{stop.year}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function Contact({ links }: { links: GuideLinks }) {
  return (
    <div className={styles.contact}>
      <a className={styles.resumePill} href={links.resume} download>
        Download résumé <span aria-hidden="true">↓</span>
        <span className="sr-only"> (PDF)</span>
      </a>
      <p className={styles.contactLinks}>
        <a href={`mailto:${links.email}`}>Email</a>
        <span aria-hidden="true"> · </span>
        <a href={links.linkedin} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <span aria-hidden="true"> · </span>
        <a href={links.github} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </p>
    </div>
  );
}
