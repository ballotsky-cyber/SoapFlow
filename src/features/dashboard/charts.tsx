"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* Small, dependency-free chart primitives for the dashboard. Colours come from CSS-variable tokens via Tailwind classes. */

export interface Swatch {
  /** SVG stroke class, e.g. "stroke-primary/70". */
  stroke: string;
  /** Background class for legend chips / bars, e.g. "bg-primary/70". */
  bg: string;
}

export function LegendDot({ swatch, label, line }: { swatch: Swatch; label: React.ReactNode; line?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn(line ? "h-[3px] w-3 rounded-sm" : "size-2.5 rounded-[3px]", swatch.bg)} />
      {label}
    </span>
  );
}

export interface DonutSlice {
  key: string;
  n: number;
  swatch: Swatch;
  title: string;
}

/** Ring chart built from stroked circle segments; each segment carries a hover title. */
export function Donut({ slices, center, sub, size = 150 }: { slices: DonutSlice[]; center: React.ReactNode; sub: React.ReactNode; size?: number }) {
  const total = slices.reduce((a, x) => a + x.n, 0);
  const R = 15.915; // circumference ≈ 100
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 42 42" className="size-full -rotate-90" role="img" aria-label={slices.map((s) => s.title).join("; ")}>
        <circle cx="21" cy="21" r={R} fill="none" className="stroke-muted" strokeWidth="6" />
        {total > 0 &&
          slices.map((s) => {
            const len = (s.n / total) * 100;
            const off = acc;
            acc += len;
            return (
              <circle
                key={s.key}
                cx="21"
                cy="21"
                r={R}
                fill="none"
                strokeWidth="6"
                className={cn(s.swatch.stroke, "transition-opacity hover:opacity-80")}
                strokeDasharray={`${len} ${100 - len}`}
                strokeDashoffset={-off}
              >
                <title>{s.title}</title>
              </circle>
            );
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[15px] leading-tight font-semibold tabular">{center}</span>
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}

export interface TrendPoint {
  date: string;
  rev: number;
  cogs: number;
  title: string;
}

/** Revenue / gross profit / COGS line chart. Lines use non-scaling strokes so the SVG can stretch to any width. */
export function TrendChart({ points, yLabel }: { points: TrendPoint[]; yLabel: (v: number) => string }) {
  const W = 600;
  const H = 200;
  const n = points.length;
  const mr = Math.max(1, ...points.map((d) => d.rev));
  const X = (i: number) => (n > 1 ? (i / (n - 1)) * W : W / 2);
  const Y = (v: number) => H - 4 - (v / mr) * (H - 14);
  const line = (k: (d: TrendPoint) => number) => points.map((d, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(k(d)).toFixed(1)).join(" ");
  const rev = line((d) => d.rev);
  const ticks = [1, 2 / 3, 1 / 3, 0];
  const step = n > 1 ? W / (n - 1) : W;

  return (
    <div className="flex gap-2">
      <div className="flex h-[200px] w-12 shrink-0 flex-col justify-between text-right text-[10.5px] text-subtle-foreground tabular">
        {ticks.map((t) => (
          <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{yLabel(Math.round(mr * t))}</span>
        ))}
      </div>
      <div className="relative h-[200px] min-w-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" role="img" aria-label="Revenue, gross profit and COGS trend">
          {ticks.map((t) => (
            <line key={t} x1="0" x2={W} y1={Y(mr * t)} y2={Y(mr * t)} className="stroke-border" strokeDasharray={t ? "4 4" : undefined} vectorEffect="non-scaling-stroke" />
          ))}
          {points.map((d, i) => (
            <rect key={d.date + i} x={Math.max(0, X(i) - step / 2)} y="0" width={step} height={H} className="fill-transparent hover:fill-muted">
              <title>{d.title}</title>
            </rect>
          ))}
          <path d={rev + ` L${X(n - 1)} ${H} L${X(0)} ${H} Z`} className="pointer-events-none fill-primary/10" />
          <path d={line((d) => d.cogs)} fill="none" className="pointer-events-none stroke-muted-foreground" strokeWidth="1.6" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          <path d={line((d) => d.rev - d.cogs)} fill="none" className="pointer-events-none stroke-success" strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={rev} fill="none" className="pointer-events-none stroke-primary" strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}

export interface VolumeBar {
  key: string;
  a: number;
  b: number;
  highlight: boolean;
  title: string;
}

/** Paired vertical bars (primary series + neutral series) per bucket. */
export function PairedBars({ bars, yLabel }: { bars: VolumeBar[]; yLabel: (v: number) => string }) {
  const mx = Math.max(1, ...bars.map((d) => Math.max(d.a, d.b)));
  return (
    <div className="flex gap-2">
      <div className="flex h-40 w-10 shrink-0 flex-col justify-between text-right text-[10.5px] text-subtle-foreground tabular">
        <span>{yLabel(mx)}</span>
        <span>{yLabel(Math.round(mx / 2))}</span>
        <span>0</span>
      </div>
      <div className="relative flex h-40 min-w-0 flex-1 items-end gap-[3px] border-b border-border-strong">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
        {bars.map((d) => (
          <div key={d.key} title={d.title} className="group relative flex h-full min-w-0 flex-1 items-end gap-px rounded-t hover:bg-muted/70">
            <div className={cn("flex-1 rounded-t-[3px]", d.highlight ? "bg-primary" : "bg-primary/75")} style={{ height: `${(d.a / mx) * 100}%` }} />
            <div className="flex-1 rounded-t-[3px] bg-muted-foreground/35" style={{ height: `${(d.b / mx) * 100}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
