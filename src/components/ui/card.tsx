import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card" className={cn("rounded-xl border bg-card text-card-foreground shadow-card", className)} {...props} />;
}

function CardHeader({ className, title, description, actions, children, ...props }: Omit<React.ComponentProps<"div">, "title"> & { title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3", className)} {...props}>
      {(title || description) && (
        <div className="min-w-0">
          {title && <div className="text-[13.5px] font-semibold tracking-tight">{title}</div>}
          {description && <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>}
        </div>
      )}
      {children}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-2 border-t px-4 py-3", className)} {...props} />;
}

export { Card, CardHeader, CardContent, CardFooter };
