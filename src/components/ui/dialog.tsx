"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = D.Root;
const DialogTrigger = D.Trigger;
const DialogClose = D.Close;

const sizes = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" } as const;

function DialogContent({
  className,
  children,
  size = "md",
  hideClose,
  ...props
}: React.ComponentProps<typeof D.Content> & { size?: keyof typeof sizes; hideClose?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-[100] bg-overlay backdrop-blur-[2px] animate-fade-in" />
      <div className="pointer-events-none fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
        <D.Content
          className={cn(
            "pointer-events-auto relative my-auto flex w-full flex-col rounded-xl border bg-card shadow-pop outline-none animate-slide-up",
            sizes[size],
            className,
          )}
          {...props}
        >
          {children}
          {!hideClose && (
            <D.Close className="absolute top-3.5 right-3.5 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer" aria-label="Close">
              <X className="size-4" />
            </D.Close>
          )}
        </D.Content>
      </div>
    </D.Portal>
  );
}

function DialogHeader({ className, icon, title, description, ...props }: Omit<React.ComponentProps<"div">, "title"> & { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className={cn("flex items-start gap-3 border-b px-5 py-4 pr-14", className)} {...props}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0">
        <D.Title className="text-[15px] font-semibold tracking-tight">{title}</D.Title>
        {description ? <D.Description className="mt-0.5 text-xs text-muted-foreground">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
      </div>
    </div>
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-4 px-5 py-4", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t bg-muted/60 px-5 py-3", className)} {...props} />;
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogBody, DialogFooter };
