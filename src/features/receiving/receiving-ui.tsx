"use client";

import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { UNITS, type Unit } from "./receiving-model";

/** Rounded status filter chips with counts ("All 12", "Posted 4", …). */
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

/** Numbered step circle: ✓ when done, primary when current, outlined otherwise. */
export function StepDot({ n, state, danger }: { n: number; state: StepState; danger?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
        state === "done" && "border-success bg-success text-white",
        state === "current" && (danger ? "border-danger bg-danger text-white" : "border-primary bg-primary text-primary-foreground"),
        state === "todo" && "border-border-strong bg-card text-subtle-foreground",
      )}
    >
      {state === "done" ? <Check className="size-3" strokeWidth={3} /> : n}
    </span>
  );
}

/** Horizontal status track (scrolls inside its card on phones). */
export function StepTrack({ steps }: { steps: { label: string; sub?: string; state: StepState; danger?: boolean }[] }) {
  return (
    <div className="flex overflow-x-auto rounded-xl border bg-card px-3.5 py-3 shadow-card">
      {steps.map((s, i) => (
        <div key={i} className="flex min-w-[130px] flex-1 items-center gap-2">
          <StepDot n={i + 1} state={s.state} danger={s.danger} />
          <span className="flex flex-col leading-tight">
            <span className={cn("text-xs whitespace-nowrap", s.state === "current" ? "font-semibold text-foreground" : "text-muted-foreground")}>{s.label}</span>
            {s.sub && <span className="text-[10.5px] whitespace-nowrap text-subtle-foreground">{s.sub}</span>}
          </span>
          {i < steps.length - 1 && <span className="mr-2 h-px min-w-2.5 flex-1 bg-border" />}
        </div>
      ))}
    </div>
  );
}

/** Quantity + unit (ctn / pk / bar) pair used by the receipt line editors. */
export function QtyUnit({ n, u, onN, onU, label, invalid }: { n: string; u: Unit; onN: (v: string) => void; onU: (u: Unit) => void; label: string; invalid?: boolean }) {
  return (
    <div className="flex min-w-0 gap-1">
      <Input
        value={n}
        onChange={(e) => onN(e.target.value.replace(/[^0-9]/g, ""))}
        inputMode="numeric"
        aria-label={label}
        aria-invalid={invalid || undefined}
        className="h-8 w-20 min-w-0 flex-1 px-2 text-right tabular sm:flex-none"
      />
      <Select size="sm" value={u} onValueChange={(v) => onU(v as Unit)} options={UNITS} aria-label={label + " unit"} className="w-[70px] shrink-0 px-2" />
    </div>
  );
}
