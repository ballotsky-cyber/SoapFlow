"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Rounded status filter chips with counts ("All 12", "In Transit 3", …). */
export function FilterChips({ items, value, onChange }: { items: { k: string; label: string; n: number }[]; value: string; onChange: (k: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((c) => {
        const active = value === c.k;
        return (
          <button
            key={c.k || "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(c.k)}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors",
              active ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border bg-card text-secondary-foreground hover:bg-accent",
            )}
          >
            {c.label}
            <span className="text-subtle-foreground tabular">{c.n}</span>
          </button>
        );
      })}
    </div>
  );
}

export type StepState = "done" | "current" | "todo";

/** Horizontal status track with optional sub-line per step (scrolls inside its card on phones). */
export function StepTrack({ steps }: { steps: { label: string; sub?: string; state: StepState; danger?: boolean }[] }) {
  return (
    <div className="flex overflow-x-auto rounded-xl border bg-card px-3.5 py-3 shadow-card">
      {steps.map((s, i) => (
        <div key={i} className="flex min-w-[140px] flex-1 items-center gap-2">
          <span
            className={cn(
              "flex size-[22px] shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
              s.state === "done" && "border-success bg-success text-white",
              s.state === "current" && (s.danger ? "border-danger bg-danger text-white" : "border-primary bg-primary text-primary-foreground"),
              s.state === "todo" && "border-border-strong bg-card text-subtle-foreground",
            )}
          >
            {s.state === "done" ? <Check className="size-3" strokeWidth={3} /> : i + 1}
          </span>
          <span className="flex flex-col leading-tight">
            <span className={cn("text-xs whitespace-nowrap text-foreground", s.state === "current" && "font-semibold")}>{s.label}</span>
            {s.sub && <span className="text-[10.5px] whitespace-nowrap text-muted-foreground">{s.sub}</span>}
          </span>
          {i < steps.length - 1 && <span className="mr-2 h-px min-w-2.5 flex-1 bg-border" />}
        </div>
      ))}
    </div>
  );
}
