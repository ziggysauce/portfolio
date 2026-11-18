import type { Metadata, Viewport } from "next";
import { MuseumHall } from "@/components/museum/MuseumHall";
import { desk, fatherhood, hall, onView } from "@/content/exhibits";
import { site } from "@/content/site";
import { studyLinksByExhibit } from "@/content/work";
import { mono, serif } from "@/lib/fonts";

// The homepage: the museum. The rest of the portfolio (Selected work and its studies, About, Contact) is
// reached from its labels, its navigation and the information desk.
export const metadata: Metadata = {
  title: { absolute: `${hall.name} | ${site.name}` },
  description: site.description,
  openGraph: { title: hall.name, description: site.description, url: "/", siteName: site.name, type: "website", images: [site.ogImage] },
};

export const viewport: Viewport = { themeColor: "#222a29" }; // The hall's evening, behind the browser's chrome.

export default function MuseumPage() {
  return (
    <div className={`${serif.variable} ${mono.variable}`}>
      {/* The field guide's state, applied before the first paint so the hall doesn't jump once it loads: the
          remembered choice, or folded under 900px wide. The key matches RAIL_KEY in MuseumHall. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var r=null;try{r=localStorage.getItem("museum-guide")}catch(e){}document.documentElement.dataset.rail=r==="folded"||r==="open"?r:innerWidth<900?"folded":"open"})()`,
        }}
      />
      <MuseumHall
        hall={hall}
        exhibits={onView}
        identity={site.identity}
        desk={desk}
        fatherhood={fatherhood}
        studies={studyLinksByExhibit()}
        links={{
          work: "/work",
          about: "/about",
          resume: site.resume,
          contact: "/contact",
          email: site.email,
          linkedin: site.linkedin,
          github: site.github,
        }}
      />
    </div>
  );
}
