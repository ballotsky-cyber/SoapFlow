"use client";

import * as React from "react";
import { useSoap, type SalesOrder } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { SegmentedControl } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { DetailHeader } from "@/components/shared/page";
import { Totals } from "./parts";
import { CustomerPicker } from "./shared/customer-dialog";
import { blankRow, chargeRow, chargesToInput, ChargesEditor, LineEditor, previewLine, rowFromLine, rowsTotals, rowsToInput, TotalsBlock, type ChargeRow, type LineRow } from "./shared/line-editor";

interface FormState { customer: string; walkin: string; wh: string; method: string; terms: string; address: string; expected: string; ref: string; notes: string }

const WALKIN = "CUS-006";

/** New or edited sales order (POST/PUT /api/sales-orders). Availability is re-checked by the engine on confirmation. */
export function OrderForm({ order, onClose }: { order?: SalesOrder; onClose: () => void }) {
  const S = useSoap();
  const s = S.s;
  const [f, setFState] = React.useState<FormState>(() =>
    order
      ? { customer: order.customer, walkin: order.walkin, wh: order.wh, method: order.method, terms: order.terms, address: order.address, expected: order.expected, ref: order.ref, notes: order.notes }
      : { customer: "", walkin: "", wh: S.scope()[0], method: "Collection", terms: "Cash", address: "", expected: "", ref: "", notes: "" },
  );
  const [rows, setRowsState] = React.useState<LineRow[]>(() => (order ? order.lines.map(rowFromLine) : [blankRow()]));
  const [charges, setChargesState] = React.useState<ChargeRow[]>(() => (order ? order.charges.map(chargeRow) : []));
  const [err, setErr] = React.useState("");
  const setF = (patch: Partial<FormState>) => { setFState((x) => ({ ...x, ...patch })); setErr(""); };
  const setRows = (r: LineRow[]) => { setRowsState(r); setErr(""); };
  const setCharges = (c: ChargeRow[]) => { setChargesState(c); setErr(""); };

  const fin = S.canView("fin.view") || S.canView("so.approve");
  const cust = f.customer ? S.cust(f.customer) : null;
  const t = rowsTotals(S, rows, charges);
  const noCredit = !cust || cust.limit === 0;
  const bal = cust ? S.custBalance(cust.id) : 0;
  const creditOk = !!cust && bal + t.total <= cust.limit;
  const maxDisc = s.settings.maxDiscountPct;
  const discOver = rows.some((r) => {
    const l = previewLine(S, r);
    return !!l && l.qty > 0 && S.effDisc(l) > maxDisc;
  });
  const short = rows.filter((r) => { const l = previewLine(S, r); return !!l && l.qty > S.avail(f.wh, r.sku); }).length;
  const reconfirm = order?.status === "Confirmed";

  const pickCustomer = (id: string) => {
    const c = S.cust(id);
    setF({ customer: id, terms: c.limit ? "Credit" : "Cash", address: c.delivAddr || c.address || "" });
  };
  const onTerms = (v: string) => {
    if (v === "Credit" && noCredit) return S.toast("warn", "Credit not available", (cust ? cust.name : "This customer") + " has no credit facility.");
    setF({ terms: v });
  };
  const go = (confirm: boolean) => {
    const r = S.soSave({ id: order?.id, customer: f.customer, walkin: f.walkin, wh: f.wh, method: f.method, terms: f.terms, address: f.address, expected: f.expected, ref: f.ref, notes: f.notes, lines: rowsToInput(rows), charges: chargesToInput(charges) }, confirm);
    if (!r.ok) return setErr(r.error);
    S.result(r, order ? "Order updated" : confirm ? "Order created" : "Draft saved");
    S.nav("sales-orders", { id: r.ref });
  };

  return (
    <>
      <DetailHeader
        backLabel="Cancel"
        onBack={onClose}
        reference={order?.id}
        title={order ? "Edit sales order" : "New sales order"}
        meta={reconfirm ? "This order is confirmed: saving releases its reservation and confirms again against current stock." : "Confirming reserves available stock. Physical stock only reduces at dispatch."}
      />
      {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Card>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Customer" required>
                <CustomerPicker value={f.customer} onChange={pickCustomer} />
              </Field>
              {f.customer === WALKIN && (
                <Field label="Walk-in name & phone" required>
                  <Input value={f.walkin} onChange={(e) => setF({ walkin: e.target.value })} placeholder="Name · phone" />
                </Field>
              )}
              <Field label="Fulfilment warehouse" required>
                <Select value={f.wh} onValueChange={(wh) => setF({ wh })} options={S.allowedWh().map((w) => ({ value: w, label: S.wh(w).name }))} />
              </Field>
              <Field label="Fulfilment">
                <SegmentedControl value={f.method} onValueChange={(method) => setF({ method })} items={[{ value: "Collection", label: "Warehouse collection" }, { value: "Delivery", label: "Delivery" }]} className="w-full [&>*]:flex-1 [&>*]:justify-center" />
              </Field>
              <Field label="Payment terms">
                <SegmentedControl value={f.terms} onValueChange={onTerms} items={[{ value: "Cash", label: "Cash" }, { value: "Credit", label: <span className={noCredit ? "text-subtle-foreground" : undefined}>Credit{cust && cust.limit ? " · Net " + cust.terms : ""}</span> }]} className="w-full [&>*]:flex-1 [&>*]:justify-center" />
              </Field>
              <Field label="Expected delivery">
                <DatePicker value={f.expected} min={order ? order.date : S.TODAY} clearable placeholder="Not set" onChange={(expected) => setF({ expected })} />
              </Field>
              <Field label="Customer reference / PO">
                <Input value={f.ref} onChange={(e) => setF({ ref: e.target.value })} />
              </Field>
              {f.method === "Delivery" && (
                <Field label="Delivery address" required className="sm:col-span-2 lg:col-span-3">
                  <Input value={f.address} onChange={(e) => setF({ address: e.target.value })} />
                </Field>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Order lines" description={`Discounts above ${maxDisc}% (including price reductions) need approval by an authorised manager.`} />
            <CardContent>
              <LineEditor rows={rows} onChange={setRows} wh={f.wh} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Additional charges" />
            <CardContent>
              <ChargesEditor rows={charges} onChange={setCharges} />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Field label="Notes">
                <Textarea value={f.notes} onChange={(e) => setF({ notes: e.target.value })} className="min-h-14" />
              </Field>
            </CardContent>
          </Card>
        </div>
        <Card className="lg:sticky lg:top-4">
          <CardHeader title="Review" />
          <CardContent className="flex flex-col gap-3">
            <TotalsBlock t={t} totalLabel="Order total" />
            <Totals rows={[{ k: "Payment", v: f.terms === "Cash" ? "Cash on " + (f.method === "Collection" ? "collection" : "delivery") : "Credit · Net " + (cust ? cust.terms : "—") }]} />
            {f.terms === "Credit" && cust && fin && (
              <Alert tone={creditOk ? "success" : "warning"}>
                Credit check: outstanding {S.money(bal)} + this order {S.money(t.total)} vs limit {S.money(cust.limit)}. {creditOk ? "Within limit." : "Exceeds limit — the order will go to Pending Approval."}
              </Alert>
            )}
            {discOver && !S.can("so.approve") && <Alert tone="warning">A line is discounted beyond {maxDisc}% — the order will need approval.</Alert>}
            {short > 0 && (
              <Alert tone="warning">
                {short} line(s) exceed available stock at {S.wh(f.wh).name}. {s.settings.allowBackorders ? "The shortfall will be backordered: available stock is reserved now, the rest when stock arrives." : "Confirmation will be blocked — backorders are disabled in Settings."}
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              {reconfirm ? (
                <Button size="lg" onClick={() => go(true)}>Save &amp; re-confirm</Button>
              ) : (
                <>
                  <Button size="lg" onClick={() => go(true)}>Confirm order &amp; reserve stock</Button>
                  <Button variant="outline" onClick={() => go(false)}>Save as draft</Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
