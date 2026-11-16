"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/lib/utils";

export interface ComboOption {
  value: string;
  label: string;
  /** Secondary text shown under the label (and searched). */
  hint?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  size?: "default" | "sm";
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  /** Extra row under the list, e.g. a "New customer" button. Receives a close() callback. */
  footer?: (close: () => void) => React.ReactNode;
  "aria-label"?: string;
}

/** Searchable select: type to filter, arrow keys to move, Enter to pick. Same trigger styling as Select. */
function Combobox({ value, onValueChange, options, placeholder = "Select…", searchPlaceholder = "Search…", emptyText = "No matches.", size = "default", invalid, disabled, className, footer, ...aria }: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [hi, setHi] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);
  const term = q.trim().toLowerCase();
  const list = term ? options.filter((o) => (o.label + " " + (o.hint || "")).toLowerCase().includes(term)) : options;

  const close = () => setOpen(false);
  const pick = (o: ComboOption) => {
    if (o.disabled) return;
    onValueChange(o.value);
    close();
  };
  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${hi}"]`)?.scrollIntoView({ block: "nearest" });
  }, [hi]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setQ("");
          setHi(Math.max(0, options.findIndex((x) => x.value === value)));
        }
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={aria["aria-label"]}
          data-invalid={invalid || undefined}
          aria-expanded={open}
          className={cn(
            "flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-[13px] shadow-card outline-none transition-[box-shadow,border-color] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground data-[invalid]:border-danger",
            size === "sm" ? "h-8" : "h-9",
            className,
          )}
        >
          <span className={cn("truncate", !current && "text-subtle-foreground")}>{current ? current.label : placeholder}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[max(var(--radix-popover-trigger-width),280px)] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex items-center gap-2 border-b px-2.5">
          <Search className="size-4 shrink-0 text-subtle-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setHi(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(list.length - 1, h + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
              else if (e.key === "Enter" && list[hi]) { e.preventDefault(); pick(list[hi]); }
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle-foreground"
          />
        </div>
        <div ref={listRef} role="listbox" className="max-h-64 overflow-y-auto p-1">
          {list.map((o, i) => (
            <div
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              aria-disabled={o.disabled || undefined}
              data-index={i}
              onMouseEnter={() => setHi(i)}
              onClick={() => pick(o)}
              className={cn(
                "relative flex cursor-pointer flex-col rounded-md py-1.5 pr-8 pl-2.5 text-[13px] select-none",
                i === hi && "bg-accent",
                o.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <span className={cn("truncate", o.value === value && "font-medium")}>{o.label}</span>
              {o.hint && <span className="truncate text-[11.5px] text-muted-foreground">{o.hint}</span>}
              {o.value === value && <Check className="absolute top-2 right-2 size-4 text-primary" />}
            </div>
          ))}
          {!list.length && <div className="px-2.5 py-3 text-center text-[12.5px] text-muted-foreground">{emptyText}</div>}
        </div>
        {footer && <div className="border-t p-1">{footer(close)}</div>}
      </PopoverContent>
    </Popover>
  );
}

export { Combobox };
