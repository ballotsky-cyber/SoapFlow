import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-card hover:bg-primary-hover",
        outline: "border border-input bg-card text-foreground shadow-card hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        soft: "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/70",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        destructive: "bg-danger text-white shadow-card hover:bg-danger/90",
        "destructive-outline": "border border-input bg-card text-danger hover:bg-danger-soft",
        success: "bg-success text-white shadow-card hover:bg-success/90",
        link: "h-auto px-0 font-medium text-primary hover:underline underline-offset-4",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-3 text-[12.5px]",
        xs: "h-7 px-2 text-xs",
        lg: "h-10 px-5",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, type = "button", ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" type={asChild ? undefined : type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
