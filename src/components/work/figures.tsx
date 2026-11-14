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

/** How an order moved through the first release. */
function KdsFlow() {
  const steps: [string, string?][] = [
    ["Order placed", "by a guest or at the POS"],
    ["On the station’s screen", "it checks for new orders on its own"],
    ["Claim", "tap the card"],
    ["Finish", "tap twice; it moves to Closed"],
    ["Closed", "recall it, or reprint its ticket"],
  ];
  return (
    <ol className={styles.steps}>
      {steps.map(([title, note], i) => (
        <li key={title} className={i === 1 ? styles.key : undefined}>
          <strong>{title}</strong>
          {note ? <span>{note}</span> : null}
        </li>
      ))}
    </ol>
  );
}

/** Self-serve onboarding: setup in a sandbox runs alongside approval, then both meet at go-live. */
function OnboardingLanes() {
  return (
    <div className={styles.lanes}>
      <div className={styles.laneStart}>
        <strong>Sign up</strong>
        <span>verify a phone number, pass screening</span>
      </div>
      <div className={styles.laneRows}>
        <div className={styles.lane}>
          <p className={styles.laneTitle}>Getting approved</p>
          <ol>
            <li>Staff approval</li>
            <li>Payment application</li>
            <li>Processor verification</li>
          </ol>
        </div>
        <div className={`${styles.lane} ${styles.laneSandbox}`}>
          <p className={styles.laneTitle}>Getting set up, in a sandbox</p>
          <ol>
            <li>Menu: the assistant drafts, the operator confirms</li>
            <li>Taxes, tips and hours</li>
            <li>Test payments, capped</li>
          </ol>
        </div>
      </div>
      <div className={styles.laneEnd}>
        <strong>Go live</strong>
        <span>real payments switch on in one step</span>
      </div>
    </div>
  );
}

const CATALOG = ["Burgers", "Salads", "Brunch", "Desserts", "Drinks"];
const MENUS: { name: string; when: string; where: string; who?: string; categories: string[] }[] = [
  { name: "Lunch", when: "Weekdays, 11 to 3", where: "Dining room, patio", categories: ["Burgers", "Salads", "Drinks"] },
  { name: "Holiday preorder", when: "Order Oct 1 to Nov 19, pick up Nov 26", where: "Pickup", categories: ["Desserts", "Drinks"] },
  { name: "Members", when: "All day", where: "Bar", who: "Members only", categories: ["Brunch", "Drinks"] },
];

/** One catalog, many menus: each menu links categories and adds its own schedule, places and audience. */
function MenusModel() {
  const tone = (category: string) => styles[`tone${CATALOG.indexOf(category)}`];
  return (
    <div className={styles.model}>
      <div className={styles.catalog}>
        <p className={styles.modelTitle}>One catalog</p>
        <ul>
          {CATALOG.map((category) => (
            <li key={category} className={`${styles.chip} ${tone(category)}`}>
              {category}
            </li>
          ))}
        </ul>
      </div>
      <span className={styles.modelArrow} aria-hidden="true" />
      <div className={styles.menus}>
        <p className={styles.modelTitle}>Many menus</p>
        <ul>
          {MENUS.map((menu) => (
            <li key={menu.name} className={styles.menuCard}>
              <strong>{menu.name}</strong>
              <span>{menu.when}</span>
              <span>{menu.where}</span>
              {menu.who ? <span>{menu.who}</span> : null}
              <ul className={styles.menuChips} aria-label="Categories">
                {menu.categories.map((category) => (
                  <li key={category} className={`${styles.chip} ${tone(category)}`}>
                    {category}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** The rules that gate one menu, in order, and what a guest sees. */
function MenusAvailability() {
  const checks = ["Turned on", "Inside its ordering dates", "Its schedule includes now", "Linked to the area the guest is in", "The guest is allowed to see it"];
  return (
    <div className={styles.gate}>
      <p className={styles.gateStart}>A guest scans a table’s QR code</p>
      <div className={styles.gateBox}>
        <p className={styles.modelTitle}>For each menu, in order</p>
        <ol className={styles.checks}>
          {checks.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ol>
      </div>
      <div className={styles.gateOutcomes}>
        <p>
          <strong>All pass:</strong> the guest lands in that menu, and can switch to others that also pass.
        </p>
        <p>
          <strong>Any fails:</strong> try the next menu, or say nothing is available right now.
        </p>
      </div>
    </div>
  );
}

const LOOP: [string, string, string][] = [
  ["Restate the ask", "One sentence, plus what it won’t build", "Confirm the scope"],
  ["Build", "Code on its own branch; live tests on a copy of the database", "Read the change"],
  ["Review", "Verdict, findings and a ready-to-post comment, plus a second reviewer with no context", "Decide what to post"],
  ["Apply feedback", "Fix, already fixed, or disagree, and check similar code for the same defect", "Mark it ready, merge it"],
  ["Learn", "A week after release, look for changes that needed a later fix and propose a rule", "Approve or reject the rule"],
];

/** The loop: what the AI prepares at each step, and the decision that stays with me. */
function LoopDiagram() {
  return (
    <div className={styles.loop}>
      <div className={styles.loopHead} aria-hidden="true">
        <span />
        <span>The AI prepares</span>
        <span>I decide</span>
      </div>
      <ol>
        {LOOP.map(([step, ai, me], i) => (
          <li key={step}>
            <strong>
              <span className={styles.loopNumber}>{i + 1}</span>
              {step}
            </strong>
            <span className={styles.loopAi}>
              <span className="sr-only">The AI prepares: </span>
              {ai}
            </span>
            <span className={styles.loopMe}>
              <span className="sr-only">I decide: </span>
              {me}
            </span>
          </li>
        ))}
      </ol>
      <p className={styles.loopBack}>Each approved rule changes the next review.</p>
    </div>
  );
}

/** What a review hands me, with sample content. */
function ReviewOutput() {
  return (
    <div className={styles.review}>
      <p className={styles.verdict}>
        <span>Verdict</span> Not ready to merge: one must-fix, two smaller items.
      </p>
      <table className={styles.findings}>
        <thead>
          <tr>
            <th>#</th>
            <th>Severity</th>
            <th>Where</th>
            <th>Finding</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Must fix</td>
            <td>save.ts:142</td>
            <td>A retry resends default values when the first save times out.</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Should fix</td>
            <td>CategoryForm:57</td>
            <td>Two quick saves can both pass the duplicate check.</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Note</td>
            <td>Description</td>
            <td>The row count quoted doesn’t match the query’s output.</td>
          </tr>
        </tbody>
      </table>
      <p className={styles.draftComment}>
        <span>Draft comment, not posted</span>
        From Claude: On retry, the request is rebuilt from defaults rather than the operator’s edits, so a timed-out save can overwrite them.
      </p>
    </div>
  );
}

/** The daily email after the additions, simplified, with sample data and no guest text. */
function InsightsEmail({ alt }: { alt?: string }) {
  const ratings: [string, number][] = [
    ["Service", 3.6],
    ["Drinks", 4.1],
    ["Food", 4.4],
    ["Value", 4.5],
    ["Ambiance", 4.7],
  ];
  const week: [string, number, number | null][] = [
    ["Mon", 52, 48],
    ["Tue", 58, 61],
    ["Wed", 63, 66],
    ["Thu", 74, 70],
    ["Fri", 92, null],
    ["Sat", 100, null],
    ["Sun", 81, null],
  ];
  return (
    <div className={styles.email} role={alt ? "img" : undefined} aria-label={alt} aria-hidden={alt ? undefined : true}>
      <p className={styles.emailSubject}>
        <span>Subject</span> Insights for Thursday
      </p>
      <div className={styles.emailBody}>
        <div className={styles.emailBlock}>
          <p className={styles.emailHeading}>Payout</p>
          <p className={styles.emailRow}>
            <span>Card deposits</span>
            <span>$4,210.50</span>
          </p>
          <p className={styles.emailRow}>
            <span>Needs a look</span>
            <span>0</span>
          </p>
        </div>
        <div className={styles.emailBlock}>
          <p className={styles.emailHeading}>Customer experiences</p>
          {ratings.map(([label, score]) => (
            <p key={label} className={styles.rating}>
              <span>{label}</span>
              <span className={styles.ratingBar}>
                <span style={{ width: `${(score / 5) * 100}%` }} />
              </span>
              <span>{score.toFixed(1)}</span>
            </p>
          ))}
          <p className={styles.emailNote}>Lowest first · 2 comments</p>
        </div>
        <div className={styles.emailBlock}>
          <p className={styles.emailHeading}>Projected vs. actual week</p>
          <div className={styles.weekChart}>
            {week.map(([day, projected, actual]) => (
              <div key={day} className={styles.weekDay}>
                <span className={styles.weekBars}>
                  <span className={styles.projected} style={{ height: `${projected}%` }} />
                  {actual !== null ? <span className={styles.actual} style={{ height: `${actual}%` }} /> : null}
                </span>
                <span>{day}</span>
              </div>
            ))}
          </div>
          <p className={styles.emailNote}>
            <span className={styles.keyProjected} /> Projected <span className={styles.keyActual} /> Actual
          </p>
        </div>
      </div>
    </div>
  );
}

export function FigureArt({ figure, alt }: { figure: FigureKey; alt?: string }) {
  switch (figure) {
    case "kds-hero":
      return <TicketToScreen alt={alt} />;
    case "kds-screen":
      return <KdsScreen annotated alt={alt} />;
    case "kds-flow":
      return <KdsFlow />;
    case "onboarding-hero":
      return <OnboardingLanes />;
    case "menus-hero":
      return <MenusModel />;
    case "menus-availability":
      return <MenusAvailability />;
    case "loop-hero":
      return <LoopDiagram />;
    case "loop-review":
      return <ReviewOutput />;
    case "insights-email":
      return <InsightsEmail alt={alt} />;
  }
}
