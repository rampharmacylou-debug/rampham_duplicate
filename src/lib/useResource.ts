"use client";

import { useCallback, useEffect, useState } from "react";

type WriteData = Record<string, unknown>;

function extractArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const arr = Object.values(data as Record<string, unknown>).find(
      Array.isArray,
    );
    if (arr) return arr as unknown[];
  }
  return [];
}

export function useResource<T extends { id: string }>(url: string) {
  const [items, setItems] = useState<T[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setItems(extractArray(data) as T[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setHydrated(true);
    }
  }, [url]);

  // Fetching data from an external system is a valid useEffect use case.

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (data: WriteData) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Create failed: ${res.status}`);
      }
      await refresh();
    },
    [url, refresh],
  );

  const update = useCallback(
    async (id: string, data: WriteData) => {
      const res = await fetch(`${url}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Update failed: ${res.status}`);
      }
      await refresh();
    },
    [url, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`${url}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Delete failed: ${res.status}`);
      }
      await refresh();
    },
    [url, refresh],
  );

  return { items, hydrated, error, add, update, remove, refresh };
}
