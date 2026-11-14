import type { FigureKey } from "@/content/work";
import styles from "./figures.module.css";

// The case studies' visuals, drawn in HTML and CSS so their text stays sharp and reflows on a phone.
// None of these is a screenshot. The KDS screen is a reconstruction of first-release features with
// neutral sample orders; captions in the content say so beside each one.

type Order = {
  name: string;
  number: string;
  items: string[];
  /** Elapsed time as shown. */
  time: string;
  /** Share of the prep time used, 0 to 1+. Sets the bar's length and color. */
  used: number;
  state?: "claimed" | "fulfilling";
};

const ORDERS: Order[] = [
  { name: "Table 4", number: "1041", items: ["2 Burger", "  no onion", "1 Fries"], time: "2:10", used: 0.25 },
  { name: "Table 9", number: "1038", items: ["1 Chicken sandwich", "1 Side salad"], time: "7:45", used: 0.7, state: "claimed" },
  { name: "Bar 2", number: "1035", items: ["2 Fish tacos"], time: "14:20", used: 1.15 },
  { name: "Table 2", number: "1043", items: ["1 Veggie burger", "1 Fries"], time: "9:05", used: 0.55, state: "fulfilling" },
];

function pace(used: number) {
  return used >= 1 ? styles.late : used >= 0.65 ? styles.close : styles.ok;
}

/** A numbered callout, matched to the legend under the figure. */
function Marker({ n }: { n: number }) {
  return (
    <span className={styles.marker} aria-hidden="true">
      {n}
    </span>
  );
}

/** The KDS screen. `annotated` adds numbered markers; `count` limits the cards (the hero and index show fewer). */
export function KdsScreen({ annotated = false, count = 4, alt }: { annotated?: boolean; count?: number; alt?: string }) {
  const orders = ORDERS.slice(0, count);
  const m = (n: number) => (annotated ? <Marker n={n} /> : null);
  return (
    <div className={styles.device} role={alt ? "img" : undefined} aria-label={alt} aria-hidden={alt ? undefined : true}>
      <div className={styles.screen}>
        <div className={styles.bar}>
          <div className={styles.tabs}>
            {m(1)}
            <span>Expo</span>
            <span className={styles.on}>Grill</span>
            <span>Cold</span>
            <span>Bar</span>
          </div>
          <div className={styles.tabs}>
            <span className={styles.on}>Open</span>
            <span className={styles.closedTab}>
              Closed
              {m(5)}
            </span>
          </div>
        </div>
        <div className={styles.cards}>
          {orders.map((order, i) => (
            <div key={order.number} className={`${styles.card} ${order.state === "claimed" ? styles.claimed : ""} ${order.state === "fulfilling" ? styles.fulfilling : ""}`}>
              {order.state === "claimed" ? m(3) : null}
              {order.state === "fulfilling" ? m(4) : null}
              <div className={styles.cardHead}>
                <span className={styles.cardName}>{order.name}</span>
                <span className={styles.cardNumber}>#{order.number}</span>
              </div>
              <div className={`${styles.timer} ${pace(order.used)}`}>
                {i === 2 ? m(2) : null}
                <span className={styles.time}>{order.time}</span>
                <span className={styles.track}>
                  <span style={{ width: `${Math.min(1, order.used) * 100}%` }} />
                </span>
              </div>
              <ul className={styles.items}>
                {order.items.map((item) => (
                  <li key={item} className={item.startsWith("  ") ? styles.mod : undefined}>
                    {item.trim()}
                  </li>
                ))}
              </ul>
              {order.state === "claimed" ? <p className={styles.tag}>Claimed</p> : null}
              {order.state === "fulfilling" ? <p className={`${styles.tag} ${styles.done}`}>Fulfilled ✓</p> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The hero: a printed ticket, and the same order as a card on the screen. */
function TicketToScreen({ alt }: { alt?: string }) {
  return (
    <div className={styles.heroBox} role={alt ? "img" : undefined} aria-label={alt} aria-hidden={alt ? undefined : true}>
      <div className={styles.hero}>
        <div className={styles.ticket} aria-hidden="true">
          <p className={styles.ticketStation}>Grill</p>
          <p>Table 4 · #1041</p>
          <p className={styles.ticketTime}>6:42 PM</p>
          <hr />
          <p>2 Burger</p>
          <p className={styles.mod}>no onion</p>
          <p>1 Fries</p>
        </div>
        <span className={styles.arrow} aria-hidden="true" />
        <div className={styles.heroScreen} aria-hidden="true">
          <KdsScreen count={3} />
        </div>
      </div>
    </div>
  );
}

/** How an order moved in the first release, and the delivery change teammates made later. */
function Lifecycle() {
  return (
    <div className={styles.flows}>
      <section className={styles.flow} aria-labelledby="flow-first">
        <h3 id="flow-first" className={styles.flowTitle}>
          First release <span>2019 · built by me</span>
        </h3>
        <ol className={styles.steps}>
          <li>
            <strong>Order placed</strong>
            <span>by a guest or at the POS</span>
          </li>
          <li>
            <strong>Saved on the server</strong>
          </li>
          <li className={styles.key}>
            <strong>Screen asks for its orders</strong>
            <span>every 10 seconds, per station or expo</span>
          </li>
          <li>
            <strong>Claim</strong>
            <span>tap the card</span>
          </li>
          <li>
            <strong>Fulfill</strong>
            <span>double-tap; the order moves to Closed</span>
          </li>
          <li>
            <strong>Closed</strong>
            <span>recall it, or reprint its ticket</span>
          </li>
        </ol>
      </section>
      <section className={`${styles.flow} ${styles.later}`} aria-labelledby="flow-later">
        <h3 id="flow-later" className={styles.flowTitle}>
          Later <span>from 2020 · built by teammates</span>
        </h3>
        <ol className={styles.steps}>
          <li>
            <strong>Order sent</strong>
          </li>
          <li className={styles.key}>
            <strong>Server pushes the change</strong>
            <span>over a socket; the screen no longer asks</span>
          </li>
          <li>
            <strong>Screen updates</strong>
          </li>
        </ol>
      </section>
    </div>
  );
}

export function FigureArt({ figure, alt }: { figure: FigureKey; alt?: string }) {
  switch (figure) {
    case "kds-hero":
      return <TicketToScreen alt={alt} />;
    case "kds-screen":
      return <KdsScreen annotated alt={alt} />;
    case "kds-lifecycle":
      return <Lifecycle />;
  }
}
