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
  REWARD_AT,
  REWARD_TEXT,
  useOrderItems,
  type OrderDetails,
} from "@/lib/order";
import { CopyButton } from "./CopyButton";
import { Icon, PinIcon } from "./Icon";
import { Price } from "./Price";
import { ProductArt } from "./ProductArt";
import { Shelf } from "./ProductCard";

const TIPS = ["A role", "A referral", "A coffee", "Custom"];

function SheetHeader() {
  return (
    <div className="rounded-t-2xl bg-board pb-8 pt-3 text-white">
      <div aria-hidden="true" className="mx-auto h-1 w-9 rounded-full bg-[#5a5a5a]" />
      <div className="page mt-5 flex items-center justify-between gap-4">
        <Link href="/about#history" className="flex min-w-0 items-center gap-3 rounded-sm">
          <PinIcon />
          <span className="min-w-0">
            <span className="block truncate text-xs text-board-muted">{site.replyTime}</span>
            <span className="flex items-center gap-1.5 text-[15px]">
              {site.location} <Icon name="arrowDown" size={16} />
            </span>
          </span>
        </Link>
        <p className="shrink-0 text-right">
          <span className="block text-xs text-board-muted">Total</span>
          <span className="text-[15px]">Market price</span>
        </p>
      </div>
    </div>
  );
}

function OrderLines({ items }: { items: Item[] }) {
  if (!items.length) {
    return (
      <div className="py-10 text-center">
        <p className="font-display text-2xl">Nothing in your order yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          That&rsquo;s fine. Browse the menu, or leave me a note below and send it as is.
        </p>
        <Link href="/#menu" className="btn btn-outline mt-5">
          Browse the menu
        </Link>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.slug} className="flex gap-4 py-5">
          <Link href={`/item/${item.slug}`} tabIndex={-1} aria-hidden="true" className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden bg-tile">
            <ProductArt art={item.art} sizes="112px" />
          </Link>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/item/${item.slug}`} className="text-[15px] leading-snug hover:underline">
                {item.name}
              </Link>
              <Price price={item.price} className="mt-1.5 block" />
            </div>
            <button
              type="button"
              onClick={() => removeFromOrder(item.slug)}
              aria-label={`Remove ${item.name} from your order`}
              className="label-caps shrink-0 rounded-sm py-1 underline-offset-4 hover:underline"
            >
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Receipt({ order, onReset }: { order: OrderDetails & { number: string }; onReset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <div className="page max-w-xl py-10">
      <h1 ref={heading} tabIndex={-1} className="font-display text-[40px] leading-tight outline-none">
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
        {order.items.length >= REWARD_AT ? <p className="mt-4 text-sm text-muted">Reward unlocked: {REWARD_TEXT.toLowerCase()}.</p> : null}
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
  const [placed, setPlaced] = useState<(OrderDetails & { number: string }) | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const inOrder = new Set(items.map((item) => item.slug));
  const last = items.at(-1);
  const suggestions = (last ? related(last) : featured[lens].map(requireItem)).filter((item) => !inOrder.has(item.slug)).slice(0, 6);

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
      <h1 className="sr-only">Your order</h1>
      <SheetHeader />
      <div className="page grid grid-cols-[minmax(0,1fr)] gap-x-14 pt-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <OrderLines items={items} />

          {suggestions.length ? (
            <section aria-labelledby="also-like" className="mt-6 border-t border-line pt-8">
              <h2 id="also-like" className="aisle-title">
                You Might Also Like
              </h2>
              <div className="mt-5 md:[&>div]:grid-cols-3 lg:[&>div]:grid-cols-3 xl:[&>div]:grid-cols-3">
                <Shelf items={suggestions} label="You might also like" />
              </div>
            </section>
          ) : null}
        </div>

        <form onSubmit={submit} noValidate className="mt-8 self-start lg:sticky lg:top-20 lg:mt-5">
          <fieldset>
            <legend className="aisle-title">Leave a Tip</legend>
            <p className="mt-1 text-sm text-muted">100% of your tip goes to my next chapter.</p>
            <div className="mt-5 grid grid-cols-4 overflow-hidden rounded-xl border border-line">
              {TIPS.map((option) => (
                <label key={option} className="relative cursor-pointer border-l border-line first:border-l-0">
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
                placeholder="The role, the team, or what you'd like to talk about"
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
          <p className="mt-3 text-xs text-muted">Send order opens your email app with the order drafted. Nothing is stored here.</p>
        </form>
      </div>
    </div>
  );
}
