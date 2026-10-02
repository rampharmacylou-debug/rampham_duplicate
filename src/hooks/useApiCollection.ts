"use client";

import { useCallback, useEffect, useState } from "react";

export type ApiCollectionState<T> = {
  items: T[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  add: (payload: Omit<T, "id">) => Promise<void>;
  update: (id: string, payload: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

export function useApiCollection<T extends { id: string }>(
  endpoint: string,
  dataKey: string,
): ApiCollectionState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      const res = await fetch(endpoint, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Server error ${res.status}`);
      }

      const data = await res.json();

      setItems(data[dataKey] ?? []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [endpoint, dataKey]);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(
    async (payload: Omit<T, "id">) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to create (${res.status})`);
      }

      await load();
    },
    [endpoint, load],
  );

  const update = useCallback(
    async (id: string, payload: Partial<T>) => {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to update (${res.status})`);
      }

      await load();
    },
    [endpoint, load],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to delete (${res.status})`);
      }

      await load();
    },
    [endpoint, load],
  );

  return {
    items,
    loading,
    error,
    lastUpdated,
    add,
    update,
    remove,
    reload: load,
  };
}
