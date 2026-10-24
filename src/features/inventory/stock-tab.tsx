"use client";

import * as React from "react";
import { PackageSearch, Search } from "lucide-react";
import { useSoap, type StockRow } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, SortableTH } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/misc";
import { InfoStrip, Ref, Toolbar } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";

export interface StockFilters {
  q: string;
  brand: string;
  status: string;
  consolidated: boolean;
  units: "op" | "base";
  sort: string;
  dir: "asc" | "desc";
  page: number;
}

export type InvRow = StockRow & { name: string; brand: string; variant: string; whName: string };

const SORT_MAP: Record<string, keyof InvRow> = {
  sku: "sku", name: "name", brand: "brand", wh: "whName", physical: "physical", reserved: "reserved", available: "available",
  damaged: "damaged", quarantined: "quarantined", inTransit: "inTransit", value: "value", reorder: "reorder", last: "last",
};

/** Filtered + sorted stock rows (all pages) for the current filters. */
export function useStockRows(f: StockFilters): InvRow[] {
  const S = useSoap();
  const sc = S.scope();
  const q = f.q.trim().toLowerCase();
  const rows: InvRow[] = S.stockRows({ consolidated: f.consolidated })
    .filter((r) => {
      const p = S.prod(r.sku);
      if (q && !(r.sku + " " + p.name).toLowerCase().includes(q)) return false;
      if (f.brand && p.brand !== f.brand) return false;
      if (f.status === "low" && !["Low", "Out of stock"].includes(r.reorder)) return false;
      if (f.status && f.status !== "low" && r.reorder !== f.status) return false;
      return true;
    })
    .map((r) => {
      const p = S.prod(r.sku);
      return { ...r, name: p.name, brand: p.brand, variant: p.variant, whName: r.wh === "ALL" ? "All (" + sc.length + ")" : S.wh(r.wh).name };
    });
  return S.sort(rows, SORT_MAP[f.sort], f.dir);
}

const COLS: [string, string, "left" | "right"][] = [
  ["sku", "SKU", "left"], ["name", "Product", "left"], ["brand", "Brand", "left"], ["variant", "Variant", "left"], ["wh", "Warehouse", "left"],
  ["physical", "Physical", "right"], ["reserved", "Reserved", "right"], ["available", "Available", "right"], ["damaged", "Damaged", "right"],
  ["quarantined", "Quarantined", "right"], ["inTransit", "In transit", "right"],
];

export function StockTab({ f, setF, rows, onOpen }: { f: StockFilters; setF: React.Dispatch<React.SetStateAction<StockFilters>>; rows: InvRow[]; onOpen: (sku: string) => void }) {
  const S = useSoap();
  const costV = S.canView("cost.view");
  const set = (o: Partial<StockFilters>) => setF((x) => ({ ...x, page: 1, ...o }));
  const fq = (sku: string, n: number) => (f.units === "op" ? S.qty(sku, n) : S.commas(n));
  const dash = <span className="text-subtle-foreground">—</span>;

  const cols = COLS.concat(costV ? [["value", "Stock value", "right"]] : []).concat([["reorder", "Reorder", "left"], ["last", "Last movement", "left"]]);
  const sortBy = (k: string) => setF((x) => ({ ...x, sort: k, dir: x.sort === k && x.dir === "asc" ? "desc" : "asc" }));

  const pg = S.paginate(rows, f.page, 15);
  const totAvail = S.commas(rows.reduce((a, r) => a + r.available, 0));
  const totValue = S.money(rows.reduce((a, r) => a + r.value, 0));
  const hasFilters = !!(f.q || f.brand || f.status);

  return (
    <>
      <Toolbar>
        <Input icon={<Search />} value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search SKU or product" className="w-full sm:w-56" />
        <Select value={f.brand} onValueChange={(v) => set({ brand: v })} options={[{ value: "", label: "All brands" }, ...S.s.brands.map((b) => b.id)]} className="w-[calc(50%-4px)] sm:w-40" />
        <Select
          value={f.status}
          onValueChange={(v) => set({ status: v })}
          options={[{ value: "", label: "Any reorder status" }, { value: "low", label: "Low or out of stock" }, "OK", "Discontinued"]}
          className="w-[calc(50%-4px)] sm:w-48"
        />
        <SegmentedControl
          value={f.consolidated ? "con" : "wh"}
          onValueChange={(v) => set({ consolidated: v === "con" })}
          items={[{ value: "wh", label: "By warehouse" }, { value: "con", label: "Consolidated" }]}
        />
        <SegmentedControl
          value={f.units}
          onValueChange={(v) => setF((x) => ({ ...x, units: v }))}
          items={[{ value: "op", label: "Ctn · pk · bar" }, { value: "base", label: "Base units (bars)" }]}
        />
        {hasFilters && (
          <Button variant="link" size="sm" onClick={() => set({ q: "", brand: "", status: "" })}>
            Clear filters
          </Button>
        )}
      </Toolbar>
      <InfoStrip>
        <span><b>Physical</b> = sellable + damaged + quarantined</span>
        <span><b>Sellable</b> = good stock that may be sold</span>
        <span><b>Available</b> = sellable − reserved − expired</span>
        <span><b>In transit</b> = inbound transfers not yet received (not in physical)</span>
      </InfoStrip>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              {cols.map(([k, l, a]) =>
                SORT_MAP[k] ? (
                  <SortableTH key={k} align={a} active={f.sort === k} dir={f.dir} onSort={() => sortBy(k)}>{l}</SortableTH>
                ) : (
                  <TH key={k} align={a}>{l}</TH>
                ),
              )}
            </tr>
          </THead>
          <TBody>
            {pg.rows.map((r) => (
              <TR key={r.sku + r.wh} onClick={() => onOpen(r.sku)}>
                <TD nowrap><Ref>{r.sku}</Ref></TD>
                <TD className="min-w-[180px]">{r.name}</TD>
                <TD nowrap>{r.brand}</TD>
                <TD nowrap className="text-muted-foreground">{r.variant}</TD>
                <TD nowrap>{r.whName}</TD>
                <TD nowrap align="right">{fq(r.sku, r.physical)}</TD>
                <TD nowrap align="right" className="text-info">{r.reserved ? fq(r.sku, r.reserved) : dash}</TD>
                <TD nowrap align="right" className="font-semibold">{fq(r.sku, r.available)}</TD>
                <TD nowrap align="right" className="text-danger">{r.damaged ? fq(r.sku, r.damaged) : dash}</TD>
                <TD nowrap align="right" className="text-warning">{r.quarantined ? fq(r.sku, r.quarantined) : dash}</TD>
                <TD nowrap align="right" className="text-violet">{r.inTransit ? fq(r.sku, r.inTransit) : dash}</TD>
                {costV && <TD nowrap align="right">{S.money(r.value)}</TD>}
                <TD nowrap><StatusBadge status={r.reorder} /></TD>
                <TD nowrap className="text-muted-foreground">{S.fmtDate(r.last)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {!pg.rows.length && (
          <EmptyState icon={<PackageSearch />} title="No stock lines match these filters">
            Try clearing the search or choosing another warehouse.
          </EmptyState>
        )}
        <Pagination
          {...pg}
          label={`${pg.label} · totals: available ${totAvail} bars${costV ? " · value " + totValue : ""}`}
          onPage={(p) => setF((x) => ({ ...x, page: p }))}
          className="flex-wrap"
        />
      </Card>
    </>
  );
}
