import type { Metadata } from "next";
import { MuseumHall } from "@/components/museum/MuseumHall";
import { desk, exhibits, fatherhood, hall, onView } from "@/content/exhibits";
import { site } from "@/content/site";
import { studyLinksByExhibit } from "@/content/work";
import { mono, serif } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Hall of Natural History",
  description: `${hall.name}: ${hall.subtitle}. A small museum of ${site.name}'s life so far.`,
  openGraph: { images: [{ url: "/museum/hall.jpg", width: 1600, height: 1000, alt: "A plaster skull cast in a lit glass case" }] },
};

export default function MuseumPage() {
  return (
    <div className={`${serif.variable} ${mono.variable}`}>
      <MuseumHall
        hall={hall}
        exhibits={onView}
        directory={exhibits.map(({ id, number, title, status }) => ({ id, number, title, status }))}
        desk={desk}
        fatherhood={fatherhood}
        studies={studyLinksByExhibit()}
        links={{
          work: "/work",
          about: "/about",
          resume: site.resume,
          contact: "/contact",
          linkedin: site.linkedin,
          github: site.github,
          site: site.url,
        }}
      />
    </div>
  );
}
