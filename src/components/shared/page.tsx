"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page container: consistent padding, vertical rhythm and max width. */
export function Page({ className, wide, ...props }: React.ComponentProps<"div"> & { wide?: boolean }) {
  return <div className={cn("mx-auto flex w-full flex-col gap-4 p-4 sm:p-6", wide ? "max-w-[1700px]" : "max-w-[1600px]", className)} {...props} />;
}

/** Module title row: icon chip + title + subtitle on the left, actions on the right. */
export function PageHeader({ icon: Icon, title, description, actions, className }: { icon?: LucideIcon; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/10">
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight">{title}</h1>
          {description && <div className="mt-0.5 text-[12.5px] text-muted-foreground">{description}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Detail-page header: back link, mono reference, title, meta line, actions. */
export function DetailHeader({ backLabel, onBack, reference, title, meta, actions, className }: { backLabel: string; onBack: () => void; reference?: React.ReactNode; title: React.ReactNode; meta?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <button type="button" onClick={onBack} className="no-print mb-2 inline-flex cursor-pointer items-center gap-1 text-[12.5px] font-medium text-primary hover:underline">
          <ArrowLeft className="size-3.5" />
          {backLabel}
        </button>
        {reference && <div className="font-mono text-xs text-primary">{reference}</div>}
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight">{title}</h1>
        {meta && <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">{meta}</div>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Row of filter controls above a table. */
export function Toolbar({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)} {...props} />;
}

/** Responsive auto-fit grid for cards / KPI tiles. */
export function Grid({ min = 220, className, style, ...props }: React.ComponentProps<"div"> & { min?: number }) {
  return <div className={cn("grid gap-3", className)} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`, ...style }} {...props} />;
}

const kpiTones = {
  default: "",
  warning: "text-warning",
  danger: "text-danger",
  success: "text-success",
} as const;

/** KPI tile: label, big value, optional sub-text and icon. Clickable when onClick is set. */
export function StatCard({ label, value, sub, icon: Icon, tone = "default", onClick, className }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; icon?: LucideIcon; tone?: keyof typeof kpiTones; onClick?: () => void; className?: string }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-4 text-left shadow-card",
        onClick && "cursor-pointer transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-pop",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className={cn("truncate text-[22px] leading-tight font-semibold tracking-tight tabular", kpiTones[tone])}>{value}</div>
      {sub && <div className="truncate text-[11.5px] text-muted-foreground">{sub}</div>}
    </Comp>
  );
}

/** Key/value fact tile used on detail pages. */
export function Fact({ k, v, className }: { k: React.ReactNode; v: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-lg border bg-card px-3 py-2", className)}>
      <div className="text-[11px] text-muted-foreground">{k}</div>
      <div className="mt-0.5 truncate text-[13px] font-medium">{v}</div>
    </div>
  );
}

/** Monospace document / SKU reference, optionally clickable. */
export function Ref({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  if (onClick)
    return (
      <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} className={cn("cursor-pointer font-mono text-[11.5px] text-primary hover:underline", className)}>
        {children}
      </button>
    );
  return <span className={cn("font-mono text-[11.5px] text-primary", className)}>{children}</span>;
}

/** Small legend / helper strip shown above tables. */
export function InfoStrip({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap gap-x-4 gap-y-1 rounded-xl border bg-card px-3 py-2 text-[11.5px] text-muted-foreground shadow-card [&_b]:font-semibold [&_b]:text-foreground", className)} {...props} />;
}
