"use client";

import * as React from "react";
import { useSoap, type Estimate } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { DetailHeader } from "@/components/shared/page";
import { CustomerPicker } from "@/features/sales/shared/customer-dialog";
import { blankRow, chargeRow, chargesToInput, ChargesEditor, LineEditor, rowFromLine, rowsTotals, rowsToInput, TotalsBlock, type ChargeRow, type LineRow } from "@/features/sales/shared/line-editor";

interface FormState { customer: string; wh: string; expiry: string; ref: string; notes: string; terms: string }

/** Create or revise an estimate (POST/PUT /api/estimates). Only draft and sent estimates are editable. */
export function EstimateForm({ estimate, onClose }: { estimate?: Estimate; onClose: () => void }) {
  const S = useSoap();
  const s = S.s;
  const [f, setFState] = React.useState<FormState>(() =>
    estimate
      ? { customer: estimate.customer, wh: estimate.wh, expiry: estimate.expiry, ref: estimate.ref, notes: estimate.notes, terms: estimate.terms }
      : { customer: "", wh: "", expiry: S.addDays(S.TODAY, s.settings.estimateValidityDays || 30), ref: "", notes: "", terms: s.settings.termsEstimate },
  );
  const [rows, setRowsState] = React.useState<LineRow[]>(() => (estimate ? estimate.lines.map(rowFromLine) : [blankRow()]));
  const [charges, setChargesState] = React.useState<ChargeRow[]>(() => (estimate ? estimate.charges.map(chargeRow) : []));
  const [err, setErr] = React.useState("");
  const setF = (patch: Partial<FormState>) => { setFState((x) => ({ ...x, ...patch })); setErr(""); };
  const setRows = (r: LineRow[]) => { setRowsState(r); setErr(""); };
  const setCharges = (c: ChargeRow[]) => { setChargesState(c); setErr(""); };

  const t = rowsTotals(S, rows, charges);
  const whOpts = [{ value: "", label: "Not specified" }, ...S.allowedWh().map((w) => ({ value: w, label: S.wh(w).name }))];

  const save = () => {
    const r = S.estimateSave({ id: estimate?.id, customer: f.customer, wh: f.wh, expiry: f.expiry, ref: f.ref, notes: f.notes, terms: f.terms, lines: rowsToInput(rows), charges: chargesToInput(charges) });
    if (!r.ok) return setErr(r.error);
    S.result(r, estimate ? "Estimate updated" : "Estimate saved");
    S.nav("estimates", { id: r.ref });
  };

  return (
    <>
      <DetailHeader
        backLabel="Cancel"
        onBack={onClose}
        reference={estimate?.id}
        title={estimate ? "Edit estimate" : "New estimate"}
        meta={estimate ? "Revisions are recorded in the activity history." : "Saved as a draft. Send it to the customer when ready."}
      />
      {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Card>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Customer" required className="sm:col-span-2">
                <CustomerPicker value={f.customer} onChange={(customer) => setF({ customer })} />
              </Field>
              <Field label="Valid until" required>
                <DatePicker value={f.expiry} min={S.TODAY} onChange={(expiry) => setF({ expiry })} />
              </Field>
              <Field label="Supplying warehouse" hint="Optional — shows availability">
                <Select value={f.wh} onValueChange={(wh) => setF({ wh })} options={whOpts} />
              </Field>
              <Field label="Customer reference" className="sm:col-span-2">
                <Input value={f.ref} onChange={(e) => setF({ ref: e.target.value })} placeholder="e.g. RFQ number" />
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Products" description="Prices default from the catalogue and can be adjusted per line." />
            <CardContent>
              <LineEditor rows={rows} onChange={setRows} wh={f.wh || undefined} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Additional charges" />
            <CardContent>
              <ChargesEditor rows={charges} onChange={setCharges} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Notes to customer">
                <Textarea value={f.notes} onChange={(e) => setF({ notes: e.target.value })} />
              </Field>
              <Field label="Terms & conditions">
                <Textarea value={f.terms} onChange={(e) => setF({ terms: e.target.value })} />
              </Field>
            </CardContent>
          </Card>
        </div>
        <Card className="lg:sticky lg:top-4">
          <CardHeader title="Summary" />
          <CardContent className="flex flex-col gap-3">
            <TotalsBlock t={t} totalLabel="Estimate total" />
            <div className="text-[11.5px] text-muted-foreground">
              Estimates never reserve or move stock. Prices, discounts and tax rates are preserved when the accepted estimate becomes a sales order.
            </div>
            <div className="flex flex-col gap-2">
              <Button size="lg" onClick={save}>{estimate ? "Save changes" : "Save estimate"}</Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
