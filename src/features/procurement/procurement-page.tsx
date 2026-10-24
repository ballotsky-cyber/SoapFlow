"use client";

import * as React from "react";
import { ClipboardList, Plus, Search } from "lucide-react";
import { useSoap } from "@/lib/store";
import type { ModuleProps } from "@/components/app/modules";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/misc";
import { Page, PageHeader, Ref, Toolbar } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { PoDetail } from "./po-detail";
import { PoFormDialog } from "./po-form-dialog";
import { SupplierDetail, SupplierList } from "./suppliers";

export default function ProcurementPage({ view = "po" }: ModuleProps) {
  const S = useSoap();
  const s = S.s;
  const id = s.route.id;
  const [formOpen, setFormOpen] = React.useState(() => s.route.action === "new" && view === "po" && S.can("po.create"));

  const po = view === "po" && id ? s.pos.find((p) => p.id === id) : undefined;
  const sp = view === "suppliers" && id ? s.suppliers.find((x) => x.id === id) : undefined;
  const form = formOpen && <PoFormDialog onClose={() => setFormOpen(false)} />;

  if (view === "suppliers") return <Page>{sp ? <SupplierDetail sp={sp} /> : <SupplierList />}</Page>;
  if (po) return <Page><PoDetail po={po} />{form}</Page>;
  return <Page><PoList onNew={() => setFormOpen(true)} />{form}</Page>;
}

function PoList({ onNew }: { onNew: () => void }) {
  const S = useSoap();
  const s = S.s;
  const [fs, setFs] = React.useState("");
  const [fsup, setFsup] = React.useState("");
  const costV = S.canView("cost.view") || S.canView("po.create");
  const supOpts = s.suppliers.map((x) => ({ value: x.id, label: x.name }));

  const rows = s.pos
    .filter((p) => (!fs || p.status === fs) && (!fsup || p.supplier === fsup))
    .map((p) => {
      const d = S.poDelivery(p);
      const mism = s.supplierInvoices.filter((i) => i.po === p.id).some((i) => S.sinvMatch(i).length);
      return { p, d, mism, late: p.expected < S.TODAY && d !== "Fully received" && p.status === "Approved" };
    });

  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title="Purchase orders"
        description="Purchase orders never change stock. Partial deliveries and multiple receipts per PO are supported."
        actions={S.can("po.create") && <Button onClick={onNew}><Plus />New purchase order</Button>}
      />
      <Toolbar>
        <Select value={fs} onValueChange={setFs} options={[{ value: "", label: "All approval statuses" }, "Draft", "Pending Approval", "Approved", "Rejected"]} className="w-full sm:w-52" />
        <Select value={fsup} onValueChange={setFsup} options={[{ value: "", label: "All suppliers" }, ...supOpts]} className="w-full sm:w-60" />
      </Toolbar>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>PO number</TH>
              <TH>Supplier</TH>
              <TH>Destination</TH>
              <TH>Ordered</TH>
              <TH>Expected</TH>
              <TH align="right">Lines</TH>
              <TH align="right">Expected total</TH>
              <TH>Approval</TH>
              <TH>Delivery</TH>
              <TH>Match</TH>
            </tr>
          </THead>
          <TBody>
            {rows.map(({ p, d, mism, late }) => (
              <TR key={p.id} onClick={() => S.nav("purchase-orders", { id: p.id })}>
                <TD nowrap><Ref>{p.id}</Ref></TD>
                <TD className="min-w-[170px]">{S.sup(p.supplier).name}</TD>
                <TD nowrap>{S.wh(p.wh).name}</TD>
                <TD nowrap className="text-muted-foreground">{S.fmtDate(p.date)}</TD>
                <TD nowrap className={late ? "font-medium text-danger" : "text-muted-foreground"}>{S.fmtDate(p.expected)}</TD>
                <TD align="right">{p.lines.length}</TD>
                <TD nowrap align="right">{costV ? S.money(S.poTotals(p).total) : "—"}</TD>
                <TD nowrap><StatusBadge status={p.status} /></TD>
                <TD nowrap><StatusBadge status={d} /></TD>
                <TD nowrap className="text-xs font-medium text-danger">{mism ? "Invoice mismatch" : ""}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {!rows.length && <EmptyState icon={<Search />} title="No purchase orders match." />}
      </Card>
    </>
  );
}
