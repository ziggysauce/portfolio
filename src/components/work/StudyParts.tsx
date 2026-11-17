import type { Block, Decision, Figure, Section, TimelineEntry } from "@/content/work";
import { FigureArt } from "./figures";
import styles from "./work.module.css";

/** A figure with its caption, and the label that says what kind of image it is right beside it. */
export function StudyFigure({ figure, wide = false, id }: { figure: Figure; wide?: boolean; id?: string }) {
  return (
    <figure className={`${styles.figure} ${wide ? styles.wide : ""}`} id={id}>
      <div className={styles.art}>
        <FigureArt figure={figure.figure} alt={figure.alt} />
      </div>
      <figcaption className={styles.caption}>
        {figure.label ? <span className={styles.figLabel}>{figure.label}</span> : null}
        <span>{figure.caption}</span>
        {figure.legend ? (
          <ol className={styles.legend}>
            {figure.legend.map((item, i) => (
              <li key={item}>
                <span className={styles.legendNumber} aria-hidden="true">
                  {i + 1}
                </span>
                <span className="sr-only">Marker {i + 1}: </span>
                {item}
              </li>
            ))}
          </ol>
        ) : null}
      </figcaption>
    </figure>
  );
}

/** Choices worth explaining. Each says what we did; the alternative and tradeoff appear only when known. */
function Decisions({ items }: { items: Decision[] }) {
  return (
    <ol className={styles.decisions}>
      {items.map((decision) => (
        <li key={decision.title} className={styles.decision}>
          {decision.when ? <p className={styles.decisionMeta}>{decision.when}</p> : null}
          <h3 className={styles.decisionTitle}>{decision.title}</h3>
          <p className={styles.decisionBody}>{decision.body}</p>
          {decision.alternative || decision.tradeoff ? (
            <dl className={styles.decisionRows}>
              {decision.alternative ? (
                <div>
                  <dt>The alternative</dt>
                  <dd>{decision.alternative}</dd>
                </div>
              ) : null}
              {decision.tradeoff ? (
                <div>
                  <dt>{decision.tradeoffLabel ?? "The tradeoff"}</dt>
                  <dd>{decision.tradeoff}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function Timeline({ items }: { items: TimelineEntry[] }) {
  return (
    <ol className={styles.timeline}>
      {items.map((entry) => (
        <li key={entry.what}>
          <p className={styles.when}>{entry.when}</p>
          <div>
            {entry.tag ? <p className={styles.who}>{entry.tag}</p> : null}
            <p>{entry.what}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function StudyBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>;
    case "subhead":
      return <h3 className={styles.subhead}>{block.text}</h3>;
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List className={`${styles.list} ${block.ordered ? styles.ordered : ""}`}>
          {block.items.map((item) => {
            const cut = block.leads ? item.indexOf(". ") : -1;
            return (
              <li key={item}>
                {cut > 0 ? (
                  <>
                    <strong>{item.slice(0, cut + 1)}</strong>
                    {item.slice(cut + 1)}
                  </>
                ) : (
                  item
                )}
              </li>
            );
          })}
        </List>
      );
    }
    case "figure":
      return <StudyFigure figure={block} wide />;
    case "decisions":
      return <Decisions items={block.items} />;
    case "timeline":
      return <Timeline items={block.items} />;
  }
}

export function StudySection({ section, number }: { section: Section; number: number }) {
  return (
    <section id={section.id} aria-labelledby={`${section.id}-heading`} className={`${styles.section} ${section.aside ? styles.aside : ""}`}>
      <p className={styles.sectionNumber} aria-hidden="true">
        {section.aside ? "Appendix" : String(number).padStart(2, "0")}
      </p>
      <h2 id={`${section.id}-heading`} className={styles.sectionTitle}>
        {section.heading}
      </h2>
      {section.intro ? <p className={styles.sectionIntro}>{section.intro}</p> : null}
      <div className={styles.prose}>
        {section.blocks.map((block, i) => (
          <StudyBlock key={i} block={block} />
        ))}
      </div>
    </section>
  );
}
