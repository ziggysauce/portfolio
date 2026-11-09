"use client";

import { useEffect, useState } from "react";

export type CopyState = "idle" | "copied" | "failed";

/** Clipboard copy with a result to announce. "Copied" fades after a few seconds; a failure stays until the next try. */
export function useCopy() {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state !== "copied") return;
    const timer = setTimeout(() => setState("idle"), 4000);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return { state, copy };
}

export function CopyButton({ text, label, className = "btn btn-outline" }: { text: string; label: string; className?: string }) {
  const { state, copy } = useCopy();

  return (
    <>
      <button type="button" onClick={() => copy(text)} className={className}>
        {state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy" : label}
      </button>
      <span role="status" className="sr-only">
        {state === "copied" ? "Copied to your clipboard" : state === "failed" ? "Couldn't copy. Select the text and copy it yourself." : ""}
      </span>
    </>
  );
}
