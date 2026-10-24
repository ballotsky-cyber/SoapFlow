import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-semibold whitespace-nowrap [&_svg]:size-3", {
  variants: {
    tone: {
      green: "bg-success-soft text-success",
      blue: "bg-info-soft text-info",
      amber: "bg-warning-soft text-warning",
      red: "bg-danger-soft text-danger",
      violet: "bg-violet-soft text-violet",
      gray: "bg-neutral-soft text-neutral",
      primary: "bg-primary text-primary-foreground",
      outline: "border border-input bg-card text-secondary-foreground",
    },
    dot: { true: "before:size-1.5 before:rounded-full before:bg-current before:content-['']", false: "" },
  },
  defaultVariants: { tone: "gray", dot: false },
});

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

function Badge({ className, tone, dot, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, dot }), className)} {...props} />;
}

export { Badge, badgeVariants };
