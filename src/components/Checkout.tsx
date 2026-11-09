"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { featured, related, requireItem, type Item } from "@/content/catalog";
import { site } from "@/content/site";
import {
  clearOrder,
  lensStore,
  orderMailto,
  orderText,
  removeFromOrder,
  useOrderItems,
  type OrderDetails,
} from "@/lib/order";
import { CopyButton } from "./CopyButton";
import { PinIcon } from "./Icon";
import { MenuGrid } from "./MenuItem";
import { Price } from "./Price";

const TIPS = ["A project", "A question", "A coffee", "Custom"];

function SheetHeader() {
  return (
    <div className="page flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-6 pt-6 md:pt-12">
      <div className="min-w-0">
        <h1 className="font-display text-[40px] font-normal leading-tight md:text-[52px]">Your order</h1>
        <Link href="/about#history" className="mt-1 inline-flex items-center gap-1.5 rounded-sm text-[15px] text-muted hover:text-ink">
          <PinIcon size={18} className="shrink-0" />
          {site.location} &middot; {site.replyTime}
        </Link>
      </div>
      <p className="sm:text-right">
        <span className="text-[15px] text-muted sm:block sm:text-[13px]">Total </span>
        <span className="text-[16px] font-medium">Market price</span>
      </p>
    </div>
  );
}

function OrderLines({ items }: { items: Item[] }) {
  const list = useRef<HTMLUListElement>(null);
  const emptyHeading = useRef<HTMLParagraphElement>(null);

  // The pressed button is about to disappear, so hand focus to the nearest line
  // or the empty state. Otherwise keyboard users land back at the top of the page.
  function remove(slug: string, index: number) {
    removeFromOrder(slug);
    requestAnimationFrame(() => {
      const buttons = list.current?.querySelectorAll("button");
      const next = buttons?.length ? buttons[Math.min(index, buttons.length - 1)] : emptyHeading.current;
      next?.focus();
    });
  }

  if (!items.length) {
    return (
      <div className="py-10 text-center">
        <p ref={emptyHeading} tabIndex={-1} className="font-display text-[26px] outline-none">
          Nothing in your order yet
        </p>
        <p className="mx-auto mt-2 max-w-sm text-[15px] text-muted">
          That&rsquo;s fine. Browse the menu, or leave me a note below and send it as is.
        </p>
        <Link href="/#menu" className="btn btn-outline mt-5">
          Browse the menu
        </Link>
      </div>
    );
  }
  return (
    <ul ref={list} className="divide-y divide-line">
      {items.map((item, index) => (
        <li key={item.slug} className="flex items-start justify-between gap-4 py-4">
          <div className="min-w-0">
            <Link href={`/item/${item.slug}`} className="text-[16px] font-medium leading-snug underline-offset-4 hover:underline">
              {item.name}
            </Link>
            <Price price={item.price} className="mt-1 block text-muted" />
          </div>
          <button
            type="button"
            onClick={() => remove(item.slug, index)}
            aria-label={`Remove ${item.name} from your order`}
            className="shrink-0 rounded-sm py-1 text-[14px] font-medium underline underline-offset-4"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

function Receipt({ order, onReset }: { order: OrderDetails; onReset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <div className="page max-w-xl py-10">
      <h1 ref={heading} tabIndex={-1} className="font-display text-[40px] font-normal leading-tight outline-none">
        One more step, {order.name.split(" ")[0]}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed">
        Your email app should have opened with this order drafted. Nothing reaches me until you press send there. If it didn&rsquo;t open, copy the order and email it to{" "}
        <a className="underline underline-offset-4" href={`mailto:${site.email}`}>
          {site.email}
        </a>
        .
      </p>

      <div className="mt-8 rounded-2xl border border-line p-6">
        <div className="flex justify-between text-sm text-muted">
          <span>Order {order.number}</span>
          <span>{site.location}</span>
        </div>
        <ul className="mt-4 space-y-2 border-y border-dashed border-line py-4 text-[15px]">
          {order.items.length ? (
            order.items.map((item) => (
              <li key={item.slug} className="flex justify-between gap-4">
                <span>{item.name}</span>
                <Price price={item.price} />
              </li>
            ))
          ) : (
            <li>A note, no items</li>
          )}
        </ul>
        {order.tip ? (
          <p className="mt-4 flex justify-between text-[15px]">
            <span>Tip</span>
            <span>{order.tip}</span>
          </p>
        ) : null}
        <p className="mt-2 flex justify-between text-[15px] font-medium">
          <span>Total</span>
          <span>Market price</span>
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <a href={orderMailto(order)} className="btn btn-primary">
          Open email again
        </a>
        <CopyButton text={orderText(order)} label="Copy order" />
      </div>
      <p className="mt-6 text-sm">
        Prefer LinkedIn?{" "}
        <a className="underline underline-offset-4" href={site.linkedin} target="_blank" rel="noreferrer">
          Message me there
        </a>
        .{" "}
        <button type="button" onClick={onReset} className="rounded-sm underline underline-offset-4">
          Start a new order
        </button>
      </p>
    </div>
  );
}

export function Checkout() {
  const items = useOrderItems();
  const lens = lensStore.use();
  const [tip, setTip] = useState("");
  const [customTip, setCustomTip] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [note, setNote] = useState("");
  const [nameError, setNameError] = useState(false);
  const [placed, setPlaced] = useState<OrderDetails | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  // Keyed to the first line so adding a suggestion doesn't reshuffle the row under
  // the pointer. Items already in the order stay put and show a check mark.
  const suggestions = items[0] ? related(items[0]) : featured[lens].map(requireItem);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setNameError(true);
      nameInput.current?.focus();
      return;
    }
    const order = {
      name: name.trim(),
      company: company.trim(),
      note: note.trim(),
      tip: tip === "Custom" ? customTip.trim() : tip,
      items,
      number: `#${Math.floor(1000 + Math.random() * 9000)}`,
    };
    setPlaced(order);
    window.location.href = orderMailto(order);
  }

  function reset() {
    clearOrder();
    setPlaced(null);
    setTip("");
    setCustomTip("");
    setNote("");
  }

  if (placed) return <Receipt order={placed} onReset={reset} />;

  return (
    <div className="sheet-up">
      <SheetHeader />
      <div className="page grid grid-cols-[minmax(0,1fr)] gap-x-14 pt-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <OrderLines items={items} />

          {suggestions.length ? (
            <section aria-labelledby="also-like" className="mt-6 border-t border-line pt-8">
              <h2 id="also-like" className="section-title">
                You might also like
              </h2>
              <div className="mt-5">
                <MenuGrid items={suggestions} className="lg:grid-cols-1" />
              </div>
            </section>
          ) : null}
        </div>

        <form onSubmit={submit} noValidate className="mt-8 self-start lg:sticky lg:top-20 lg:mt-5">
          <fieldset>
            <legend className="section-title">Leave a tip</legend>
            <p className="mt-1 text-[15px] text-muted">Tell me what brings you here.</p>
            <div className="mt-5 grid grid-cols-4 overflow-hidden rounded-xl border border-control">
              {TIPS.map((option) => (
                <label key={option} className="relative cursor-pointer border-l border-control first:border-l-0">
                  <input
                    type="radio"
                    name="tip"
                    value={option}
                    checked={tip === option}
                    onChange={() => setTip(option)}
                    className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                  />
                  <span className="grid h-12 place-items-center px-1 text-center text-sm transition-colors peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-4 peer-focus-visible:outline-link">
                    {option}
                  </span>
                </label>
              ))}
            </div>
            {tip === "Custom" ? (
              <div className="mt-4">
                <label htmlFor="custom-tip" className="field-label">
                  Your tip
                </label>
                <input id="custom-tip" value={customTip} onChange={(event) => setCustomTip(event.target.value)} className="field" />
              </div>
            ) : null}
          </fieldset>

          <div className="mt-8 space-y-4">
            <div>
              <label htmlFor="order-name" className="field-label">
                Name for the order <span className="text-muted">(required)</span>
              </label>
              <input
                id="order-name"
                ref={nameInput}
                value={name}
                autoComplete="name"
                required
                aria-invalid={nameError}
                aria-describedby={nameError ? "order-name-error" : undefined}
                onChange={(event) => {
                  setName(event.target.value);
                  if (event.target.value.trim()) setNameError(false);
                }}
                className={`field ${nameError ? "border-error" : ""}`}
              />
              {nameError ? (
                <p id="order-name-error" className="mt-1.5 text-sm text-error">
                  Add a name so I know who to call out when it&rsquo;s ready.
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="order-company" className="field-label">
                Company
              </label>
              <input
                id="order-company"
                value={company}
                autoComplete="organization"
                onChange={(event) => setCompany(event.target.value)}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="order-note" className="field-label">
                Special instructions
              </label>
              <textarea
                id="order-note"
                rows={3}
                value={note}
                placeholder="What you'd like to talk about"
                onChange={(event) => setNote(event.target.value)}
                className="field h-auto py-3 placeholder:text-muted"
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="submit" className="btn btn-primary w-full">
              Send order
            </button>
            <Link href="/contact" className="btn btn-outline w-full">
              Skip the form
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted">Send order opens your email app with the order drafted. Nothing goes to a server, and your order only lives in this browser.</p>
        </form>
      </div>
    </div>
  );
}
