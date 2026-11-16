"use client";

import * as React from "react";
import { useSoap, type DocLine, type Invoice } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { CheckboxField } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Alert, EmptyState } from "@/components/ui/misc";
import { DetailHeader, Ref } from "@/components/shared/page";
import { toMinor } from "@/features/finance/money";
import { CustomerPicker } from "@/features/sales/shared/customer-dialog";
import { blankRow, chargeRow, chargesToInput, ChargesEditor, fmtNum, LineEditor, rowFromLine, rowsTotals, rowsToInput, TotalsBlock, type ChargeRow, type LineRow } from "@/features/sales/shared/line-editor";
import { unitQty } from "@/features/sales/shared/doc-view";
import { cn } from "@/lib/utils";

interface Meta { date: string; termsDays: string; ref: string; notes: string }

/** Date, terms, reference and notes — shared by both invoice forms. */
function MetaFields({ m, set, children }: { m: Meta; set: (p: Partial<Meta>) => void; children?: React.ReactNode }) {
  const S = useSoap();
  const days = parseInt(m.termsDays, 10);
  return (
    <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {children}
      <Field label="Invoice date" required>
        <DatePicker value={m.date} max={S.TODAY} onChange={(date) => set({ date })} />
      </Field>
      <Field label="Payment terms (days)" hint={m.date && days >= 0 ? "Due " + S.fmtDate(S.addDays(m.date, days)) : undefined}>
        <Input value={m.termsDays} onChange={(e) => set({ termsDays: e.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" className="text-right tabular" />
      </Field>
      <Field label="Customer reference / PO">
        <Input value={m.ref} onChange={(e) => set({ ref: e.target.value })} />
      </Field>
      <Field label="Notes (printed)" className="sm:col-span-2 lg:col-span-4">
        <Textarea value={m.notes} onChange={(e) => set({ notes: e.target.value })} className="min-h-14" />
      </Field>
    </CardContent>
  );
}

function SubmitButtons({ onSave, disabled }: { onSave: (issue: boolean) => void; disabled?: boolean }) {
  const S = useSoap();
  return (
    <div className="flex flex-col gap-2">
      {S.can("sinv.issue") && <Button size="lg" disabled={disabled} onClick={() => onSave(true)}>Issue invoice</Button>}
      <Button variant={S.can("sinv.issue") ? "outline" : "default"} size={S.can("sinv.issue") ? "default" : "lg"} disabled={disabled} onClick={() => onSave(false)}>Save as draft</Button>
      {!S.can("sinv.issue") && <span className="text-[11.5px] text-muted-foreground">An authorised finance user issues draft invoices.</span>}
    </div>
  );
}

/** Convert a sales order (fully or partly) into an invoice, or edit a draft raised from an order. */
export function OrderInvoiceForm({ soId, invoice, onClose }: { soId: string; invoice?: Invoice; onClose: () => void }) {
  const S = useSoap();
  const s = S.s;
  const so = s.salesOrders.find((x) => x.id === soId);
  const exclude = invoice?.id;
  const [qty, setQtyState] = React.useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    so?.lines.forEach((l) => {
      const own = invoice?.lines.find((x) => x.sku === l.sku);
      const n = invoice ? (own ? own.qty : 0) : S.soLine(so, l).invoiceable;
      out[l.sku] = n ? fmtNum(n / l.factor) : "";
    });
    return out;
  });
  const [soCh, setSoCh] = React.useState<Set<number>>(() => {
    if (!so) return new Set();
    if (invoice) return new Set(invoice.charges.filter((c) => c.soCharge != null).map((c) => c.soCharge as number));
    const used = S.soChargesUsed(so);
    return new Set(so.charges.map((_, k) => k).filter((k) => !used.has(k)));
  });
  const [extra, setExtraState] = React.useState<ChargeRow[]>(() => (invoice ? invoice.charges.filter((c) => c.soCharge == null).map(chargeRow) : []));
  const [m, setMState] = React.useState<Meta>(() =>
    invoice ? { date: invoice.date, termsDays: String(invoice.termsDays), ref: invoice.ref, notes: invoice.notes } : { date: S.TODAY, termsDays: String(so?.termsDays ?? 0), ref: so?.ref || "", notes: "" },
  );
  const [err, setErr] = React.useState("");
  const setM = (p: Partial<Meta>) => { setMState((x) => ({ ...x, ...p })); setErr(""); };

  if (!so) return <EmptyState title="Sales order not found." action={<Button variant="outline" onClick={onClose}>Back</Button>} />;

  const used = S.soChargesUsed(so, exclude);
  const rows = so.lines.map((l) => {
    const r = S.soLine(so, l, exclude);
    const n = parseFloat(qty[l.sku] || "") || 0;
    const base = Math.round(n * l.factor);
    return { l, r, base, over: base > r.invoiceable, bad: n < 0 || Math.abs(base - n * l.factor) > 1e-6 };
  });
  const preview: DocLine[] = rows.filter((x) => x.base > 0).map((x) => ({ ...x.l, qty: x.base, uqty: x.base / x.l.factor }));
  const chosen = so.charges.map((c, k) => ({ ...c, k })).filter((c) => soCh.has(c.k));
  const extraParsed = extra.map((c) => ({ label: c.label, amount: toMinor(c.amount) || 0 }));
  const t = S.docTotals({ lines: preview, charges: [...chosen, ...extraParsed] });
  const nothing = rows.every((x) => !x.r.invoiceable) && so.charges.every((_, k) => used.has(k));
  const basis = s.settings.invoiceBasis;

  const setQty = (sku: string, v: string) => { setQtyState((x) => ({ ...x, [sku]: v.replace(/[^0-9.]/g, "") })); setErr(""); };
  const all = () => setQtyState(Object.fromEntries(rows.map((x) => [x.l.sku, x.r.invoiceable ? fmtNum(x.r.invoiceable / x.l.factor) : ""])));
  const toggle = (k: number, on: boolean) => { setSoCh((x) => { const n = new Set(x); if (on) n.add(k); else n.delete(k); return n; }); setErr(""); };

  const save = (issue: boolean) => {
    const bad = rows.find((x) => x.over || x.bad);
    if (bad) return setErr(`${bad.l.name}: enter at most ${unitQty(S, bad.l.unit, bad.r.invoiceable / bad.l.factor)} (whole ${S.unitDef(S.prod(bad.l.sku).baseUnit).plural}).`);
    const r = S.invoiceSave(
      { id: invoice?.id, so: so.id, date: m.date, termsDays: parseInt(m.termsDays, 10) || 0, ref: m.ref, notes: m.notes, lines: rows.filter((x) => x.base > 0).map((x) => ({ sku: x.l.sku, qty: x.base })), soCharges: [...soCh], charges: chargesToInput(extra) },
      issue,
    );
    if (!r.ok) return setErr(r.error);
    S.result(r, issue ? "Invoice issued" : "Draft invoice saved");
    S.nav("invoices", { id: r.ref });
  };

  return (
    <>
      <DetailHeader
        backLabel={invoice ? invoice.id : so.id}
        onBack={onClose}
        reference={<Ref onClick={() => S.nav("sales-orders", { id: so.id })}>{so.id}</Ref>}
        title={(invoice ? "Edit draft invoice " + invoice.id : "Convert to invoice") + " · " + so.party.name}
        meta={"Customer, prices, discounts and taxes come from the order · " + S.wh(so.wh).name + " · " + (so.terms === "Credit" ? "Credit · Net " + so.termsDays : "Cash")}
      />
      {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
      <Alert tone="info">
        {basis === "delivered"
          ? "Invoicing follows delivered quantities (Settings): only goods already dispatched can be invoiced. "
          : "Orders can be invoiced before or after delivery (Settings). "}
        Adjust the quantities to invoice part of the order — the rest stays open for later invoices. Quantities already invoiced (or held by draft invoices) cannot be invoiced twice.
      </Alert>
      {nothing && !invoice && <Alert tone="warning">Nothing on {so.id} is currently invoiceable.</Alert>}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Card className="overflow-hidden">
            <CardHeader
              title="Quantities to invoice"
              actions={
                <div className="flex gap-1.5">
                  <Button size="xs" variant="outline" onClick={all}>Invoice all remaining</Button>
                  <Button size="xs" variant="ghost" onClick={() => setQtyState({})}>Clear</Button>
                </div>
              }
            />
            <Table>
              <THead>
                <tr>
                  <TH>Product</TH>
                  <TH align="right">Ordered</TH>
                  <TH align="right">Delivered</TH>
                  <TH align="right">Invoiced</TH>
                  <TH align="right">Invoiceable</TH>
                  <TH align="right">Invoice now</TH>
                  <TH align="right">Amount</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map(({ l, r, base, over, bad }) => {
                  const u = (n: number) => unitQty(S, l.unit, n / l.factor);
                  return (
                    <tr key={l.sku}>
                      <TD className="min-w-[180px]">
                        <div className="font-medium">{l.name}</div>
                        <div className="text-[11px] text-muted-foreground">{S.money(l.uprice)} per {S.unitDef(l.unit).name.toLowerCase()}{l.discPct ? " · −" + fmtNum(l.discPct) + "%" : ""}{l.taxRate ? " · tax " + fmtNum(l.taxRate / 100) + "%" : ""}</div>
                      </TD>
                      <TD nowrap align="right">{u(r.ordered)}</TD>
                      <TD nowrap align="right">{r.fulfilled ? u(r.fulfilled) : "—"}</TD>
                      <TD nowrap align="right">{r.invoiced ? u(r.invoiced) : "—"}</TD>
                      <TD nowrap align="right" className="font-semibold text-primary">{u(r.invoiceable)}</TD>
                      <TD nowrap align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Input value={qty[l.sku] || ""} onChange={(e) => setQty(l.sku, e.target.value)} disabled={!r.invoiceable} inputMode="decimal" placeholder="0" aria-label={"Invoice quantity for " + l.name} aria-invalid={over || bad || undefined} className="h-8 w-[84px] text-right tabular" />
                          <span className="w-7 text-left text-[11px] text-muted-foreground">{l.unit}</span>
                        </div>
                        <div className={cn("mt-0.5 text-[11px]", over || bad ? "text-danger" : "text-subtle-foreground")}>{over ? "exceeds invoiceable" : bad ? "not a whole " + S.unitDef(S.prod(l.sku).baseUnit).name.toLowerCase() : base ? S.qty(l.sku, base) : ""}</div>
                      </TD>
                      <TD nowrap align="right" className="font-medium">{base ? S.money(S.lineCalc(l, base).total) : "—"}</TD>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          </Card>
          <Card>
            <CardHeader title="Charges" />
            <CardContent className="flex flex-col gap-3">
              {so.charges.length > 0 && (
                <div className="flex flex-col gap-2">
                  {so.charges.map((c, k) =>
                    used.has(k) ? (
                      <div key={k} className="text-[12.5px] text-muted-foreground">{c.label} · {S.money(c.amount)} — already invoiced</div>
                    ) : (
                      <CheckboxField key={k} label={<>{c.label} · <span className="tabular">{S.money(c.amount)}</span></>} description="Order charge — can be invoiced once" checked={soCh.has(k)} onCheckedChange={(v) => toggle(k, v === true)} />
                    ),
                  )}
                </div>
              )}
              <ChargesEditor rows={extra} onChange={(r) => { setExtraState(r); setErr(""); }} />
            </CardContent>
          </Card>
          <Card>
            <MetaFields m={m} set={setM} />
          </Card>
        </div>
        <Card className="lg:sticky lg:top-4">
          <CardHeader title="Invoice summary" />
          <CardContent className="flex flex-col gap-3">
            <TotalsBlock t={t} totalLabel="Invoice total" />
            <div className="text-[11.5px] text-muted-foreground">Invoicing never moves stock — goods leave through the dispatch workflow.</div>
            <SubmitButtons onSave={save} disabled={nothing && !invoice} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/** Invoice created without an estimate or sales order (billing only). Also edits such drafts. */
export function DirectInvoiceForm({ invoice, onClose }: { invoice?: Invoice; onClose: () => void }) {
  const S = useSoap();
  const allowed = S.allowedWh();
  const [customer, setCustomer] = React.useState(invoice?.customer || "");
  const [wh, setWh] = React.useState(invoice?.wh || S.scope()[0]);
  const [rows, setRowsState] = React.useState<LineRow[]>(() => (invoice ? invoice.lines.map(rowFromLine) : [blankRow()]));
  const [charges, setChargesState] = React.useState<ChargeRow[]>(() => (invoice ? invoice.charges.map(chargeRow) : []));
  const [m, setMState] = React.useState<Meta>(() => (invoice ? { date: invoice.date, termsDays: String(invoice.termsDays), ref: invoice.ref, notes: invoice.notes } : { date: S.TODAY, termsDays: "0", ref: "", notes: "" }));
  const [err, setErr] = React.useState("");
  const setM = (p: Partial<Meta>) => { setMState((x) => ({ ...x, ...p })); setErr(""); };
  const t = rowsTotals(S, rows, charges);

  const pickCustomer = (id: string) => { setCustomer(id); setM({ termsDays: String(S.cust(id).terms || 0) }); };
  const save = (issue: boolean) => {
    const r = S.invoiceSave({ id: invoice?.id, customer, wh, date: m.date, termsDays: parseInt(m.termsDays, 10) || 0, ref: m.ref, notes: m.notes, lines: rowsToInput(rows), charges: chargesToInput(charges) }, issue);
    if (!r.ok) return setErr(r.error);
    S.result(r, issue ? "Invoice issued" : "Draft invoice saved");
    S.nav("invoices", { id: r.ref });
  };

  return (
    <>
      <DetailHeader backLabel="Cancel" onBack={onClose} reference={invoice?.id} title={invoice ? "Edit draft invoice" : "Create invoice"} meta="Direct invoice — not linked to an estimate or sales order." />
      {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
      <Alert tone="info">A direct invoice bills the customer only. If goods must leave a warehouse, create a fulfilment order from the issued invoice — stock is deducted through dispatch, never by the invoice.</Alert>
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Card>
            <MetaFields m={m} set={setM}>
              <Field label="Customer" required className="sm:col-span-2">
                <CustomerPicker value={customer} onChange={(v) => { pickCustomer(v); setErr(""); }} />
              </Field>
              <Field label="Warehouse (sale booked to)" required className="sm:col-span-2">
                <Select value={wh} onValueChange={(v) => { setWh(v); setErr(""); }} options={allowed.map((w) => ({ value: w, label: S.wh(w).name }))} />
              </Field>
            </MetaFields>
          </Card>
          <Card>
            <CardHeader title="Products" description="Prices default from the catalogue; adjust them if agreed. Discounts beyond the limit need an authorised issuer." />
            <CardContent>
              <LineEditor rows={rows} onChange={(r) => { setRowsState(r); setErr(""); }} wh={wh} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Additional charges" />
            <CardContent>
              <ChargesEditor rows={charges} onChange={(c) => { setChargesState(c); setErr(""); }} />
            </CardContent>
          </Card>
        </div>
        <Card className="lg:sticky lg:top-4">
          <CardHeader title="Invoice summary" />
          <CardContent className="flex flex-col gap-3">
            <TotalsBlock t={t} totalLabel="Invoice total" />
            {customer && <div className="text-[11.5px] text-muted-foreground">Due {S.fmtDate(S.addDays(m.date || S.TODAY, parseInt(m.termsDays, 10) || 0))} · {S.cust(customer).name} owes {S.money(S.custBalance(customer))} today.</div>}
            <SubmitButtons onSave={save} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
