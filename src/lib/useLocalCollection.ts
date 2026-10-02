"use client";

import { useCallback, useEffect, useState } from "react";

function readFromStorage<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T[];
  } catch {
    return fallback;
  }
}

/**
 * Keeps a typed list of records in sync with localStorage under `key`.
 * Seeds with `seed` the first time the key is empty.
 */
export function useLocalCollection<T extends { id: string }>(
  key: string,
  seed: T[]
) {
  const [items, setItems] = useState<T[]>(() => readFromStorage(key, seed));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Sync from localStorage (an external system) once on mount, then mark
    // the component as hydrated so it's safe to render real data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readFromStorage(key, seed));
    setHydrated(true);
    // seed is only used on first mount intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(key, JSON.stringify(items));
  }, [key, items, hydrated]);

  const add = useCallback((item: T) => {
    setItems((prev) => [item, ...prev]);
  }, []);

  const update = useCallback((id: string, patch: Partial<T>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const replaceAll = useCallback(
    (updater: T[] | ((prev: T[]) => T[])) => {
      setItems((prev) =>
        typeof updater === "function"
          ? (updater as (p: T[]) => T[])(prev)
          : updater
      );
    },
    []
  );

  return { items, add, update, remove, replaceAll, hydrated };
}

export function makeId() {
  return Math.random().toString(36).slice(2, 10);
}
