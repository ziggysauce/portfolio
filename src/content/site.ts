// Everything personal that isn't a menu item. Edit freely.

export const site = {
  name: "Daniel Nguyen",
  firstName: "Daniel",
  wordmark: "dtn.",
  location: "Washington, DC",
  replyTime: "Replies within a day",
  status: "Open to new roles",
  email: "dtn3423@gmail.com",
  linkedin: "https://www.linkedin.com/in/dtn3423/",
  github: "https://github.com/ziggysauce",
  resume: "https://drive.google.com/file/d/1VdoxUOacJ6HNdt8ZyIqjZT9s1QxdWzi1/view",
  url: "https://www.danieltnguyen.com",
  ogImage: { url: "/og.png", width: 1200, height: 630, alt: "Daniel Nguyen's portfolio, built like an ordering app" },
  description:
    "Daniel Nguyen is an engineering manager and full-stack developer in restaurant technology, looking for Technical Product Manager and software engineering roles.",
};

export type Lens = "pm" | "eng" | "all";

export const lenses: { id: Lens; label: string; pitch: string }[] = [
  {
    id: "pm",
    label: "Technical PM",
    pitch:
      "Engineering manager at GoTab, moving into Technical Product Management. I scope the work, track it through delivery, and can still read the code and the production data behind it.",
  },
  {
    id: "eng",
    label: "Engineering",
    pitch:
      "Full-stack developer and engineering manager at GoTab. JavaScript, Node and PostgreSQL in production for restaurants since 2018.",
  },
  {
    id: "all",
    label: "Everything",
    pitch:
      "Engineering manager and full-stack developer at GoTab, where I've built restaurant technology since 2018. Looking for my next Technical PM or engineering role.",
  },
];

// Work history, shown as store locations on the Profile page.
export const locations = [
  {
    name: "GoTab",
    role: "Engineering Manager & Software Developer",
    place: "Washington, DC",
    dates: "June 2018 to present",
    open: true,
    notes: [
      "Plan, build and maintain features that grow the client base, bring in revenue and automate restaurant workflows.",
      "Manage developers, review and test code, and help hire as the team grows.",
    ],
  },
  {
    name: "Freelance",
    role: "Web Developer",
    place: "Washington, DC",
    dates: "October 2017 to present",
    open: true,
    notes: [
      "Build full web applications for small clients, mobile-first, including a site for a DC music artist.",
    ],
  },
  {
    name: "Insomnia Escape Room",
    role: "Manager & Head Game Master",
    place: "Washington, DC",
    dates: "January 2017 to October 2017",
    open: false,
    notes: [
      "Ran operations and staff, grew monthly bookings through promotions and marketing, and added a booking chatbot to the company's Facebook page.",
    ],
  },
];

export const education = [
  { school: "Rutgers University", degree: "Master of Biomedical Science", year: "2016" },
  { school: "University of Michigan", degree: "B.S., Evolutionary Anthropology", year: "2015" },
];

export const offHours =
  "When I'm not working, I'm in the kitchen experimenting with new dishes, out for a run, at the local Michigan bar cheering on my alma mater (go blue), or behind a keyboard playing video games.";
