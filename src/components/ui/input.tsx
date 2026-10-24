import * as React from "react";
import { cn } from "@/lib/utils";

export const controlBase =
  "w-full rounded-md border border-input bg-card px-3 text-[13px] text-foreground shadow-card outline-none transition-[color,box-shadow,border-color] placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-danger aria-invalid:ring-danger/20";

export interface InputProps extends React.ComponentProps<"input"> {
  /** Optional leading icon rendered inside the field. */
  icon?: React.ReactNode;
}

function Input({ className, type = "text", icon, ...props }: InputProps) {
  if (icon) {
    return (
      <div className={cn("relative", className)}>
        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-subtle-foreground [&_svg]:size-4">{icon}</span>
        <input type={type} data-slot="input" className={cn(controlBase, "h-9 pl-8")} {...props} />
      </div>
    );
  }
  return <input type={type} data-slot="input" className={cn(controlBase, "h-9", className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(controlBase, "min-h-20 resize-y py-2 leading-relaxed", className)} {...props} />;
}

export { Input, Textarea };
