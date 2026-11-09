import type { Item, Status } from "@/content/catalog";
import { Icon } from "./Icon";

const LIVE: Status[] = ["In production", "Live project"];

/** Where a piece of work stands, in words. Green is a second cue, never the only one. */
export function StatusPill({ status }: { status: Status }) {
  return <span className={LIVE.includes(status) ? "status status-live" : "status"}>{status}</span>;
}

/** The meta row every card shares, always in this order: status, experience, tag. */
export function ItemMeta({ item, className = "" }: { item: Item; className?: string }) {
  if (!item.status && !item.since && !item.badge) return null;
  return (
    <p className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] text-muted ${className}`}>
      {item.status ? <StatusPill status={item.status} /> : null}
      {item.since ? (
        <span>
          <span className="sr-only">Experience: </span>Since {item.since}
        </span>
      ) : null}
      {item.badge ? <span className="tag">{item.badge}</span> : null}
    </p>
  );
}

/** One outcome, set apart from the description so results read first. */
export function ResultLine({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={`flex gap-2 text-[14px] font-medium leading-snug ${className}`}>
      <Icon name="check" size={16} className="mt-0.5 shrink-0 text-open" />
      <span>
        <span className="sr-only">Result: </span>
        {text}
      </span>
    </p>
  );
}
