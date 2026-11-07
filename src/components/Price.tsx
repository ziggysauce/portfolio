import { yearsSince, type Price as PriceValue } from "@/content/catalog";

/** Years, $0.00 or a word, in the raised-and-underlined style of a menu price. */
export function Price({ price, className = "" }: { price: PriceValue; className?: string }) {
  if ("since" in price) {
    const years = yearsSince(price.since);
    return (
      <span className={`price ${className}`}>
        <span className="sr-only">
          {years} {years === 1 ? "year" : "years"}
        </span>
        <span aria-hidden="true">
          {years}
          <sup>{years === 1 ? "yr" : "yrs"}</sup>
        </span>
      </span>
    );
  }
  if ("free" in price) {
    return (
      <span className={`price ${className}`}>
        <span className="sr-only">Free</span>
        <span aria-hidden="true">
          $0<sup>00</sup>
        </span>
      </span>
    );
  }
  return <span className={`price ${className}`}>{price.text}</span>;
}
