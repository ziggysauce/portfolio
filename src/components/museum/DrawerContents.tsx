"use client";

import { useState } from "react";
import type { Discovery } from "@/content/exhibits";
import styles from "./museum.module.css";

type Props = {
  drawer: Discovery;
  /** The visitor's progress: bell rings, stamped cards, or 1 when the card is open. */
  step: number;
  /** Takes the discovery's step (ring, stamp, open or close the card). Absent in the static page. */
  onAct?: () => void;
  /** Ignore input while the last step is still animating (the control stays focusable). */
  busy?: boolean;
  id: string;
};

/** The readable side of a drawer's discovery: its words, its controls, and a short live announcement. */
export function DrawerContents({ drawer, step, onAct, busy = false, id }: Props) {
  const interactive = !!onAct;
  const act = () => {
    if (!busy) onAct?.();
  };

  switch (drawer.kind) {
    case "tooth":
      return (
        <>
          <p className={styles.drawerTag}>{drawer.tag}</p>
          {drawer.story.map((paragraph) => (
            <p key={paragraph} className={styles.drawerStory}>
              {paragraph}
            </p>
          ))}
        </>
      );

    case "chart":
      return (
        <figure className={styles.drawerFigure}>
          <h3 className={styles.drawerHeading}>{drawer.heading}</h3>
          <svg viewBox="0 0 240 150" role="img" aria-labelledby={`${id}-chart-title`} className={styles.chart}>
            <title id={`${id}-chart-title`}>{drawer.description}</title>
            <path d="M40 12 V118 H228" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M46 112 C110 108 160 92 222 20" fill="none" stroke="#b3542e" strokeWidth="4" strokeLinecap="round" />
            <text x="134" y="138" textAnchor="middle" aria-hidden="true">
              {drawer.xLabel}
            </text>
            <text x="-65" y="26" transform="rotate(-90)" textAnchor="middle" aria-hidden="true">
              {drawer.yLabel}
            </text>
          </svg>
          <figcaption className={styles.drawerFine}>{drawer.footer}</figcaption>
        </figure>
      );

    case "bell": {
      const rung = interactive ? step : drawer.tickets.length;
      const spent = rung >= drawer.tickets.length;
      return (
        <>
          {interactive ? (
            <button type="button" className={styles.drawerAction} aria-disabled={spent || busy} onClick={spent ? undefined : act}>
              {spent ? "No more tickets" : "Ring the bell"}
            </button>
          ) : null}
          {rung > 0 ? <p className={styles.drawerHeading}>{drawer.reveal}</p> : null}
          {rung > 0 ? (
            <ol className={styles.tickets} aria-label="Tickets on the KDS">
              {drawer.tickets.slice(0, rung).map((lines) => (
                <li key={lines.join(" ")}>
                  {lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </li>
              ))}
            </ol>
          ) : null}
          {interactive && spent ? <p className={styles.drawerFine}>The bell is resting now.</p> : null}
          {interactive ? (
            <p className="sr-only" aria-live="polite">
              {rung > 0 ? `Ticket added: ${drawer.tickets[rung - 1].join(", ")}${spent ? " No more tickets." : ""}` : ""}
            </p>
          ) : null}
        </>
      );
    }

    case "card": {
      const open = interactive ? step > 0 : true;
      return (
        <>
          <p className={styles.drawerHeading}>{drawer.cover}</p>
          {interactive ? (
            <button type="button" className={styles.drawerAction} aria-expanded={open} aria-controls={`${id}-inside`} onClick={act}>
              {open ? "Close the card" : "Read the card"}
            </button>
          ) : null}
          <div id={`${id}-inside`} hidden={!open} className={styles.cardInside}>
            {drawer.inside.map((paragraph) => (
              <p key={paragraph} className={styles.drawerStory}>
                {paragraph}
              </p>
            ))}
          </div>
        </>
      );
    }

    case "stamp": {
      const last = drawer.cards.length - 1;
      const done = interactive ? step : last;
      const finished = done >= last;
      return (
        <>
          <ol className={styles.taskCards} aria-label="Task cards">
            {drawer.cards.map((card, n) =>
              n < done ? (
                <li key={card} className={styles.taskDone}>
                  {card} <span>Done</span>
                </li>
              ) : n === done ? (
                <li key={card} className={styles.taskCurrent} aria-current="step">
                  {card}
                </li>
              ) : null,
            )}
          </ol>
          {interactive ? (
            <button type="button" className={styles.drawerAction} aria-disabled={finished || busy} onClick={finished ? undefined : act}>
              {finished ? "Stamp retired" : "Stamp done"}
            </button>
          ) : null}
          {interactive ? (
            <p className="sr-only" aria-live="polite">
              {done > 0 ? `Done: ${drawer.cards[done - 1]} Next card: ${drawer.cards[done]}${finished ? " The stamp is retired." : ""}` : ""}
            </p>
          ) : null}
        </>
      );
    }

    case "books":
      return <ReadingList drawer={drawer} step={step} onAct={onAct} busy={busy} />;
  }
}

const BOOKS = [3, 5, 7, 8, 9];
const SPINES = ["#56646e", "#a4573f", "#cdbf9f", "#3f6466", "#c19a45", "#7b7a52"];

/** 006's reading list. In the hall the books are 3D and the scene follows the step; without WebGL it's a
 *  row of spines that grows, then spills, with the same words and the same one button. */
function ReadingList({ drawer, step, onAct, busy }: { drawer: Extract<Discovery, { kind: "books" }>; step: number; onAct?: () => void; busy: boolean }) {
  const [own, setOwn] = useState(0); // The static page's own step.
  const [used, setUsed] = useState(false); // Announce only what the visitor caused.
  const stage = onAct ? step : own;
  const spilled = stage >= BOOKS.length - 1;
  const act = () => {
    if (busy) return;
    setUsed(true);
    if (onAct) onAct();
    else setOwn((n) => (n >= BOOKS.length - 1 ? 0 : n + 1));
  };
  return (
    <>
      <p className={styles.drawerHeading}>{spilled ? drawer.spilled : drawer.caption}</p>
      {onAct ? null : (
        <p className={`${styles.spines} ${spilled ? styles.spilled : ""}`} aria-hidden="true">
          {Array.from({ length: BOOKS[stage] }, (_, n) => (
            <span key={n} style={{ background: SPINES[n % SPINES.length] }} />
          ))}
        </p>
      )}
      <button type="button" className={styles.drawerAction} aria-disabled={busy} onClick={act}>
        {spilled ? drawer.makeRoom : drawer.more}
      </button>
      <p className="sr-only" aria-live="polite">
        {busy || !used ? "" : drawer.stages[stage]}
      </p>
    </>
  );
}

/** How many steps a discovery has (0 for one that only reveals itself). */
export function stepsFor(drawer: Discovery) {
  if (drawer.kind === "bell") return drawer.tickets.length;
  if (drawer.kind === "stamp") return drawer.cards.length - 1;
  if (drawer.kind === "card") return 1;
  if (drawer.kind === "books") return BOOKS.length - 1;
  return 0;
}
