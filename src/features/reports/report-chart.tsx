"use client";

import type { ChartBar } from "./build-report";

/** Stacked daily bars: bar height = revenue, upper share = gross profit (success), lower share = COGS (neutral). */
export function ReportChart({ bars, title, legend, from, to, yLabel }: { bars: ChartBar[]; title?: string; legend?: string; from: string; to: string; yLabel: (v: number) => string }) {
  const mx = Math.max(1, ...bars.map((b) => b.total));
  return (
    <div className="rounded-xl border bg-card px-3.5 py-3 shadow-card">
      <div className="mb-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-success" />{legend}</span>
        </span>
      </div>
      <div className="flex gap-2">
        <div className="flex h-[140px] w-11 shrink-0 flex-col justify-between text-right text-[10.5px] text-subtle-foreground tabular">
          <span>{yLabel(mx)}</span>
          <span>{yLabel(Math.round(mx / 2))}</span>
          <span>0</span>
        </div>
        <div className="relative flex h-[140px] min-w-0 flex-1 items-end gap-0.5 border-b border-border-strong">
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
          {bars.map((c, i) => (
            <div key={i} title={c.title} className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-t-[2px] transition-opacity hover:opacity-80" style={{ height: `${Math.round((c.total / mx) * 100)}%` }}>
              <div className="bg-success" style={{ height: `${c.top}%` }} />
              <div className="flex-1 bg-muted-foreground/35" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between pl-[52px] text-[11px] text-muted-foreground">
        <span>{from}</span>
        <span>{to}</span>
      </div>
    </div>
  );
}
