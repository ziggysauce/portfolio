"use client";

import { useSyncExternalStore } from "react";

// A tiny client store. The server and first client render use `initial`, then
// the saved value takes over, so static HTML hydrates without a mismatch.
export function createStore<T>(
  key: string | null,
  initial: T,
  sanitize: (raw: unknown) => T = (raw) => raw as T,
) {
  let value = initial;
  let loaded = key === null;
  const listeners = new Set<() => void>();

  function get(): T {
    if (!loaded) {
      loaded = true;
      try {
        const raw = window.localStorage.getItem(key as string);
        if (raw !== null) value = sanitize(JSON.parse(raw));
      } catch {
        // Private mode or bad JSON: keep the initial value.
      }
    }
    return value;
  }

  function set(next: T) {
    value = next;
    loaded = true;
    if (key !== null) {
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage is a convenience here, so losing it is fine.
      }
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    get,
    set,
    use: () => useSyncExternalStore(subscribe, get, () => initial),
  };
}
