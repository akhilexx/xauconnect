"use client";

import { Search, X } from "lucide-react";
import { GlassButton, GlassInput } from "@xauconnect/ui";

export function AdminFilterBar({
  search,
  onSearchChange,
  onClear,
  placeholder = "Search address, name, wallet app, IP…",
  children,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  onClear: () => void;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  const hasFilters = Boolean(search.trim()) || Boolean(children);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="relative min-w-[12rem] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <GlassInput
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
          aria-label="Search"
        />
      </div>
      {children}
      {hasFilters && (
        <GlassButton type="button" size="sm" variant="ghost" onClick={onClear}>
          <X className="h-3.5 w-3.5" /> Clear
        </GlassButton>
      )}
    </div>
  );
}
