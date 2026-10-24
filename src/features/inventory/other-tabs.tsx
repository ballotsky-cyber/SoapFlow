"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useSoap, type Batch } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/tabs";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/misc";
import { Grid, Ref, Toolbar } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

/* ---------- Warehouse comparison ---------- */

export function CompareTab() {
  const S = useSoap();
  const allW = S.allowedWh();
  const rows = S.s.products.filter((p) => p.status === "Active");
  return (
    <Card className="overflow-hidden">
      <div className="border-b px-4 py-3 text-[12.5px] text-muted-foreground">Available stock per warehouse, in operational units. Amber = at or below minimum; red = none available.</div>
      <Table>
        <THead>
          <tr>
            <TH>Product</TH>
            {allW.map((w) => <TH key={w} align="right">{S.wh(w).name}</TH>)}
            <TH align="right">Company total</TH>
          </tr>
        </THead>
        <TBody>
          {rows.map((p) => {
            let tot = 0;
            const cells = allW.map((w) => {
              const a = S.avail(w, p.sku);
              tot += a;
              return { w, a, low: a <= p.min };
            });
            return (
              <TR key={p.sku}>
                <TD className="min-w-[180px]">
                  <Ref>{p.sku}</Ref>
                  <div>{p.name}</div>
                </TD>
                {cells.map((c) => (
                  <TD key={c.w} nowrap align="right" className={cn(c.a === 0 ? "bg-danger-soft text-danger" : c.low ? "bg-warning-soft text-warning" : "")}>
                    {S.qty(p.sku, c.a)}
                  </TD>
                ))}
                <TD nowrap align="right" className="font-semibold">{S.qty(p.sku, tot)}</TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </Card>
  );
}

/* ---------- Movement ledger ---------- */

export function LedgerTab({ units }: { units: "op" | "base" }) {
  const S = useSoap();
  const s = S.s;
  const sc = S.scope();
  const costV = S.canView("cost.view");
  const [lq, setLq] = React.useState("");
  const [ltype, setLtype] = React.useState("");
  const [lpage, setLpage] = React.useState(1);
  const fq = (sku: string, n: number) => (units === "op" ? S.qty(sku, n) : S.commas(n));

  const term = lq.trim().toLowerCase();
  const led = s.movements.filter((m) => sc.includes(m.wh) && (!term || (m.sku + " " + m.ref).toLowerCase().includes(term)) && (!ltype || m.type === ltype));
  const lpg = S.paginate(led, lpage, 20);
  const ltypes = [...new Set(s.movements.map((m) => m.type))];

  return (
    <>
      <Toolbar>
        <Input icon={<Search />} value={lq} onChange={(e) => { setLq(e.target.value); setLpage(1); }} placeholder="Search SKU or reference" className="w-full sm:w-56" />
        <Select value={ltype} onValueChange={(v) => { setLtype(v); setLpage(1); }} options={[{ value: "", label: "All movement types" }, ...ltypes]} className="w-full sm:w-52" />
        <span className="text-xs text-muted-foreground">Append-only. Corrections appear as new reversing or adjustment movements.</span>
      </Toolbar>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Movement</TH>
              <TH>When</TH>
              <TH>Type</TH>
              <TH>Warehouse</TH>
              <TH>SKU</TH>
              <TH>Bucket</TH>
              <TH align="right">Quantity</TH>
              {costV && <TH align="right">Value at cost</TH>}
              <TH>Reference</TH>
              <TH>User</TH>
            </tr>
          </THead>
          <TBody>
            {lpg.rows.map((m) => (
              <TR key={m.id}>
                <TD nowrap className="font-mono text-[11.5px] text-muted-foreground">{m.id}</TD>
                <TD nowrap className="text-muted-foreground">{S.fmtDate(m.ts)}</TD>
                <TD nowrap>{m.type}</TD>
                <TD nowrap>{S.wh(m.wh).name}</TD>
                <TD nowrap className="font-mono text-[11.5px]">{m.sku}</TD>
                <TD nowrap className="text-muted-foreground">{m.bucket}</TD>
                <TD nowrap align="right" className={cn("font-medium", m.qty < 0 ? "text-danger" : "text-success")}>{(m.qty > 0 ? "+" : "") + fq(m.sku, m.qty)}</TD>
                {costV && <TD nowrap align="right" className="text-secondary-foreground">{S.money(S.valueOf(m.qty, m.cost4))}</TD>}
                <TD nowrap><Ref>{m.ref}</Ref></TD>
                <TD nowrap>{S.uname(m.user)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {!lpg.rows.length && <EmptyState title="No movements match." />}
        <Pagination {...lpg} onPage={setLpage} />
      </Card>
    </>
  );
}

/* ---------- Batches & expiry ---------- */

export type BatchStatus = "Expired" | "Near expiry" | "Quarantined" | "Sellable";

export function BatchesTab() {
  const S = useSoap();
  const s = S.s;
  const sc = S.scope();
  const warn = s.settings.expiryWarnDays;
  const [bf, setBf] = React.useState<"all" | "near" | "expired">("all");

  let bl: (Batch & { days: number; status: BatchStatus })[] = s.batches
    .filter((b) => b.qty > 0 && sc.includes(b.wh))
    .map((b) => {
      const days = S.diffDays(b.exp, S.TODAY);
      const status: BatchStatus = days < 0 ? "Expired" : days <= warn ? "Near expiry" : b.bucket === "quarantined" ? "Quarantined" : "Sellable";
      return { ...b, days, status };
    });
  if (bf === "near") bl = bl.filter((b) => b.status === "Near expiry");
  if (bf === "expired") bl = bl.filter((b) => b.status === "Expired");
  bl.sort((a, b) => a.days - b.days);

  return (
    <>
      <Toolbar>
        <SegmentedControl
          value={bf}
          onValueChange={setBf}
          items={[{ value: "all", label: "All batches" }, { value: "near", label: "Near expiry" }, { value: "expired", label: "Expired" }]}
        />
        <span className="text-xs text-muted-foreground">Warning window: {warn} days (Settings). Expired batches are blocked from dispatch and held in quarantine. FEFO picking applies.</span>
      </Toolbar>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Batch</TH>
              <TH>Product</TH>
              <TH>Warehouse</TH>
              <TH>Manufactured</TH>
              <TH>Expiry</TH>
              <TH align="right">Time to expiry</TH>
              <TH align="right">Quantity</TH>
              <TH>Bucket</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <TBody>
            {bl.map((b) => (
              <TR key={b.id}>
                <TD nowrap className="font-mono text-[11.5px]">{b.batch}</TD>
                <TD className="min-w-[160px]">{S.prod(b.sku).name}</TD>
                <TD nowrap>{S.wh(b.wh).name}</TD>
                <TD nowrap className="text-muted-foreground">{S.fmtDate(b.mfg)}</TD>
                <TD nowrap>{S.fmtDate(b.exp)}</TD>
                <TD nowrap align="right" className={b.days < 0 ? "text-danger" : b.days <= warn ? "text-warning" : "text-secondary-foreground"}>
                  {b.days < 0 ? Math.abs(b.days) + " days ago" : b.days + " days"}
                </TD>
                <TD nowrap align="right">{S.qty(b.sku, b.qty)}</TD>
                <TD nowrap className="text-muted-foreground">{b.bucket}</TD>
                <TD nowrap><StatusBadge status={b.status} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {!bl.length && <EmptyState title="No batches in this view.">Products without batch tracking are stocked without batch numbers.</EmptyState>}
      </Card>
    </>
  );
}

/* ---------- Valuation & cost history ---------- */

export function ValuationTab() {
  const S = useSoap();
  const s = S.s;
  const sc = S.scope();
  const all = S.stockRows();
  const valRows = all.filter((r) => r.sellable > 0);
  const valTotal = S.money(all.reduce((a, r) => a + r.value, 0));
  const costLog = s.costLog.filter((c) => sc.includes(c.wh)).slice(0, 12);
  const f4 = (n: number) => (n / 10000).toFixed(4);

  return (
    <Grid min={520}>
      <Card className="overflow-hidden">
        <CardHeader title="Stock valuation — moving weighted average" description="Sellable stock only. Unit costs held to 4 decimal places; values rounded to the pesewa using integer arithmetic." />
        <Table>
          <THead>
            <tr>
              <TH>Product</TH>
              <TH>Warehouse</TH>
              <TH align="right">Sellable bars</TH>
              <TH align="right">Avg cost / bar</TH>
              <TH align="right">Value</TH>
            </tr>
          </THead>
          <TBody>
            {valRows.map((r) => (
              <TR key={r.sku + r.wh}>
                <TD nowrap className="font-mono text-[11.5px]">{r.sku}</TD>
                <TD nowrap>{S.wh(r.wh).name}</TD>
                <TD nowrap align="right">{S.commas(r.sellable)}</TD>
                <TD nowrap align="right" className="font-mono text-[11.5px]">{S.cost(r.avg)}</TD>
                <TD nowrap align="right">{S.money(r.value)}</TD>
              </TR>
            ))}
            <tr>
              <TD colSpan={4} className="font-semibold">Total sellable inventory value</TD>
              <TD nowrap align="right" className="font-semibold">{valTotal}</TD>
            </tr>
          </TBody>
        </Table>
      </Card>
      <Card className="self-start overflow-hidden">
        <CardHeader title="Cost recalculation audit" description="New avg = ((existing qty × existing avg) + (received qty × receipt cost)) ÷ (existing qty + received qty)" />
        {costLog.map((c, i) => (
          <div key={c.ref + c.sku + i} className="flex flex-col gap-1 border-b px-4 py-2.5 last:border-0">
            <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-xs">
              <span><Ref className="text-xs">{c.ref}</Ref> · {c.sku} · {S.wh(c.wh).name}</span>
              <span className="text-muted-foreground">{S.fmtDate(c.ts)} · {S.uname(c.user)}</span>
            </div>
            <div className="overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-[11.5px] whitespace-nowrap text-secondary-foreground">
              {`((${S.commas(c.q0)} × ${f4(c.old)}) + (${S.commas(c.qtyIn)} × ${f4(c.cost4)})) ÷ ${S.commas(c.q0 + c.qtyIn)} = ${f4(c.newAvg)} /bar`}
            </div>
          </div>
        ))}
      </Card>
    </Grid>
  );
}
