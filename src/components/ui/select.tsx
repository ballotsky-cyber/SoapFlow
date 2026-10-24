"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* Radix forbids "" as an item value; we map it to a sentinel so callers can keep using "" for "All …". */
const EMPTY = "__empty__";
const toRadix = (v: string) => (v === "" ? EMPTY : v);
const fromRadix = (v: string) => (v === EMPTY ? "" : v);

export type SelectOption = string | { value: string; label: React.ReactNode; disabled?: boolean };

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  size?: "default" | "sm";
  className?: string;
  contentClassName?: string;
  id?: string;
  "aria-label"?: string;
}

function Select({ value, onValueChange, options, placeholder, disabled, invalid, size = "default", className, contentClassName, id, ...aria }: SelectProps) {
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o || placeholder || "—" } : o));
  return (
    <SelectPrimitive.Root value={toRadix(value)} onValueChange={(v) => onValueChange(fromRadix(v))} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={aria["aria-label"]}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-[13px] shadow-card outline-none transition-[box-shadow,border-color] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-danger data-[placeholder]:text-subtle-foreground cursor-pointer",
          size === "sm" ? "h-8" : "h-9",
          className,
        )}
      >
        <span className="truncate"><SelectPrimitive.Value placeholder={placeholder} /></span>
        <SelectPrimitive.Icon asChild><ChevronDown className="size-4 shrink-0 text-muted-foreground" /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            "z-[200] max-h-[min(var(--radix-select-content-available-height),320px)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-pop animate-fade-in",
            contentClassName,
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {items.map((it) => (
              <SelectPrimitive.Item
                key={it.value}
                value={toRadix(it.value)}
                disabled={it.disabled}
                className="relative flex h-8 cursor-pointer items-center rounded-md pr-8 pl-2.5 text-[13px] outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[state=checked]:font-medium"
              >
                <SelectPrimitive.ItemText>{it.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2 text-primary"><Check className="size-4" /></SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
