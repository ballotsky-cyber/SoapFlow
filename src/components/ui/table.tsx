import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

function Table({ className, wrapperClassName, ...props }: React.ComponentProps<"table"> & { wrapperClassName?: string }) {
  return (
    <div className={cn("relative w-full overflow-x-auto", wrapperClassName)}>
      <table className={cn("w-full border-collapse text-[12.5px]", className)} {...props} />
    </div>
  );
}

const THead = ({ className, ...props }: React.ComponentProps<"thead">) => <thead className={cn("bg-muted/70", className)} {...props} />;
const TBody = ({ className, ...props }: React.ComponentProps<"tbody">) => <tbody className={cn("[&_tr:last-child>td]:border-b-0", className)} {...props} />;
const TFoot = ({ className, ...props }: React.ComponentProps<"tfoot">) => <tfoot className={cn("bg-muted/50 font-semibold", className)} {...props} />;

function TR({ className, onClick, ...props }: React.ComponentProps<"tr">) {
  return <tr onClick={onClick} className={cn("transition-colors", onClick && "cursor-pointer hover:bg-muted/60", className)} {...props} />;
}

type Align = "left" | "right" | "center";
const alignCls = (a?: Align) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");

function TH({ className, align, ...props }: React.ComponentProps<"th"> & { align?: Align }) {
  return (
    <th
      className={cn("h-9 border-b px-3 text-[11px] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase", alignCls(align), className)}
      {...props}
    />
  );
}

/** Clickable header cell with sort indicator. `dir` is the current direction when this column is active. */
function SortableTH({ active, dir, onSort, align, children, className }: { active: boolean; dir?: "asc" | "desc"; onSort: () => void; align?: Align; children: React.ReactNode; className?: string }) {
  const Icon = !active ? ArrowUpDown : dir === "desc" ? ArrowDown : ArrowUp;
  return (
    <TH align={align} className={cn("cursor-pointer select-none hover:text-foreground", active && "text-foreground", className)} onClick={onSort} aria-sort={active ? (dir === "desc" ? "descending" : "ascending") : "none"}>
      <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
        {children}
        <Icon className={cn("size-3", active ? "text-primary" : "opacity-40")} />
      </span>
    </TH>
  );
}

function TD({ className, align, nowrap, ...props }: React.ComponentProps<"td"> & { align?: Align; nowrap?: boolean }) {
  return <td className={cn("border-b border-border/70 px-3 py-2.5 align-middle", alignCls(align), align === "right" && "tabular", nowrap && "whitespace-nowrap", className)} {...props} />;
}

export { Table, THead, TBody, TFoot, TR, TH, SortableTH, TD };
