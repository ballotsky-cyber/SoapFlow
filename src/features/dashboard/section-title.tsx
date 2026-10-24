import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small uppercase group label above a row of tiles. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{children}</div>;
}

const chipTone = { primary: "bg-primary-soft text-primary", warning: "bg-warning-soft text-warning", danger: "bg-danger-soft text-danger" } as const;

/** Card title with a small leading icon chip. */
export function IconTitle({ icon: Icon, tone = "primary", children }: { icon: LucideIcon; tone?: keyof typeof chipTone; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", chipTone[tone])}>
        <Icon className="size-4" />
      </span>
      {children}
    </span>
  );
}
