"use client";

import * as React from "react";
import { Checkbox as C, RadioGroup as R, Switch as S } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        "peer inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-border-strong bg-card shadow-card outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <C.Indicator><Check className="size-3" strokeWidth={3} /></C.Indicator>
    </C.Root>
  );
}

/** Checkbox with an inline clickable label. */
function CheckboxField({ label, description, className, ...props }: React.ComponentProps<typeof C.Root> & { label: React.ReactNode; description?: React.ReactNode }) {
  const id = React.useId();
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-2.5 text-[13px]", props.disabled && "cursor-not-allowed opacity-60", className)}>
      <Checkbox id={id} className="mt-0.5" {...props} />
      <span className="flex flex-col gap-0.5">
        <span>{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </span>
    </label>
  );
}

function RadioGroup({ className, options, ...props }: React.ComponentProps<typeof R.Root> & { options: { value: string; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean }[] }) {
  return (
    <R.Root className={cn("flex flex-wrap gap-2", className)} {...props}>
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 rounded-lg border bg-card p-3 text-[13px] shadow-card transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft/50",
            o.disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <R.Item
            value={o.value}
            disabled={o.disabled}
            className="mt-0.5 inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring data-[state=checked]:border-primary"
          >
            <R.Indicator className="size-2 rounded-full bg-primary" />
          </R.Item>
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">{o.label}</span>
            {o.description && <span className="text-xs text-muted-foreground">{o.description}</span>}
          </span>
        </label>
      ))}
    </R.Root>
  );
}

function Switch({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        "inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-border-strong outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <S.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4" />
    </S.Root>
  );
}

export { Checkbox, CheckboxField, RadioGroup, Switch };
