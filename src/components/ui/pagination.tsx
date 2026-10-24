import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

/** Footer pager driven by the store's paginate() result. */
function Pagination({ label, page, pages, hasPrev, hasNext, onPage, className }: { label: string; page: number; pages: number; hasPrev: boolean; hasNext: boolean; onPage: (p: number) => void; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-t px-4 py-2.5 text-xs text-muted-foreground", className)}>
      <span className="tabular">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="mr-1 tabular">Page {page} of {pages}</span>
        <Button variant="outline" size="icon-sm" disabled={!hasPrev} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft /></Button>
        <Button variant="outline" size="icon-sm" disabled={!hasNext} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight /></Button>
      </div>
    </div>
  );
}

export { Pagination };
