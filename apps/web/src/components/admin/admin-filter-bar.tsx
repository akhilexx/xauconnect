"use client";

import { type ReactNode, useId } from "react";
import { X } from "lucide-react";
import { GlassButton, GlassCard, GlassInput } from "@xauconnect/ui";

export function AdminFilter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="admin-field">
      <span className="admin-field-label">{label}</span>
      {children}
    </label>
  );
}

export function AdminFilterBar({
  search,
  onSearchChange,
  onClear,
  active,
  placeholder,
  children,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  onClear: () => void;
  active: boolean;
  placeholder?: string;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <GlassCard className="min-w-0" padding="sm">
      <div role="search" aria-label="Record filters" className="grid gap-3 p-1">
        <div className="flex min-w-0 items-end gap-2">
          <div className="min-w-0 flex-1">
            <GlassInput
              id={id}
              label="Search records"
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
            />
          </div>
          <GlassButton
            type="button"
            variant="ghost"
            size="sm"
            className="mb-0.5 min-h-10 shrink-0"
            disabled={!active}
            onClick={onClear}
          >
            <X size={14} />
            Clear filters
          </GlassButton>
        </div>
        {children && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]">
            {children}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
