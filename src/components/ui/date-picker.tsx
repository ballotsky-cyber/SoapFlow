"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import type { Matcher } from "react-day-picker";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/lib/utils";

/** ISO yyyy-MM-dd in, ISO yyyy-MM-dd out — matches how the store keeps dates. */
export interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  size?: "default" | "sm";
  className?: string;
  id?: string;
}

const toDate = (iso?: string) => {
  if (!iso) return undefined;
  const d = parseISO(iso.slice(0, 10));
  return isValid(d) ? d : undefined;
};

function DatePicker({ value, onChange, placeholder = "Pick a date", min, max, disabled, invalid, clearable, size = "default", className, id }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = toDate(value);
  const minD = toDate(min);
  const maxD = toDate(max);
  const disabledDays: Matcher[] = [];
  if (minD) disabledDays.push({ before: minD });
  if (maxD) disabledDays.push({ after: maxD });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          data-invalid={invalid || undefined}
          className={cn(
            "flex w-full min-w-0 items-center gap-2 rounded-md border border-input bg-card px-3 text-left text-[13px] shadow-card outline-none transition-[box-shadow,border-color] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted data-[invalid]:border-danger cursor-pointer",
            size === "sm" ? "h-8" : "h-9",
            className,
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn("flex-1 truncate tabular", !selected && "text-subtle-foreground")}>{selected ? format(selected, "d MMM yyyy") : placeholder}</span>
          {clearable && selected && !disabled && (
            <span
              role="button"
              aria-label="Clear date"
              className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            >
              <X className="size-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? maxD ?? minD}
          disabled={disabledDays}
          onSelect={(d) => {
            if (d) onChange(format(d, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
