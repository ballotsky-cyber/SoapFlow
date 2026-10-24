"use client";

import { Factory } from "lucide-react";
import { useSoap, type Supplier } from "@/lib/store";
import { Card, CardHeader } from "@/components/ui/card";
import { DetailHeader, Fact, Grid, PageHeader, Ref } from "@/components/shared/page";
import { ListRow } from "./parts";

export function SupplierList() {
  const S = useSoap();
  const s = S.s;
  const fin = S.canView("fin.view") || S.canView("cost.view");
  return (
    <>
      <PageHeader icon={Factory} title="Suppliers" description="Illustrative supplier profiles · balances from supplier invoices less payments" />
      <Grid min={300}>
        {s.suppliers.map((x) => {
          const openPOs = s.pos.filter((p) => p.supplier === x.id && p.status === "Approved" && S.poDelivery(p) !== "Fully received").length;
          const bal = s.supplierInvoices.filter((i) => i.supplier === x.id).reduce((a, i) => a + i.total - i.paid, 0);
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => S.nav("suppliers", { id: x.id })}
              className="flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-card transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-pop"
            >
              <div className="flex w-full justify-between gap-2">
                <span className="text-sm font-semibold">{x.name}</span>
                <span className="font-mono text-[11px] text-subtle-foreground">{x.id}</span>
              </div>
              <div className="text-xs text-muted-foreground">{x.contact} · {x.phone}</div>
              <div className="text-xs">Brands: {x.brands.join(", ")} · Terms: Net {x.terms}</div>
              <div className="flex w-full justify-between gap-2 border-t pt-2 text-[12.5px]">
                <span className="text-muted-foreground">{openPOs} open POs</span>
                <span>Payable <b className="tabular">{fin ? S.money(bal) : "Restricted"}</b></span>
              </div>
            </button>
          );
        })}
      </Grid>
    </>
  );
}

interface PanelRow { id: string; a: string; b: string; go: () => void }

export function SupplierDetail({ sp: x }: { sp: Supplier }) {
  const S = useSoap();
  const s = S.s;
  const fin = S.canView("fin.view") || S.canView("cost.view");
  const invs = s.supplierInvoices.filter((i) => i.supplier === x.id);
  const bal = invs.reduce((a, i) => a + i.total - i.paid, 0);
  const overdue = invs.filter((i) => i.total > i.paid && i.due < S.TODAY).reduce((a, i) => a + i.total - i.paid, 0);

  const facts: { k: string; v: string; danger?: boolean }[] = [
    { k: "Contact", v: x.contact },
    { k: "Phone", v: x.phone },
    { k: "Email", v: x.email },
    { k: "Payment terms", v: "Net " + x.terms + " days" },
    ...(fin ? [{ k: "Outstanding balance", v: S.money(bal) }, { k: "Overdue", v: S.money(overdue), danger: !!overdue }] : []),
  ];

  const panels: { title: string; rows: PanelRow[] }[] = [
    { title: "Purchase history", rows: s.pos.filter((p) => p.supplier === x.id).map((p) => ({ id: p.id, a: S.fmtDate(p.date) + " · " + p.status, b: fin ? S.money(S.poTotals(p).total) : S.poDelivery(p), go: () => S.nav("purchase-orders", { id: p.id }) })) },
    { title: "Goods-receiving history", rows: s.receipts.filter((r) => r.supplier === x.id).map((r) => ({ id: r.id, a: S.fmtDate(r.arrival) + " · " + S.wh(r.wh).name, b: r.status, go: () => S.nav("receiving", { id: r.id }) })) },
    ...(fin
      ? [
          { title: "Supplier invoices", rows: invs.map((i) => ({ id: i.id, a: (i.po || "") + " · due " + S.fmtDate(i.due) + (S.sinvMatch(i).length ? " · mismatch" : ""), b: S.money(i.total) + " / bal " + S.money(i.total - i.paid), go: () => S.nav("finance", { tab: "supplier" }) })) },
          { title: "Payments made", rows: s.supplierPayments.filter((p) => p.supplier === x.id).map((p) => ({ id: p.id, a: S.fmtDate(p.date) + " · " + p.method + " · " + p.ref, b: S.money(p.amount), go: () => S.nav("finance", { tab: "supplier" }) })) },
        ]
      : []),
  ];

  return (
    <>
      <DetailHeader backLabel="Suppliers" onBack={() => S.nav("suppliers")} title={x.name} meta={`${x.id} · ${x.address}`} />
      <Grid min={180}>
        {facts.map((f) => <Fact key={f.k} k={f.k} v={<span className={f.danger ? "text-danger" : undefined}>{f.v}</span>} />)}
      </Grid>
      <Grid min={420}>
        {panels.map((p) => (
          <Card key={p.title} className="overflow-hidden">
            <CardHeader title={p.title} />
            {p.rows.map((r) => (
              <ListRow key={r.id} onClick={r.go} right={<span className="whitespace-nowrap text-muted-foreground">{r.b}</span>}>
                <Ref>{r.id}</Ref> · {r.a}
              </ListRow>
            ))}
            {!p.rows.length && <div className="px-4 py-4 text-[12.5px] text-muted-foreground">None.</div>}
          </Card>
        ))}
      </Grid>
    </>
  );
}
