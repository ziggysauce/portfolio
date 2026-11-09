"use client";

import { getItem, type Item } from "@/content/catalog";
import { lenses, site, type Lens } from "@/content/site";
import { createStore } from "./store";

const EMPTY: string[] = [];

const orderStore = createStore<string[]>("dtn-order", EMPTY, (raw) =>
  Array.isArray(raw) ? raw.filter((slug) => typeof slug === "string" && getItem(slug) && !getItem(slug)?.soon) : EMPTY,
);

// Most recent add, for the "Added to order" toast. Not saved.
export const toastStore = createStore<{ slug: string; id: number } | null>(null, null);

export const lensStore = createStore<Lens>("dtn-lens", "pm", (raw) =>
  lenses.some((lens) => lens.id === raw) ? (raw as Lens) : "pm",
);

export const useOrderSlugs = orderStore.use;

export function useOrderItems(): Item[] {
  return orderStore.use().flatMap((slug) => getItem(slug) ?? []);
}

export function addToOrder(slug: string) {
  const current = orderStore.get();
  if (current.includes(slug)) return;
  orderStore.set([...current, slug]);
  toastStore.set({ slug, id: Date.now() });
}

export function removeFromOrder(slug: string) {
  orderStore.set(orderStore.get().filter((existing) => existing !== slug));
  if (toastStore.get()?.slug === slug) toastStore.set(null);
}

export function clearOrder() {
  orderStore.set(EMPTY);
  toastStore.set(null);
}

export type OrderDetails = {
  number: string;
  name: string;
  company: string;
  tip: string;
  note: string;
  items: Item[];
};

export function orderText(order: OrderDetails): string {
  const lines = [`Hi ${site.firstName},`, ""];
  if (order.tip) lines.push(`What I'm bringing: ${order.tip}`, "");
  if (order.items.length) {
    lines.push("I'd like to hear more about:");
    order.items.forEach((item) => lines.push(`- ${item.name}`));
    lines.push("");
  }
  if (order.note) lines.push(order.note, "");
  lines.push(`From ${order.name}${order.company ? `, ${order.company}` : ""}`);
  return lines.join("\n");
}

export function orderMailto(order: OrderDetails): string {
  const subject = `Order ${order.number} from ${order.name}${order.company ? ` at ${order.company}` : ""}`;
  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(orderText(order))}`;
}
