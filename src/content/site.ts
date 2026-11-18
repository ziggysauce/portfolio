// Everything personal that isn't an exhibit or a case study: name, links, and the About page. Edit freely.

export const site = {
  name: "Daniel Nguyen",
  location: "Washington, DC",
  replyTime: "Replies within a day",
  email: "dtn3423@gmail.com",
  linkedin: "https://www.linkedin.com/in/dtn3423/",
  github: "https://github.com/ziggysauce",
  resume: "/Daniel_Nguyen_Resume.pdf",
  url: "https://www.danieltnguyen.com",
  /** Under the hall's title on the homepage (the field guide's lockup): what Daniel does, in one line. The
   *  hall's own name, just above it, already says who. */
  identity: "Technical product leader and hands-on engineer at GoTab",
  ogImage: {
    url: "/og.png",
    width: 1200,
    height: 630,
    alt: "The Daniel Nguyen Hall of Natural History: a plaster skull in a lit glass case on an oak cabinet, in a small museum after closing.",
  },
  description:
    "Daniel Nguyen is a technical product leader and hands-on engineer with eight years at GoTab, a hospitality commerce platform. His portfolio is a small museum of his career.",
};

// The About page. Every fact here is on the résumé.
export const about = {
  summary:
    "I’m a technical product leader and hands-on engineer. I’ve spent eight years at GoTab, a hospitality commerce platform for ordering, point of sale, kitchen operations and payments, going from software developer to engineering manager to Director of Technical Product Management. I still write production code.",
  career: [
    { title: "Director, Technical Product Management", place: "GoTab", dates: "July 2026 to present", exhibit: "plans" },
    { title: "Engineering Manager", place: "GoTab", dates: "June 2021 to July 2026", exhibit: "marker" },
    { title: "Software Developer", place: "GoTab", dates: "June 2018 to June 2021", exhibit: "kds" },
  ],
  education: [
    { school: "Rutgers University", degree: "M.S., Biomedical Science", year: "2016", exhibit: "research" },
    { school: "University of Michigan", degree: "B.S., Evolutionary Anthropology", year: "2015", exhibit: "origin" },
  ],
  offHours:
    "When I’m not working, I’m in the kitchen experimenting with new dishes, out for a run, at the local Michigan bar cheering on my alma mater (go blue), or behind a keyboard playing video games.",
};
