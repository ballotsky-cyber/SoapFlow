"use client";

import * as React from "react";
import { AlertOctagon, FilePen, Gauge, PackageOpen, ReceiptText, ShoppingCart, Wallet, Hourglass } from "lucide-react";
import { useSoap, type Route } from "@/lib/store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/tabs";
import { Grid, Page, PageHeader, Ref, StatCard } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { LegendDot, PairedBars } from "@/features/dashboard/charts";
import { ListRow } from "@/features/procurement/parts";

/* Sales dashboard — every figure is computed from the commercial documents in scope (no synthetic series). */

type PeriodKey = "30" | "90" | "180" | "ytd";
const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "ytd", label: "Year to date" },
];
const OPEN_FOR_INVOICING = ["Confirmed", "Ready for Collection", "Ready for Dispatch", "Partially Fulfilled", "Dispatched", "Delivered", "Completed"];
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

/** Horizontal ranked bars (single series, magnitude only). */
function RankedBars({ rows, value }: { rows: { key: string; label: React.ReactNode; v: number; sub?: string }[]; value: (v: number) => string }) {
  const mx = Math.max(1, ...rows.map((r) => r.v));
  if (!rows.length) return <div className="py-6 text-center text-[12.5px] text-muted-foreground">No invoiced sales in this period.</div>;
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <div key={r.key} className="flex flex-col gap-1" title={(typeof r.label === "string" ? r.label : r.key) + ": " + value(r.v)}>
          <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="min-w-0 truncate"><span className="mr-1.5 text-subtle-foreground tabular">{i + 1}</span>{r.label}</span>
            <span className="shrink-0 font-semibold tabular">{value(r.v)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/80" style={{ width: `${Math.max(2, (r.v / mx) * 100)}%` }} />
          </div>
          {r.sub && <span className="text-[11px] text-muted-foreground">{r.sub}</span>}
        </div>
      ))}
    </div>
  );
}

export default function SalesDashboard() {
  const S = useSoap();
  const s = S.s;
  const [pk, setPk] = React.useState<PeriodKey>("90");
  const T = S.TODAY;
  const from = pk === "ytd" ? T.slice(0, 4) + "-01-01" : S.addDays(T, -(Number(pk) - 1));
  const inP = (d?: string) => !!d && d.slice(0, 10) >= from && d.slice(0, 10) <= T;
  const sc = S.scope();
  const isc = (w: string) => sc.includes(w);
  const nav = (n: string, p?: Partial<Route>) => () => S.nav(n, p);
  const fin = S.canView("fin.view");

  const orders = s.salesOrders.filter((o) => isc(o.wh) && o.status !== "Cancelled");
  const ordersP = orders.filter((o) => inP(o.date));
  const issued = s.invoices.filter((i) => isc(i.wh) && i.status === "Issued");
  const issuedP = issued.filter((i) => inP(i.date));
  const invIds = new Set(issued.map((i) => i.id));
  const credits = s.creditNotes.filter((n) => invIds.has(n.inv));
  const creditsP = credits.filter((n) => inP(n.date));
  // Payments are not warehouse-bound: count those applied to in-scope invoices, or held on account.
  const pays = s.payments.filter((p) => p.status !== "Reversed" && (!p.alloc.length || p.alloc.some((a) => invIds.has(a.inv))));
  const paysP = pays.filter((p) => inP(p.date));
  const ar = issued.reduce((a, i) => a + S.invBal(i), 0);
  const overdue = issued.filter((i) => S.invStatus(i) === "Overdue").sort((a, b) => (a.due < b.due ? -1 : 1));
  const pendingEst = s.estimates.filter((e) => ["Draft", "Sent"].includes(S.estStatus(e)) && (!e.wh || isc(e.wh)));
  const partial = orders.filter((o) => S.soProgress(o).fulfil === "Partially fulfilled");
  const uninv = orders.filter((o) => OPEN_FOR_INVOICING.includes(o.status)).reduce((a, o) => a + S.soProgress(o).uninvoiced, 0);

  // Last 6 calendar months: invoiced (issued invoices) vs collected (payments) — two charts would split one comparison, so paired bars share one axis.
  const months: string[] = [];
  for (let k = 5; k >= 0; k--) {
    const d = new Date(T.slice(0, 7) + "-01T00:00:00Z");
    d.setUTCMonth(d.getUTCMonth() - k);
    months.push(d.toISOString().slice(0, 7));
  }
  const monthLabel = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1] + (m.slice(0, 4) !== T.slice(0, 4) ? " " + m.slice(2, 4) : "");
  const invM = months.map((m) => issued.filter((i) => i.date.startsWith(m)).reduce((a, i) => a + i.total, 0));
  const colM = months.map((m) => pays.filter((p) => p.date.startsWith(m)).reduce((a, p) => a + p.amount, 0));
  const ordM = months.map((m) => orders.filter((o) => o.date.startsWith(m)).reduce((a, o) => a + S.soTotal(o), 0));

  // Top products by invoiced net (less returns credited) and top customers by invoiced value (less credits), in the period.
  const byProd: Record<string, { v: number; q: number }> = {};
  issuedP.forEach((i) => i.lines.forEach((l) => { const x = (byProd[l.sku] ||= { v: 0, q: 0 }); x.v += S.lineCalc(l).net; x.q += l.qty; }));
  creditsP.forEach((n) => n.lines.forEach((l) => { const x = (byProd[l.sku] ||= { v: 0, q: 0 }); x.v -= l.net; x.q -= l.qty; }));
  const topProd = Object.entries(byProd).filter(([, x]) => x.v > 0).sort((a, b) => b[1].v - a[1].v).slice(0, 6).map(([sku, x]) => ({ key: sku, label: S.prod(sku).name, v: x.v, sub: sku + " · " + S.qty(sku, x.q) }));
  const byCust: Record<string, number> = {};
  issuedP.forEach((i) => { byCust[i.customer] = (byCust[i.customer] || 0) + i.total; });
  creditsP.forEach((n) => { byCust[n.customer] = (byCust[n.customer] || 0) - n.amount; });
  const topCust = Object.entries(byCust).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, v]) => ({ key: id, label: S.cust(id).name, v, sub: S.money(S.custBalance(id)) + " outstanding" }));
  const byMethod: Record<string, number> = {};
  paysP.forEach((p) => { byMethod[p.method] = (byMethod[p.method] || 0) + p.amount; });
  const methods = Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([m, v]) => ({ key: m, label: m, v, sub: paysP.filter((p) => p.method === m).length + " payments" }));
  const expiring = pendingEst.filter((e) => S.diffDays(e.expiry, T) <= 14).sort((a, b) => (a.expiry < b.expiry ? -1 : 1));

  const credP = creditsP.reduce((a, n) => a + n.amount, 0);
  const plabel = PERIODS.find((p) => p.value === pk)?.label.toLowerCase();

  return (
    <Page>
      <PageHeader
        icon={Gauge}
        title="Sales dashboard"
        description={<>{s.warehouse === "ALL" ? "All permitted warehouses (" + sc.length + ")" : S.wh(s.warehouse).name} · {S.fmtDate(from)} – {S.fmtDate(T)} · from estimates, orders, invoices and payments</>}
        actions={<SegmentedControl value={pk} onValueChange={setPk} items={PERIODS} className="no-print" />}
      />
      <Grid min={210}>
        <StatCard label="Sales orders" value={String(ordersP.length)} sub={S.money(ordersP.reduce((a, o) => a + S.soTotal(o), 0)) + " · excl. cancelled"} icon={ShoppingCart} onClick={nav("sales-orders")} />
        {fin && <StatCard label="Invoiced" value={S.moneyShort(issuedP.reduce((a, i) => a + i.total, 0))} sub={issuedP.length + " issued · " + S.money(credP) + " credited"} icon={ReceiptText} onClick={nav("invoices")} />}
        {fin && <StatCard label="Payments received" value={S.moneyShort(paysP.reduce((a, p) => a + p.amount, 0))} sub={paysP.length + " payments · excl. reversed"} icon={Wallet} onClick={nav("payments")} />}
        {fin && <StatCard label="Outstanding receivables" value={S.moneyShort(ar)} sub={issued.filter((i) => S.invBal(i) > 0).length + " open invoices"} icon={ReceiptText} onClick={nav("invoices")} />}
        {fin && <StatCard label="Overdue invoices" value={String(overdue.length)} sub={S.money(overdue.reduce((a, i) => a + S.invBal(i), 0)) + " past due"} icon={AlertOctagon} tone={overdue.length ? "danger" : "default"} onClick={nav("invoices")} />}
        {S.canView("est.view") && <StatCard label="Pending estimates" value={String(pendingEst.length)} sub={S.money(pendingEst.reduce((a, e) => a + e.total, 0)) + " quoted · draft or sent"} icon={FilePen} onClick={nav("estimates")} />}
        <StatCard label="Partially fulfilled orders" value={String(partial.length)} sub={S.commas(partial.reduce((a, o) => a + o.lines.reduce((x, l) => x + Math.max(0, l.qty - l.fulfilled), 0), 0)) + " bars still to deliver"} icon={PackageOpen} tone={partial.length ? "warning" : "default"} onClick={nav("sales-orders")} />
        {fin && <StatCard label="Uninvoiced order value" value={S.moneyShort(uninv)} sub="Confirmed orders not yet invoiced" icon={Hourglass} onClick={nav("sales-orders")} />}
      </Grid>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {fin && (
          <Card>
            <CardHeader title="Monthly invoicing vs collections" description="Issued invoices and payments received, last 6 months" />
            <CardContent className="flex flex-col gap-2">
              <PairedBars
                bars={months.map((m, k) => ({ key: m, a: invM[k], b: colM[k], highlight: k === 5, title: monthLabel(m) + ": invoiced " + S.money(invM[k]) + " · collected " + S.money(colM[k]) }))}
                yLabel={S.moneyShort}
              />
              <div className="flex justify-between gap-[3px] pl-12 text-[11px] text-muted-foreground">
                {months.map((m) => <span key={m} className="flex-1 text-center">{monthLabel(m)}</span>)}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-secondary-foreground">
                <LegendDot swatch={{ stroke: "stroke-primary", bg: "bg-primary" }} label="Invoiced" />
                <LegendDot swatch={{ stroke: "stroke-muted-foreground", bg: "bg-muted-foreground/35" }} label="Collected" />
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader title="Sales order trend" description="Value of orders taken per month (excl. cancelled)" />
          <CardContent className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex h-40 w-12 shrink-0 flex-col justify-between text-right text-[10.5px] text-subtle-foreground tabular">
                <span>{S.moneyShort(Math.max(1, ...ordM))}</span>
                <span>{S.moneyShort(Math.round(Math.max(1, ...ordM) / 2))}</span>
                <span>0</span>
              </div>
              <div className="relative flex h-40 min-w-0 flex-1 items-end gap-[3px] border-b border-border-strong">
                <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" />
                <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
                {months.map((m, k) => (
                  <div key={m} title={monthLabel(m) + ": " + S.money(ordM[k]) + " · " + orders.filter((o) => o.date.startsWith(m)).length + " orders"} className="flex h-full min-w-0 flex-1 items-end rounded-t hover:bg-muted/70">
                    <div className="mx-auto w-3/5 rounded-t-[4px] bg-primary/75" style={{ height: `${(ordM[k] / Math.max(1, ...ordM)) * 100}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between gap-[3px] pl-14 text-[11px] text-muted-foreground">
              {months.map((m) => <span key={m} className="flex-1 text-center">{monthLabel(m)}</span>)}
            </div>
          </CardContent>
        </Card>
        {fin && (
          <Card>
            <CardHeader title="Top-selling products" description={"Invoiced net of returns · " + plabel} />
            <CardContent><RankedBars rows={topProd} value={S.moneyShort} /></CardContent>
          </Card>
        )}
        {fin && (
          <Card>
            <CardHeader title="Top customers" description={"Invoiced less credit notes · " + plabel} />
            <CardContent><RankedBars rows={topCust} value={S.moneyShort} /></CardContent>
          </Card>
        )}
        {fin && (
          <Card>
            <CardHeader title="Collections by method" description={"Payments received, excl. reversed · " + plabel} />
            <CardContent><RankedBars rows={methods} value={S.moneyShort} /></CardContent>
          </Card>
        )}
        {fin && (
          <Card className="overflow-hidden">
            <CardHeader title="Overdue invoices" description="Oldest due first" />
            {overdue.slice(0, 6).map((i) => (
              <ListRow key={i.id} onClick={() => S.nav("invoices", { id: i.id })} right={<span className="text-danger">{S.money(S.invBal(i))}</span>}>
                <Ref>{i.id}</Ref> · {S.cust(i.customer).name} · due {S.fmtDate(i.due)} ({S.diffDays(T, i.due)} days)
              </ListRow>
            ))}
            {!overdue.length && <div className="px-4 py-4 text-[12.5px] text-muted-foreground">Nothing overdue.</div>}
          </Card>
        )}
        {S.canView("est.view") && (
          <Card className="overflow-hidden">
            <CardHeader title="Estimates expiring soon" description="Draft or sent, valid for 14 days or less" />
            {expiring.slice(0, 6).map((e) => (
              <ListRow key={e.id} onClick={() => S.nav("estimates", { id: e.id })} right={<span className="inline-flex items-center gap-2">{S.money(e.total)}<StatusBadge status={S.estStatus(e)} /></span>}>
                <Ref>{e.id}</Ref> · {S.cust(e.customer).name} · valid until {S.fmtDate(e.expiry)}
              </ListRow>
            ))}
            {!expiring.length && <div className="px-4 py-4 text-[12.5px] text-muted-foreground">No open estimates expire in the next 14 days.</div>}
          </Card>
        )}
      </div>
    </Page>
  );
}
