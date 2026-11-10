import type { IconName } from "@/components/Icon";

// The four places you can go. The header shows them on desktop, the bottom bar on phones.
export const destinations: { label: string; href: string; icon: IconName }[] = [
  { label: "Menu", href: "/", icon: "store" },
  { label: "Profile", href: "/about", icon: "user" },
  { label: "Work history", href: "/orders", icon: "receipt" },
  { label: "Contact", href: "/contact", icon: "mail" },
];

/** The aria-current value for a destination. Item pages belong to the menu, so Menu stays marked there. */
export function currentFor(href: string, pathname: string): "page" | "true" | undefined {
  if (pathname === href) return "page";
  if (href === "/" && pathname.startsWith("/item/")) return "true";
  return undefined;
}

// Tracks whether this visit has moved between pages, so a back button can tell
// "return to where you were on this site" from "leave for LinkedIn".
let views = 0;

export function noteView() {
  views += 1;
}

export function canGoBack() {
  return views > 1;
}
