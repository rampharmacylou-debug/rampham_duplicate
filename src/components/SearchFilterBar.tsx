"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";

type FilterOption = { value: string; label: string };

type Props = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: FilterOption[];
};

export default function SearchFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filterValue,
  onFilterChange,
  filterOptions,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Only sync from parent when it resets to "" (e.g. clear button)
  useEffect(() => {
    if (
      searchValue === "" &&
      inputRef.current &&
      inputRef.current.value !== ""
    ) {
      inputRef.current.value = "";
    }
  }, [searchValue]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Fire immediately with NO debounce.
    // useDeferredValue in the parent handles scheduling the expensive filter
    // so the input itself is never blocked.
    onSearchChange(e.target.value);
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = "";
    onSearchChange("");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          ref={inputRef}
          type="text"
          defaultValue={searchValue}
          onChange={handleChange}
          placeholder={searchPlaceholder}
          className="w-full rounded-md border border-hairline bg-surface py-2 pl-9 pr-8 text-sm text-text outline-none placeholder:text-muted/70 focus:border-accent focus:ring-1 focus:ring-accent/40"
        />
        <button
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-ink"
          aria-label="Clear search"
          tabIndex={-1}
        >
          <X size={13} />
        </button>
      </div>
      {filterOptions && onFilterChange ? (
        <select
          value={filterValue}
          onChange={(e) => onFilterChange(e.target.value)}
          className="rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
