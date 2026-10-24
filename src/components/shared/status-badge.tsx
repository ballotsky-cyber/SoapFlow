"use client";

import { Badge } from "@/components/ui/badge";
import { getStore } from "@/lib/store";

/** Badge coloured by the engine's status → tone map (e.g. Posted = green, Pending Approval = amber). */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = getStore().STATUS_TONE[status] ?? "gray";
  return (
    <Badge tone={tone} dot className={className}>
      {status}
    </Badge>
  );
}

/** Text colour class for a status (for inline coloured text without a pill). */
export function statusTextClass(status: string): string {
  const tone = getStore().STATUS_TONE[status] ?? "gray";
  return { green: "text-success", blue: "text-info", amber: "text-warning", red: "text-danger", violet: "text-violet", gray: "text-muted-foreground" }[tone];
}
