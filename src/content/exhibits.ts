// The museum's exhibits, in walking order. Add a case by adding an entry here.
//
// `status` decides what the hall shows:
//   "on-view"         a lit case with its specimen (needs `specimen`, a node name in public/museum/museum.glb)
//   "in-preparation"  an empty lit case with a label, so the hall can be walked before the model exists
//   "planned"         not shown yet; kept here so the content is ready when the model is
//
// Facts come from src/content/site.ts (education, roles, offHours). Anything not on the site yet
// is marked `unverified` and must be confirmed before it goes on view.

export type Exhibit = {
  id: string;
  number: string;
  title: string;
  lines: string[];
  quote?: string;
  status: "on-view" | "in-preparation" | "planned";
  /** The glTF node to place in the case. */
  specimen?: string;
  /** What still needs confirming before this exhibit can go on view. */
  unverified?: string[];
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
      "Specimen 001 is only a plaster cast, so after-hours guests are welcome.",
      "It does prefer its full title. Please don't call it “the skull.”",
    ],
  },
  {
    id: "pipette",
    number: "002",
    title: "In Preparation",
    lines: ["Next in this case: a micropipette", "Rutgers University · M.S. Biomedical Science · 2016"],
    status: "in-preparation",
  },
  {
    id: "kds",
    number: "003",
    title: "The First KDS",
    lines: ["Software Developer, GoTab", "2018 to 2021"],
    quote: "Please don't tap the glass during the dinner rush.",
    status: "planned",
  },
  {
    id: "marker",
    number: "004",
    title: "Whiteboard Marker, Nearly Dry",
    lines: ["Engineering Manager, GoTab", "2021 to 2026 · Hiring, releases and Menus"],
    status: "planned",
  },
  {
    id: "roadmap",
    number: "005",
    title: "The Current Roadmap",
    lines: ["Director, Technical Product Management, GoTab", "2026 to present · Roughly 2,000 venues"],
    quote: "Still writes production code. Observe quietly.",
    status: "planned",
  },
  {
    id: "after-hours",
    number: "006",
    title: "After Hours",
    lines: ["Washington, DC · Evenings and weekends"],
    quote: "Running shoes not pictured; they're out on a run.",
    status: "planned",
    unverified: [
      "Cast-iron pan: the site says 'in the kitchen experimenting with new dishes', not which pan.",
      "Controller: the site says 'behind a keyboard playing video games', so a keyboard may fit better.",
    ],
  },
];

export const onView = exhibits.filter((exhibit) => exhibit.status !== "planned");
