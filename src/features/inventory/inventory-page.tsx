"use client";

import * as React from "react";
import { Boxes, Download, SlidersHorizontal } from "lucide-react";
import { useSoap } from "@/lib/store";
import type { ModuleProps } from "@/components/app/modules";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Page, PageHeader } from "@/components/shared/page";
import { StockTab, useStockRows, type StockFilters } from "./stock-tab";
import { BatchesTab, CompareTab, LedgerTab, ValuationTab } from "./other-tabs";
import { StockDrawer } from "./stock-drawer";

type TabKey = "stock" | "compare" | "ledger" | "batches" | "valuation";
const TAB_KEYS: TabKey[] = ["stock", "compare", "ledger", "batches", "valuation"];

export default function InventoryPage({ view }: ModuleProps) {
  const S = useSoap();
  const s = S.s;
  const costV = S.canView("cost.view");
  const canAdjust = S.can("inv.adjust.request");

  const [tab, setTab] = React.useState<TabKey>(() => {
    const r = S.s.route;
    if (r.tab && (TAB_KEYS as string[]).includes(r.tab)) return r.tab as TabKey;
    return r.view === "compare" || view === "compare" ? "compare" : "stock";
  });
  const [filters, setFilters] = React.useState<StockFilters>(() => ({
    q: "",
    brand: "",
    status: S.s.route.filter === "low" ? "low" : "",
    consolidated: false,
    units: "op",
    sort: "sku",
    dir: "asc",
    page: 1,
  }));
  const [open, setOpen] = React.useState<string | null>(null);

  const rows = useStockRows(filters);

  const tabs = [
    { value: "stock" as const, label: "Stock by product" },
    { value: "compare" as const, label: "Warehouse comparison" },
    { value: "ledger" as const, label: "Movement ledger" },
    { value: "batches" as const, label: "Batches & expiry" },
    ...(costV ? [{ value: "valuation" as const, label: "Valuation & cost history" }] : []),
  ];

  const exportCsv = () =>
    S.csv(
      "stock-" + (s.warehouse === "ALL" ? "all" : s.warehouse) + "-" + S.TODAY,
      ["SKU", "Product", "Brand", "Variant", "Warehouse", "Physical (bars)", "Reserved", "Available", "Damaged", "Quarantined", "In transit"]
        .concat(costV ? ["Value (GHS)"] : [])
        .concat(["Reorder", "Last movement"]),
      rows.map((r) =>
        [r.sku, r.name, r.brand, r.variant, r.whName, r.physical, r.reserved, r.available, r.damaged, r.quarantined, r.inTransit]
          .concat(costV ? [(r.value / 100).toFixed(2)] : [])
          .concat([r.reorder, r.last]),
      ),
    );

  return (
    <Page wide>
      <PageHeader
        icon={Boxes}
        title="Stock overview"
        description={`${s.warehouse === "ALL" ? "All permitted warehouses" : S.wh(s.warehouse).name} · balances are derived from posted stock movements and cannot be edited directly`}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download />
              Export CSV
            </Button>
            {canAdjust && (
              <Button onClick={() => S.nav("stockcontrol", { action: "new", kind: "Request stock adjustment" })}>
                <SlidersHorizontal />
                Request adjustment
              </Button>
            )}
          </>
        }
      />
      <Tabs value={tab} onValueChange={setTab} items={tabs} />

      {tab === "stock" && <StockTab f={filters} setF={setFilters} rows={rows} onOpen={setOpen} />}
      {tab === "compare" && <CompareTab />}
      {tab === "ledger" && <LedgerTab units={filters.units} />}
      {tab === "batches" && <BatchesTab />}
      {tab === "valuation" && costV && <ValuationTab />}

      {open && <StockDrawer sku={open} canAdjust={canAdjust} onClose={() => setOpen(null)} />}
    </Page>
  );
}
