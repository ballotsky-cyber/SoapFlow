"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Right-aligned key/value totals block. */
export function Totals({ rows }: { rows: { k: string; v: string; strong?: boolean }[] }) {
  return (
    <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-[12.5px]">
      {rows.map((t) => (
        <React.Fragment key={t.k}>
          <span className={cn("text-muted-foreground", t.strong && "font-semibold text-foreground")}>{t.k}</span>
          <span className={cn("text-right tabular", t.strong && "font-semibold")}>{t.v}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

/** Row in a card list (clickable when onClick is set). */
export function ListRow({ onClick, children, right }: { onClick?: () => void; children: React.ReactNode; right: React.ReactNode }) {
  const cls = "flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b px-4 py-2.5 text-left text-[12.5px] last:border-0";
  if (!onClick) return <div className={cls}><span className="min-w-0">{children}</span><span className="tabular">{right}</span></div>;
  return (
    <button type="button" onClick={onClick} className={cn(cls, "cursor-pointer transition-colors hover:bg-muted/60")}>
      <span className="min-w-0">{children}</span>
      <span className="tabular">{right}</span>
    </button>
  );
}
