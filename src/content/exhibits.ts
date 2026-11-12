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
  /** An optional, clearly playful note in the cabinet's drawer. Never the only place a fact appears. */
  note?: string[];
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
    note: [
      "To the night staff:",
      "Specimen 001 prefers “The Origin Specimen.” Please stop calling it “the skull.”",
      "We’re trying to run a respectable institution.",
    ],
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
  },
];

export const onView = exhibits.filter((exhibit) => exhibit.status !== "planned");

/** A small unnumbered display between the last case and the desk. Not a stop on the walk. */
export const fatherhood = { title: "Fatherhood", note: "Exhibit in progress." };

/** The Information desk, the walk's last stop. */
export const desk = {
  summary: "Technical product leader and hands-on engineer at GoTab since 2018, with a background in anthropology and biomedical science.",
  farewell: "Thanks for visiting. You’re welcome back after hours.",
};
