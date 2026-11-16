"use client";

import * as React from "react";
import { Receipt } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Grid, Page, PageHeader, StatCard } from "@/components/shared/page";
import { SupplierTab } from "./payment-tables";
import { SupplierPaymentDialog } from "./supplier-payment-dialog";
import type { SupplierInvoice, SupplierPayment } from "./types";

/** Finance → Supplier payables: supplier invoices (3-way matched to PO and receipts) and supplier payments. */
export function PayablesView() {
  const S = useSoap();
  const s = S.s;
  const [sp, setSp] = React.useState(() => s.route.action === "new" && S.can("fin.record"));
  const sinv = s.supplierInvoices as SupplierInvoice[];
  const spay = s.supplierPayments as SupplierPayment[];
  const ap = sinv.reduce((a, i) => a + i.total - i.paid, 0);
  const overdue = sinv.filter((i) => i.total > i.paid && i.due < S.TODAY);
  const mism = sinv.filter((i) => S.sinvMatch(i).length);
  const month = S.TODAY.slice(0, 7);

  return (
    <Page>
      <PageHeader
        icon={Receipt}
        title="Supplier payables"
        description="Supplier invoices matched to purchase orders and goods receipts, and payments made. Customer invoices and payments are under Sales."
        actions={S.can("fin.record") && <Button onClick={() => setSp(true)}>Pay supplier</Button>}
      />
      <Grid min={200}>
        <StatCard label="Supplier payables" value={S.money(ap)} sub={sinv.filter((i) => i.total > i.paid).length + " open supplier invoices"} />
        <StatCard label="Overdue to suppliers" value={S.money(overdue.reduce((a, i) => a + i.total - i.paid, 0))} sub={overdue.length + " invoices past due"} tone={overdue.length ? "danger" : "default"} />
        <StatCard label="3-way match exceptions" value={String(mism.length)} sub="Invoiced quantity exceeds received" tone={mism.length ? "warning" : "default"} />
        <StatCard label="Paid this month" value={S.money(spay.filter((p) => p.date.startsWith(month)).reduce((a, p) => a + p.amount, 0))} sub={spay.filter((p) => p.date.startsWith(month)).length + " supplier payments"} />
      </Grid>
      <SupplierTab />
      {sp && <SupplierPaymentDialog onClose={() => setSp(false)} onSaved={() => setSp(false)} />}
    </Page>
  );
}
