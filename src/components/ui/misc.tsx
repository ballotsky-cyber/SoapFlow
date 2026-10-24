"use client";

import * as React from "react";
import { Tooltip as T } from "radix-ui";
import { AlertTriangle, CheckCircle2, Info, Paperclip, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse-soft rounded-lg bg-muted", className)} {...props} />;
}

function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return <div role="separator" className={cn("shrink-0 bg-border", vertical ? "h-full w-px" : "h-px w-full", className)} />;
}

function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "right" | "bottom" | "left" }) {
  return (
    <T.Provider delayDuration={250}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content side={side} sideOffset={6} className="z-[300] max-w-xs rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-pop animate-fade-in">
            {content}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}

function Progress({ value, tone = "primary", className }: { value: number; tone?: "primary" | "success" | "warning" | "danger"; className?: string }) {
  const bar = { primary: "bg-primary", success: "bg-success", warning: "bg-warning", danger: "bg-danger" }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-[width]", bar)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

const alertTones = {
  info: { cls: "border-primary/20 bg-primary-soft/60 text-primary-soft-foreground", Icon: Info },
  success: { cls: "border-success/25 bg-success-soft text-success", Icon: CheckCircle2 },
  warning: { cls: "border-warning/25 bg-warning-soft text-warning", Icon: AlertTriangle },
  danger: { cls: "border-danger/25 bg-danger-soft text-danger", Icon: XCircle },
} as const;

function Alert({ tone = "info", title, children, className, icon = true }: { tone?: keyof typeof alertTones; title?: React.ReactNode; children?: React.ReactNode; className?: string; icon?: boolean }) {
  const { cls, Icon } = alertTones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-2.5 rounded-lg border px-3 py-2.5 text-[12.5px] leading-relaxed", cls, className)}>
      {icon && <Icon className="mt-0.5 size-4 shrink-0" />}
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn(title && "mt-0.5", "text-foreground/80")}>{children}</div>}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, children, action, className }: { icon?: React.ReactNode; title: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1 px-6 py-10 text-center text-muted-foreground", className)}>
      {icon && <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">{icon}</div>}
      <div className="font-semibold text-foreground">{title}</div>
      {children && <div className="max-w-sm text-[12.5px]">{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Demo file picker: keeps only the file name (attachments are simulated). */
function FileInput({ value, onChange, accept, placeholder = "Attach file", className }: { value: string; onChange: (name: string) => void; accept?: string; placeholder?: string; className?: string }) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <div className={cn("flex h-9 items-center gap-2 rounded-md border border-dashed border-border-strong bg-card px-2 text-[13px]", className)}>
      <button type="button" onClick={() => ref.current?.click()} className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md bg-muted px-2 text-xs font-medium hover:bg-accent">
        <Paperclip className="size-3.5" />
        {value ? "Replace" : placeholder}
      </button>
      <span className={cn("truncate text-xs", value ? "text-foreground" : "text-subtle-foreground")}>{value || "No file chosen"}</span>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => onChange(e.target.files?.[0]?.name ?? "")} />
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border bg-muted px-1.5 font-mono text-[10.5px] text-muted-foreground">{children}</kbd>;
}

export { Skeleton, Separator, Tooltip, Progress, Alert, EmptyState, FileInput, Kbd };
