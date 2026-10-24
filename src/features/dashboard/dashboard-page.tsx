"use client";

import * as React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeftRight,
  ChevronRight,
  Clock,
  FileText,
  Hourglass,
  LayoutDashboard,
  type LucideIcon,
  PackageOpen,
  PiggyBank,
  ReceiptText,
  Shapes,
  ShoppingCart,
  TrendingUp,
  Truck,
  Wallet,
  Warehouse,
} from "lucide-react";
import { useSoap, type Route } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/tabs";
import { Grid, Page, PageHeader, Ref, StatCard } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { AWAITING_STATUSES, FinanceCharts, StockCharts } from "./dashboard-charts";
import { RecentActivity } from "./recent-activity";
import { IconTitle, SectionTitle } from "./section-title";

type PeriodKey = "1" | "7" | "30" | "90";

const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: "1", label: "Today" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

interface Kpi {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  go: () => void;
  delta?: number | null;
}

export default function DashboardPage() {
  const S = useSoap();
  const s = S.s;
  const [periodKey, setPeriodKey] = React.useState<PeriodKey>("30");
  const per = Number(periodKey);

  const sc = S.scope();
  const isc = (w: string) => sc.includes(w);
  const T = S.TODAY;
  const isDriver = S.user().role === "driver";
  const fin = S.canView("rpt.fin");
  const costV = S.canView("cost.view");
  const readonly = !!S.role().readonly;

  const P = S.period(per, sc);
  const prevAll = S.period(per * 2, sc);
  const prev = { rev: prevAll.rev - P.rev, gp: prevAll.gp - P.gp };
  const delta = (a: number, b: number) => (b ? Math.round(((a - b) * 1000) / Math.abs(b)) / 10 : null);
  const rows = S.stockRows();
  const low = rows.filter((r) => ["Low", "Out of stock"].includes(r.reorder));
  const stockVal = rows.reduce((a, r) => a + r.value, 0);
  const today = S.period(1, sc);
  const nav = (n: string, p?: Partial<Route>) => () => S.nav(n, p);

  const pendingRcv = s.receipts.filter((r) => isc(r.wh) && ["Arrived", "Counting", "Pending Approval"].includes(r.status));
  const openPO = s.pos.filter((p) => p.status === "Approved" && S.poDelivery(p) !== "Fully received" && isc(p.wh));
  const awaiting = s.salesOrders.filter((o) => isc(o.wh) && AWAITING_STATUSES.includes(o.status));
  const trIn = s.transfers.filter((t) => isc(t.to) && ["In Transit", "Partially Received"].includes(t.status));
  const ar = s.invoices.filter((i) => isc(i.wh)).reduce((a, i) => a + S.invBal(i), 0);
  const overdue = s.invoices.filter((i) => isc(i.wh) && S.invStatus(i) === "Overdue");
  const ap = s.supplierInvoices.reduce((a: number, i) => a + i.total - i.paid, 0);
  const activeProducts = s.products.filter((p) => p.status === "Active");
  const plabel = ({ 1: "today", 7: "last 7 days", 30: "last 30 days", 90: "last 90 days" } as Record<number, string>)[per];

  const groups: { label: string; items: Kpi[] }[] = [];
  if (S.canView("inv.view"))
    groups.push({
      label: "Stock & operations",
      items: [
        costV ? { label: "Sellable stock value", value: S.moneyShort(stockVal), sub: "At weighted-average cost", icon: Wallet, go: nav("reports", { report: "valuation" }) } : null,
        { label: "Products / active variants", value: s.products.length + " / " + activeProducts.length, sub: s.brands.length + " brands · " + (s.products.length - activeProducts.length) + " discontinued", icon: Shapes, go: nav("catalogue") },
        { label: "Active warehouses", value: String(sc.length), sub: sc.map((w) => S.wh(w).city).join(", "), icon: Warehouse, go: nav("inventory", { view: "compare" }) },
        { label: "Low-stock lines", value: String(low.length), sub: low.filter((r) => r.reorder === "Out of stock").length + " out of stock", icon: AlertTriangle, go: nav("inventory", { filter: "low" }) },
        { label: "Goods received today", value: Math.round(today.rcv / 100) / 10 + "k bars", sub: s.receipts.filter((r) => isc(r.wh) && r.status === "Posted" && String(r.postedAt || "").startsWith(T)).length + " receipts posted", icon: PackageOpen, go: nav("receiving") },
        { label: "Goods dispatched today", value: Math.round(today.dsp / 100) / 10 + "k bars", sub: s.dispatches.filter((d) => isc(d.wh) && String(d.dispatchedAt || "").startsWith(T)).length + " dispatches", icon: Truck, go: nav("dispatch") },
      ].filter((x): x is Kpi => !!x),
    });
  if (S.canView("inv.view") || S.canView("so.view"))
    groups.push({
      label: "Pipeline",
      items: [
        S.canView("rcv.view") ? { label: "Pending purchase receipts", value: String(pendingRcv.length), sub: openPO.length + " approved POs still open", icon: Clock, go: nav("receiving") } : null,
        S.canView("so.view") ? { label: "Orders awaiting fulfilment", value: String(awaiting.length), sub: awaiting.filter((o) => o.status === "Pending Approval").length + " need approval", icon: ShoppingCart, go: nav("sales-orders") } : null,
        S.canView("trf.view")
          ? { label: "Transfers awaiting receipt", value: String(trIn.length), sub: S.commas(trIn.reduce((a, t) => a + t.lines.reduce((x, l) => x + l.disp - l.recv, 0), 0)) + " bars in transit", icon: ArrowLeftRight, go: nav("transfers") }
          : null,
      ].filter((x): x is Kpi => !!x),
    });
  if (fin)
    groups.push({
      label: "Financial — " + plabel,
      items: [
        { label: "Sales revenue (invoiced)", value: S.moneyShort(P.rev), sub: "vs previous period", icon: TrendingUp, go: nav("reports", { report: "pnl" }), delta: delta(P.rev, prev.rev) },
        { label: "Gross profit", value: S.moneyShort(P.gp), sub: P.margin + "% margin", icon: PiggyBank, go: nav("reports", { report: "pnl" }), delta: delta(P.gp, prev.gp) },
        { label: "Outstanding customer balances", value: S.moneyShort(ar), sub: overdue.length + " overdue invoices", icon: FileText, go: nav("finance") },
        { label: "Outstanding supplier balances", value: S.moneyShort(ap), sub: s.supplierInvoices.filter((i) => i.total > i.paid).length + " open supplier invoices", icon: ReceiptText, go: nav("finance", { tab: "supplier" }) },
      ],
    });

  const approvals = S.approvals().slice(0, 7);
  const exceptions = S.exceptions().slice(0, 6);
  const myDeliveries = s.dispatches
    .filter((d) => d.driver === s.currentUser && ["Assigned", "Out for delivery"].includes(d.status))
    .map((d) => {
      const o = s.salesOrders.find((x) => x.id === d.so);
      return { id: d.id, customer: o ? S.cust(o.customer).name : "—", address: o?.address ?? "", status: d.status };
    });

  return (
    <Page>
      <PageHeader
        icon={LayoutDashboard}
        title={isDriver ? "Driver dashboard" : "Operations dashboard"}
        description={
          <>
            {s.warehouse === "ALL" ? "All permitted warehouses (" + sc.length + ")" : S.wh(s.warehouse).name} · {S.fmtDate(T)} · <span className="text-warning">illustrative demonstration figures</span>
          </>
        }
        actions={<SegmentedControl value={periodKey} onValueChange={setPeriodKey} items={PERIODS} className="no-print" />}
      />

      {isDriver && (
        <Card className="overflow-hidden">
          <CardHeader title="My deliveries today" />
          {myDeliveries.map((d) => (
            <button key={d.id} type="button" onClick={() => S.nav("dispatch", { id: d.id })} className="flex w-full cursor-pointer items-center justify-between gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-muted/60">
              <span className="flex min-w-0 flex-col gap-0.5">
                <Ref>{d.id}</Ref>
                <span className="font-medium">{d.customer}</span>
                <span className="text-xs text-muted-foreground">{d.address}</span>
              </span>
              <StatusBadge status={d.status} />
            </button>
          ))}
          {!myDeliveries.length && <div className="px-4 py-6 text-center text-muted-foreground">No deliveries assigned to you right now.</div>}
        </Card>
      )}

      {groups
        .filter((g) => g.items.length)
        .map((g) => (
          <section key={g.label} className="flex flex-col gap-2.5">
            <SectionTitle>{g.label}</SectionTitle>
            <Grid min={220}>
              {g.items.map((k) => (
                <StatCard
                  key={k.label}
                  label={k.label}
                  value={k.value}
                  icon={k.icon}
                  onClick={k.go}
                  sub={
                    <>
                      {k.delta != null && per > 1 && (
                        <>
                          <span className={k.delta >= 0 ? "font-semibold text-success" : "font-semibold text-danger"}>{(k.delta >= 0 ? "▲ " : "▼ ") + Math.abs(k.delta) + "%"}</span>
                          {" · "}
                        </>
                      )}
                      {k.sub}
                    </>
                  }
                />
              ))}
            </Grid>
          </section>
        ))}

      {fin && <FinanceCharts per={per} plabel={plabel} />}
      {S.canView("inv.view") && <StockCharts per={per} />}

      <Grid min={420} className="gap-3.5">
        <Card className="overflow-hidden">
          <CardHeader title={<IconTitle icon={Hourglass} tone="warning">Pending approvals</IconTitle>} actions={<span className="text-[11.5px] text-muted-foreground">{readonly ? "Read-only role" : "Items you can act on"}</span>} />
          {approvals.map((a, i) => (
            <button key={a.ref + i} type="button" onClick={() => S.nav(a.route.name, a.route)} className="flex w-full cursor-pointer items-center gap-2.5 border-b px-4 py-2.5 text-left last:border-0 hover:bg-muted/60">
              <Badge tone="amber">{a.type}</Badge>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[12.5px]">{a.title}</span>
                <span className="truncate text-[11.5px] text-muted-foreground"><span className="font-mono">{a.ref}</span> · {a.sub}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-subtle-foreground" />
            </button>
          ))}
          {!approvals.length && <div className="px-4 py-6 text-center text-[12.5px] text-muted-foreground">{readonly ? "Auditors can review approvals in the audit trail but cannot act on them." : "Nothing awaiting your approval."}</div>}
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title={<IconTitle icon={AlertOctagon} tone="danger">Receiving and delivery exceptions</IconTitle>} actions={<span className="text-[11.5px] text-muted-foreground">Last 10 days</span>} />
          {exceptions.map((e, i) => (
            <button key={e.ref + i} type="button" onClick={() => S.nav(e.route.name, e.route)} className="flex w-full cursor-pointer items-center gap-2.5 border-b px-4 py-2.5 text-left last:border-0 hover:bg-muted/60">
              <Badge tone="red">{e.kind}</Badge>
              <span className="flex min-w-0 flex-1 flex-col">
                <Ref>{e.ref}</Ref>
                <span className="text-[12.5px]">{e.text}</span>
              </span>
            </button>
          ))}
          {!exceptions.length && <div className="px-4 py-6 text-center text-[12.5px] text-muted-foreground">No open exceptions in this scope.</div>}
        </Card>
      </Grid>

      {S.canView("inv.view") && <RecentActivity low={low} />}
    </Page>
  );
}
