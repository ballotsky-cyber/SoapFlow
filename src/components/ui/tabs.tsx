"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem<V extends string = string> {
  value: V;
  label: React.ReactNode;
  count?: number;
}

/** Underlined page-level tabs. Controlled; render the active panel yourself. */
function Tabs<V extends string>({ value, onValueChange, items, className }: { value: V; onValueChange: (v: V) => void; items: TabItem<V>[]; className?: string }) {
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto border-b", className)}>
      {items.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onValueChange(t.value)}
            className={cn(
              "-mb-px inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 text-[13px] whitespace-nowrap transition-colors",
              active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className={cn("rounded-full px-1.5 text-[11px] leading-[18px] font-semibold tabular", active ? "bg-primary-soft text-primary-soft-foreground" : "bg-muted text-muted-foreground")}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Compact pill toggle group, e.g. "By warehouse | Consolidated". */
function SegmentedControl<V extends string>({ value, onValueChange, items, className, size = "default" }: { value: V; onValueChange: (v: V) => void; items: TabItem<V>[]; className?: string; size?: "default" | "sm" }) {
  return (
    <div role="radiogroup" className={cn("inline-flex rounded-md border border-input bg-muted p-0.5 shadow-card", className)}>
      {items.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onValueChange(t.value)}
            className={cn(
              "inline-flex cursor-pointer items-center rounded-[5px] px-2.5 text-[12.5px] whitespace-nowrap transition-colors",
              size === "sm" ? "h-6" : "h-7",
              active ? "bg-card font-semibold text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs, SegmentedControl };
