import { notFound } from "next/navigation";
import { Moved, movedMetadata } from "@/components/redirect/Moved";
import { getStudy, studyHref } from "@/content/work";

// The old ordering-app site's item pages. Each one with a clear successor goes there; every other old
// item URL (skills, side projects) is a 404, with links to the hall and Selected work.
// A study that isn't published on this build sends its old link to Selected work instead.
const SUCCESSORS: Record<string, { study?: string; to?: string; label?: string }> = {
  "kitchen-display": { study: "kitchen-display" },
  "menu-management": { study: "menus" },
  "merchant-onboarding": { study: "merchant-onboarding" },
  "ai-delivery": { study: "review-loop" },
  "gotab-case-studies": { to: "/work", label: "Selected work" },
};

function successor(slug: string) {
  const entry = SUCCESSORS[slug];
  if (!entry) return null;
  const study = entry.study ? getStudy(entry.study) : undefined;
  if (study) return { to: studyHref(study), label: study.title };
  return { to: entry.to ?? "/work", label: entry.label ?? "Selected work" };
}

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(SUCCESSORS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const next = successor((await params).slug);
  return next ? movedMetadata(next.to, next.label) : {};
}

export default async function ItemMoved({ params }: Props) {
  const next = successor((await params).slug);
  if (!next) notFound();
  return <Moved to={next.to} label={next.label} />;
}
