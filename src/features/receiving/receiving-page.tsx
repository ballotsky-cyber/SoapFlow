"use client";

import * as React from "react";
import { PackageOpen, Search, Truck } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/misc";
import { Page, PageHeader, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { blankReceipt, fromReceipt, type WReceipt } from "./receiving-model";
import { FilterChips } from "./receiving-ui";
import { ReceiptDetail } from "./receipt-detail";
import { ReceiptWizard } from "./receipt-wizard";

const STATUSES = ["Draft", "Arrived", "Counting", "Pending Approval", "Posted", "Rejected"];

export default function ReceivingPage() {
  const S = useSoap();
  const s = S.s;
  const route = s.route;
  const [filter, setFilter] = React.useState("");
  const [q, setQ] = React.useState("");
  // Wizard working copy: null = wizard closed.
  const [w, setW] = React.useState<{ data: WReceipt; step: number } | null>(() => (route.action === "new" && S.can("rcv.create") ? { data: blankReceipt(S), step: 1 } : null));

  const g0 = route.id ? s.receipts.find((r) => r.id === route.id) : undefined;

  if (w)
    return (
      <Page>
        <ReceiptWizard initial={w.data} initialStep={w.step} onClose={() => setW(null)} />
      </Page>
    );

  if (g0)
    return (
      <Page>
        <ReceiptDetail
          key={g0.id}
          g={g0}
          onEdit={() => {
            setW({ data: fromReceipt(S, g0), step: 3 });
            if (g0.status === "Arrived") S.receiptStatus(g0.id, "Counting");
          }}
        />
      </Page>
    );

  const sc = S.scope();
  const qq = q.trim().toLowerCase();
  const inScope = s.receipts.filter((r) => sc.includes(r.wh));
  const chips = [{ k: "", label: "All", n: inScope.length }, ...STATUSES.map((x) => ({ k: x, label: x, n: inScope.filter((r) => r.status === x).length })).filter((c) => c.n || c.k === "Pending Approval")];
  const rows = inScope.filter((r) => (!filter || r.status === filter) && (!qq || (r.id + " " + r.truck + " " + r.dn + " " + S.sup(r.supplier).name).toLowerCase().includes(qq)));

  return (
    <Page>
      <PageHeader
        icon={PackageOpen}
        title="Goods receiving"
        description="Truck deliveries against purchase orders. Only posted, accepted quantities increase stock."
        actions={
          S.can("rcv.create") && (
            <Button onClick={() => setW({ data: blankReceipt(S), step: 1 })}>
              <Truck />
              Record truck arrival
            </Button>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips items={chips} value={filter} onChange={setFilter} />
        <Input icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, truck, delivery note" className="w-full sm:ml-auto sm:w-56" />
      </div>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Receipt</TH>
              <TH>Supplier / PO</TH>
              <TH>Truck</TH>
              <TH>Delivery note</TH>
              <TH>Destination</TH>
              <TH>Arrival</TH>
              <TH align="right">Lines</TH>
              <TH align="right">Expected</TH>
              <TH align="right">Counted</TH>
              <TH>Status</TH>
              <TH>Received by</TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((r) => {
              const e = r.lines.reduce((a, l) => a + l.expected, 0);
              const c = r.lines.reduce((a, l) => a + l.counted, 0);
              const sk = r.lines[0]?.sku;
              const mixed = new Set(r.lines.map((l) => S.bpc(l.sku))).size > 1;
              const fmt = (n: number) => (mixed ? S.commas(n) + " bars" : S.qty(sk, n));
              return (
                <TR key={r.id} onClick={() => S.nav("receiving", { id: r.id })}>
                  <TD nowrap><Ref>{r.id}</Ref></TD>
                  <TD className="min-w-[170px]">
                    {S.sup(r.supplier).name}
                    <div className="font-mono text-[11px] text-muted-foreground">{r.po || "No PO"}</div>
                  </TD>
                  <TD nowrap className="font-mono text-[11.5px]">{r.truck}</TD>
                  <TD nowrap className="font-mono text-[11.5px]">{r.dn}</TD>
                  <TD nowrap>{S.wh(r.wh).name}</TD>
                  <TD nowrap className="text-muted-foreground">{S.fmtDate(r.arrival)}</TD>
                  <TD align="right">{r.lines.length}</TD>
                  <TD nowrap align="right">{fmt(e)}</TD>
                  <TD nowrap align="right" className={cn(c && c !== e && "text-warning")}>{c ? fmt(c) : "—"}</TD>
                  <TD nowrap><StatusBadge status={r.status} /></TD>
                  <TD nowrap>{S.uname(r.by)}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        {!rows.length && (
          <EmptyState icon={<PackageOpen />} title="No receipts in this view">
            Record a truck arrival when a supplier delivery reaches the gate.
          </EmptyState>
        )}
      </Card>
    </Page>
  );
}
