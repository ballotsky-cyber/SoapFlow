"use client";

import * as React from "react";
import { DropdownMenu as M } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const DropdownMenu = M.Root;
const DropdownMenuTrigger = M.Trigger;
const DropdownMenuGroup = M.Group;

function DropdownMenuContent({ className, sideOffset = 6, align = "end", ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-[150] max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-48 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-pop animate-fade-in",
          className,
        )}
        {...props}
      />
    </M.Portal>
  );
}

function DropdownMenuItem({ className, variant, inset, ...props }: React.ComponentProps<typeof M.Item> & { variant?: "default" | "destructive"; inset?: boolean }) {
  return (
    <M.Item
      className={cn(
        "relative flex min-h-8 cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        variant === "destructive" && "text-danger data-[highlighted]:bg-danger-soft [&_svg]:text-danger",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckItem({ className, checked, children, ...props }: React.ComponentProps<typeof M.Item> & { checked?: boolean }) {
  return (
    <DropdownMenuItem className={cn("justify-between", checked && "bg-primary-soft/60", className)} {...props}>
      {children}
      {checked && <Check className="!text-primary" />}
    </DropdownMenuItem>
  );
}

function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof M.Label>) {
  return <M.Label className={cn("px-2.5 pt-2 pb-1 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase", className)} {...props} />;
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof M.Separator>) {
  return <M.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuGroup, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckItem, DropdownMenuLabel, DropdownMenuSeparator };
