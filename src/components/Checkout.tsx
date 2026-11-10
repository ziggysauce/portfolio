"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { categories, related, requireItem, signature, type Item } from "@/content/catalog";
import { site } from "@/content/site";
import { clearOrder, orderMailto, orderText, removeFromOrder, useOrderItems, type OrderDetails } from "@/lib/order";
import { useCopy, type CopyState } from "./CopyButton";
import { MenuGrid } from "./MenuItem";

const REASONS = ["A project", "A question", "A coffee", "Something else"];

function categoryTitle(item: Item) {
  return categories.find((category) => category.id === item.category)?.title;
}

function EmailLink() {
  return (
    <a className="underline underline-offset-4" href={`mailto:${site.email}`}>
      {site.email}
    </a>
  );
}

/** What happened after a copy, in words. On failure, the message itself so it can be copied by hand. */
function CopyResult({ state, text }: { state: CopyState; text: string }) {
  const fallback = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (state === "failed") fallback.current?.select();
  }, [state]);

  return (
    <>
      <p role="status" className={state === "idle" ? "sr-only" : "mt-3 text-[15px]"}>
        {state === "copied" ? (
          <>
            Copied. Paste it into an email to <EmailLink />.
          </>
        ) : state === "failed" ? (
          "Your browser blocked copying, so here's the message to copy yourself."
        ) : (
          ""
        )}
      </p>
      {state === "failed" ? (
        <textarea
          ref={fallback}
          readOnly
          rows={8}
          value={text}
          aria-label="Your message"
          className="field mt-2 h-auto py-3 text-[15px]"
        />
      ) : null}
    </>
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
      <div className="py-6">
        <p ref={emptyHeading} tabIndex={-1} className="text-[18px] font-bold outline-none">
          Nothing in your order yet
        </p>
        <p className="mt-2 max-w-sm text-[15px] text-muted">
          That&rsquo;s fine. Pick a few topics from the menu, or just write me a note.
        </p>
        <Link href="/#menu" className="btn btn-soft btn-sm mt-4">
          Browse the menu
        </Link>
      </div>
    );
  }
  return (
    <ul ref={list} aria-label="Topics in your order" className="divide-y divide-line">
      {items.map((item, index) => (
        <li key={item.slug} className="flex items-center justify-between gap-4 py-3.5">
          <div className="min-w-0">
            <Link href={`/item/${item.slug}`} className="text-[16px] font-semibold leading-snug underline-offset-4 hover:underline">
              {item.name}
            </Link>
            <p className="mt-0.5 text-[14px] text-muted">{categoryTitle(item)}</p>
          </div>
          <button
            type="button"
            onClick={() => remove(item.slug, index)}
            aria-label={`Remove ${item.name} from your order`}
            className="btn btn-soft btn-sm shrink-0"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

/** After "Draft email": the handoff to the mail app, with the same message to copy if it never opened. */
function Drafted({ order, onReset }: { order: OrderDetails; onReset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { state, copy } = useCopy();
  const text = orderText(order);

  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <div className="page max-w-xl pt-6 md:pt-10">
      <h1 ref={heading} tabIndex={-1} className="page-title outline-none">
        One more step, {order.name.split(" ")[0]}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed">
        Your email app should have opened with this message. Nothing reaches me until you press send there. If it didn&rsquo;t open,
        copy the message and email it to <EmailLink />.
      </p>

      <div className="card mt-6 p-5">
        <p className="text-[13px] font-semibold text-muted">Your message</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{text}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <a href={orderMailto(order)} className="btn btn-primary">
          Open email again
        </a>
        <button type="button" onClick={() => copy(text)} className="btn btn-outline">
          Copy message
        </button>
      </div>
      <CopyResult state={state} text={text} />

      <p className="mt-6 text-sm">
        Prefer LinkedIn?{" "}
        <a className="underline underline-offset-4" href={site.linkedin} target="_blank" rel="noreferrer">
          Message me there
        </a>
        .{" "}
        <button type="button" onClick={onReset} className="rounded-sm underline underline-offset-4">
          Start over
        </button>
      </p>
    </div>
  );
}

export function Checkout() {
  const items = useOrderItems();
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [note, setNote] = useState("");
  const [nameError, setNameError] = useState(false);
  const [drafted, setDrafted] = useState<OrderDetails | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const { state: copyState, copy } = useCopy();

  // Keyed to the first line so adding a suggestion doesn't reshuffle the row under
  // the pointer. Items already in the order stay put and show a check mark.
  const suggestions = items[0] ? related(items[0], 4) : signature.map(requireItem);

  const order: OrderDetails = {
    name: name.trim(),
    company: company.trim(),
    note: note.trim(),
    reason: reason === "Something else" ? otherReason.trim() : reason,
    items,
  };

  /** The message as it stands, or null (and focus on the name) if it isn't ready. */
  function readyOrder(): OrderDetails | null {
    if (order.name) return order;
    setNameError(true);
    nameInput.current?.focus();
    return null;
  }

  function draftEmail(event: FormEvent) {
    event.preventDefault();
    const ready = readyOrder();
    if (!ready) return;
    setDrafted(ready);
    window.location.href = orderMailto(ready);
  }

  function copyMessage() {
    const ready = readyOrder();
    if (ready) copy(orderText(ready));
  }

  function reset() {
    clearOrder();
    setDrafted(null);
    setReason("");
    setOtherReason("");
    setNote("");
  }

  if (drafted) return <Drafted order={drafted} onReset={reset} />;

  return (
    <div className="sheet-up">
      <div className="page pt-4 md:pt-8">
        <h1 className="page-title">Your order</h1>
        <p className="mt-2 max-w-2xl text-[16px] text-muted">
          Topics you&rsquo;d like to talk about. They go into the email, so I know where to start.
        </p>
      </div>

      <div className="page mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-8">
        <div className="card px-5 py-1 lg:sticky lg:top-24">
          <OrderLines items={items} />
        </div>

        <form onSubmit={draftEmail} noValidate className="card p-5 md:p-7">
          <fieldset>
            <legend className="text-[20px] font-bold tracking-tight">What brings you here?</legend>
            <p className="mt-1 text-[15px] text-muted">Optional, but it helps.</p>
            {/* Chips over real radios: selected is mint, bold and outlined in green. */}
            <div className="mt-4 flex flex-wrap gap-2">
              {REASONS.map((option) => (
                <label key={option} className="relative">
                  <input
                    type="radio"
                    name="reason"
                    value={option}
                    checked={reason === option}
                    onChange={() => setReason(option)}
                    className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                  />
                  <span className="chip">{option}</span>
                </label>
              ))}
            </div>
            {reason === "Something else" ? (
              <div className="mt-4">
                <label htmlFor="other-reason" className="field-label">
                  What is it?
                </label>
                <input id="other-reason" value={otherReason} onChange={(event) => setOtherReason(event.target.value)} className="field" />
              </div>
            ) : null}
          </fieldset>

          <div className="mt-7 space-y-4 border-t border-line pt-6">
            <div>
              <label htmlFor="order-name" className="field-label">
                Your name <span className="text-muted">(required)</span>
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
                  Add your name so I know who I&rsquo;m writing back to.
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="order-company" className="field-label">
                Company <span className="text-muted">(optional)</span>
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
                Message <span className="text-muted">(optional)</span>
              </label>
              <textarea
                id="order-note"
                rows={3}
                value={note}
                placeholder="Anything you'd like me to know"
                onChange={(event) => setNote(event.target.value)}
                className="field h-auto py-3 placeholder:text-muted"
              />
            </div>
          </div>

          <p id="draft-help" className="mt-6 text-[15px] leading-relaxed">
            <strong className="font-medium">Draft email</strong> opens your email app with this message and your topics filled in. Nothing
            is sent until you press send there. No email app? Copy the message instead.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="submit" aria-describedby="draft-help" className="btn btn-primary w-full">
              Draft email
            </button>
            <button type="button" onClick={copyMessage} className="btn btn-outline w-full">
              Copy message
            </button>
          </div>
          <CopyResult state={copyState} text={orderText(order)} />
          <p className="mt-4 text-[15px] text-muted">
            Rather write your own? Email <EmailLink /> or{" "}
            <Link href="/contact" className="underline underline-offset-4">
              see other ways to reach me
            </Link>
            .
          </p>
        </form>
      </div>

      {suggestions.length ? (
        <section aria-labelledby="also-like" className="page mt-12">
          <h2 id="also-like" className="section-title">
            You might also like
          </h2>
          <div className="mt-5">
            <MenuGrid items={suggestions} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
