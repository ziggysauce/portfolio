// The museum's exhibits, in walking order. Add a case by adding an entry here.
//
// `status` decides what the hall shows:
//   "on-view"         a lit case with its specimen (needs `specimen`, a node name in public/museum/museum.glb)
//   "in-preparation"  an empty lit case with a label, so the hall can be walked before the model exists
//   "planned"         not shown yet; kept here so the content is ready when the model is
//
// The copy below is Daniel's approved final copy (2026-11-11). It supersedes earlier drafts and, where
// they differ, older site content: don't "correct" it back to src/content/site.ts.
// Specimens and quotes are playful symbols, never new facts.

export type Exhibit = {
  id: string;
  number: string;
  title: string;
  /** Short lines with intentional breaks: role, then company and dates (or degree, then school and year). */
  lines: string[];
  /** One sentence about the chapter, under the lines. */
  description?: string;
  quote?: string;
  status: "on-view" | "in-preparation" | "planned";
  /** The glTF node to place in the case. */
  specimen?: string;
  /** What's in the cabinet's drawer: a small discovery (see Discovery). */
  drawer?: Discovery;
  /** Words on the specimen itself (a plaque, a tag), pinned to it in the hall as crisp text. */
  caption?: string;
};

/**
 * A drawer's discovery. Each has an automatic reveal when its drawer opens; the bell, the card and the
 * stamp also have steps the visitor takes. Everything here is shown as readable text beside the drawer
 * as well as on the props. The jokes are fictional; the 001 story and 004 card are Daniel's own words.
 */
export type Discovery =
  | { kind: "tooth"; tag: string; story: string[] }
  | { kind: "chart"; heading: string; xLabel: string; yLabel: string; footer: string; description: string }
  | { kind: "bell"; reveal: string; tickets: string[][] }
  | { kind: "card"; cover: string; inside: string[] }
  | { kind: "stamp"; cards: string[] }
  | {
      kind: "books";
      caption: string;
      /** After the spill. */
      spilled: string;
      more: string;
      makeRoom: string;
      /** What each stage announces once it settles (index 0: back to the start). */
      stages: string[];
    };

export const hall = {
  name: "The Daniel Nguyen Hall of Natural History",
  subtitle: "Homo developerus",
};

export const exhibits: Exhibit[] = [
  {
    id: "origin",
    number: "001",
    title: "The Origin Specimen",
    lines: ["B.S. in Evolutionary Anthropology", "University of Michigan · 2015"],
    quote: "Explains the existence of this museum.",
    status: "on-view",
    specimen: "Skull",
    drawer: {
      kind: "tooth",
      tag: "An earlier career prospect.",
      story: [
        "I started college on a pre-dental track. An anatomy class got me interested in bones; evolutionary anthropology took that curiosity in another direction.",
        "My favorite college class was primate anatomy.",
      ],
    },
  },
  {
    id: "research",
    number: "002",
    title: "The Research Years",
    lines: ["M.S. in Biomedical Science", "Rutgers University · 2016"],
    description: "Studied insulin mimetics in diabetic rats, working with blood samples and recording research data in laboratory software.",
    quote: "Samples carefully labeled. Career path less so.",
    status: "on-view",
    specimen: "Samples",
    drawer: {
      kind: "chart",
      heading: "Further research required.",
      xLabel: "Questions answered",
      yLabel: "More questions",
      footer: "Illustrative nonsense. Not actual research data.",
      description: "A chart with a rising curve: the more questions answered, the more questions there are.",
    },
  },
  {
    id: "kds",
    number: "003",
    title: "The First KDS",
    lines: ["Software Developer", "GoTab · 2018–2021"],
    description: "Built GoTab’s first production kitchen display system. Much of that code still runs today.",
    quote: "Please don’t tap the glass during the dinner rush.",
    status: "on-view",
    specimen: "KDS",
    drawer: {
      kind: "bell",
      reveal: "You’re an expo now.",
      tickets: [["1 soup", "1 coffee", "Hold the existential questions."], ["Please stop ringing the bell."]],
    },
  },
  {
    id: "marker",
    number: "004",
    title: "The Nearly Dry Marker",
    lines: ["Engineering Manager", "GoTab · 2021–2026"],
    description: "Hiring, releases, and code review—moving between the whiteboard and the codebase.",
    quote: "Still has one good diagram left in it.",
    status: "on-view",
    specimen: "Laptop",
    drawer: {
      kind: "card",
      cover: "The best release wasn’t software.",
      inside: [
        "One of the most rewarding parts of management was seeing someone on my team get promoted.",
        "Helping someone grow—and seeing that growth recognized—felt like work worth doing.",
      ],
    },
  },
  {
    id: "plans",
    number: "005",
    title: "Plans & Pull Requests",
    lines: ["Director of Technical Product Management", "GoTab · 2026–present"],
    description: "Planning projects, aligning clients and teams, and turning plans into production software.",
    quote: "Some assembly—and several meetings—required.",
    status: "on-view",
    specimen: "Planning",
    drawer: { kind: "stamp", cards: ["Make a plan.", "Build the thing.", "One small follow-up.", "Enjoy this moment."] },
  },
  {
    id: "after-hours",
    number: "006",
    title: "After Hours",
    lines: [],
    description: "Cooking, reading, records, and photography.",
    quote: "Running shoes not pictured. They’re out on a run.",
    status: "on-view",
    specimen: "AfterHours",
    caption: "Running shoes",
    drawer: {
      kind: "books",
      caption: "The reading list is under control.",
      spilled: "A minor shelving issue.",
      more: "What else is on the list?",
      makeRoom: "Make room for more.",
      stages: [
        "Three books. The reading list is under control.",
        "Two more books.",
        "Two more books. The stack leans.",
        "One more book. The stack wobbles, then steadies.",
        "One more book. The stack spills. A minor shelving issue.",
      ],
    },
  },
];

export const onView = exhibits.filter((exhibit) => exhibit.status !== "planned");

/** A small unnumbered display between the last case and the desk. Not a stop on the walk. */
export const fatherhood = {
  title: "Fatherhood",
  note: "Exhibit in progress.",
  /** What's on the plinth, for screen readers (the label above is all that's shown). */
  setting: "On the plinth, mid-installation: a wooden stacking-ring toy, partly assembled, two rings beside it, a dust cloth and a pencil on a checklist. Choose specimen: done. Finish installation: not yet.",
};

/** The Information desk, the walk's last stop. */
export const desk = {
  summary: "Technical product leader and hands-on engineer at GoTab since 2018, with a background in anthropology and biomedical science.",
  farewell: "Thanks for visiting. You’re welcome back after hours.",
};
