"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { categories, getItem, type Item } from "@/content/catalog";
import { site } from "@/content/site";
import { cartOpenStore, closeCart, openCart, removeFromOrder, toastStore, useOrderItems } from "@/lib/order";
import { Icon } from "./Icon";

/** "GoTab Work · In production" or "Frontend · Since 2018". */
function lineMeta(item: Item) {
  const section = categories.find((category) => category.id === item.category)?.title;
  const detail = item.status ?? (item.since ? `Since ${item.since}` : undefined);
  return [section, detail].filter(Boolean).join(" · ");
}

/**
 * The cart, as a modal drawer. The native <dialog> traps focus and closes on
 * Escape; this component puts focus back where it was when the drawer closes.
 */
export function CartDrawer() {
  const open = cartOpenStore.use();
  const items = useOrderItems();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const emptyHeading = useRef<HTMLParagraphElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const leaving = useRef(false);
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      leaving.current = false;
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  // A link inside the drawer moved to another page.
  useEffect(() => {
    closeCart();
  }, [pathname]);

  function handleClose() {
    closeCart(); // Escape closes the dialog without going through the store.
    if (leaving.current) return;
    // The toast's "View order" button is gone by now, so the cart button takes focus instead.
    const opener = returnTo.current;
    const target = opener && opener !== document.body && opener.isConnected ? opener : document.getElementById("cart-button");
    target?.focus();
  }

  /** A link inside the drawer. A new-tab click leaves the drawer open; a link to this same page closes it and restores focus. */
  function leave(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (new URL(event.currentTarget.href).pathname !== pathname) leaving.current = true;
    closeCart();
  }

  function backToMenu(event: MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/") return leave(event);
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    leaving.current = true; // Focus goes to the menu below, not back to the cart button.
    // Close now: an open modal makes the rest of the page inert, so nothing there could take focus yet.
    dialog.current?.close();
    // Land on the menu's first control, the selected Explore option.
    document.getElementById("menu")?.scrollIntoView({ block: "start" });
    document.querySelector<HTMLInputElement>('#menu input[name="lens"]:checked')?.focus({ preventScroll: true });
  }

  // The pressed button is about to disappear, so hand focus to the nearest line or the empty state.
  function remove(slug: string, index: number) {
    removeFromOrder(slug);
    requestAnimationFrame(() => {
      const buttons = list.current?.querySelectorAll("button");
      const next = buttons?.length ? buttons[Math.min(index, buttons.length - 1)] : emptyHeading.current;
      next?.focus();
    });
  }

  return (
    <dialog
      ref={dialog}
      id="cart-drawer"
      aria-labelledby="cart-title"
      className="drawer"
      onClose={handleClose}
      // The backdrop closes it, but not a drag that started inside the drawer.
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressedBackdrop.current) closeCart();
      }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
        <h2 id="cart-title" className="text-[22px] font-bold tracking-tight">
          Your order{" "}
          <span className="text-[16px] font-medium text-muted">
            ({items.length} {items.length === 1 ? "item" : "items"})
          </span>
        </h2>
        <button
          type="button"
          onClick={closeCart}
          aria-label="Close your order"
          className="-mr-2 grid size-11 place-items-center rounded-full transition-colors hover:bg-canvas"
        >
          <Icon name="close" size={22} />
        </button>
      </div>

      {items.length ? (
        <>
          <ul ref={list} className="flex-1 divide-y divide-line overflow-y-auto px-5">
            {items.map((item, index) => {
              const meta = lineMeta(item);
              return (
                <li key={item.slug} className="flex items-center gap-3 py-4">
                  {item.image ? (
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas">
                      <Image src={item.image.src} alt="" fill sizes="48px" className="object-cover object-top" />
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <Link href={`/item/${item.slug}`} onClick={leave} className="font-semibold leading-snug underline-offset-4 hover:underline">
                      {item.name}
                    </Link>
                    <p className="text-[14px] text-muted">{meta}</p>
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
              );
            })}
          </ul>
          <div className="border-t border-line px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4">
            <Link href="/checkout" onClick={leave} className="btn btn-primary w-full">
              Continue to checkout
            </Link>
            <p className="mt-3 text-center text-[13px] text-muted">
              Checkout drafts an email to me. {site.replyTime}.
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
          <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-mint text-brand-strong">
            <Icon name="bag" size={26} />
          </span>
          <p ref={emptyHeading} tabIndex={-1} className="mt-4 text-[20px] font-bold outline-none">
            Your order is empty
          </p>
          <p className="mt-1 max-w-xs text-[15px] text-muted">
            Add anything you&rsquo;d like to talk about. It goes into the email when you check out.
          </p>
          <Link href="/#menu" onClick={backToMenu} className="btn btn-primary mt-6">
            Back to the menu
          </Link>
          <Link href="/contact" onClick={leave} className="mt-4 text-[15px] font-medium underline underline-offset-4">
            Or contact me directly
          </Link>
        </div>
      )}
    </dialog>
  );
}

export function AddedToast() {
  const toast = toastStore.use();
  const open = cartOpenStore.use();
  const pathname = usePathname();
  // Held per toast, so a newer toast never inherits a hold its predecessor couldn't release.
  const [heldId, setHeldId] = useState<number | null>(null);
  const held = toast !== null && heldId === toast.id;
  const item = toast ? getItem(toast.slug) : undefined;

  // It waits while the pointer or keyboard focus is on it, so "View order" stays reachable.
  useEffect(() => {
    if (!toast || held) return;
    const timer = setTimeout(() => toastStore.set(null), 3500);
    return () => clearTimeout(timer);
  }, [toast, held]);

  const show = item && !open && pathname !== "/checkout";

  return (
    // On phones it sits just above the bottom navigation.
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--bar-h)+env(safe-area-inset-bottom)+12px)] z-30 md:bottom-6 md:left-auto md:right-8 md:w-[380px]"
    >
      {show ? (
        <div
          key={toast?.id}
          onPointerEnter={() => setHeldId(toast?.id ?? null)}
          onPointerLeave={() => setHeldId(null)}
          onFocus={() => setHeldId(toast?.id ?? null)}
          onBlur={() => setHeldId(null)}
          className="toast-in pointer-events-auto flex items-center gap-3 rounded-2xl bg-ink py-2.5 pl-4 pr-2.5 text-white shadow-[var(--shadow-overlay)]">
          <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-mint text-brand-strong">
            <Icon name="check" size={16} />
          </span>
          <p className="min-w-0 flex-1 truncate text-[15px] font-medium">
            <span className="sr-only">{item.name}: </span>
            Added to your order
          </p>
          <button
            type="button"
            onClick={openCart}
            className="shrink-0 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-ink transition-colors hover:bg-mint"
          >
            View order
          </button>
        </div>
      ) : item ? (
        <p className="sr-only">{item.name} added to your order</p>
      ) : null}
    </div>
  );
}
