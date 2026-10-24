"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { toFixedInt } from "@/lib/format";
import { Totals } from "./parts";

interface FormLine { sku: string; n: string; u: string; c: string }
interface FormState { supplier: string; wh: string; expected: string; discPct: string; taxPct: string; lines: FormLine[] }

const UNITS = ["ctn", "pk", "bar"];
const blankLine = (): FormLine => ({ sku: "", n: "", u: "ctn", c: "" });
const LINE_GRID = "grid grid-cols-6 gap-2 sm:grid-cols-[minmax(0,1fr)_80px_76px_120px_110px_36px] sm:gap-1.5";

/** New purchase order (POST /api/purchase-orders). */
export function PoFormDialog({ onClose }: { onClose: () => void }) {
  const S = useSoap();
  const s = S.s;
  const [f, setFState] = React.useState<FormState>(() => ({ supplier: "", wh: S.allowedWh()[0], expected: S.addDays(S.TODAY, 10), discPct: "0", taxPct: "0", lines: [blankLine()] }));
  const [err, setErr] = React.useState("");
  const setF = (patch: Partial<FormState>) => {
    setFState((x) => ({ ...x, ...patch }));
    setErr("");
  };
  const updLine = (i: number, k: keyof FormLine, v: string) => {
    const patch: Partial<FormLine> = { [k]: k === "n" ? v.replace(/[^0-9]/g, "") : v };
    if (k === "sku" && v) {
      const pr = S.prod(v);
      patch.c = ((pr.cost4 * S.bpc(pr.sku)) / 10000).toFixed(2);
    }
    setF({ lines: f.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  };

  const lineVals = f.lines.map((l) => {
    const q = l.sku ? S.toBars(l.sku, l.n, l.u) : 0;
    const c4 = l.sku ? Math.round(toFixedInt(l.c, 4) / S.bpc(l.sku)) : 0;
    return { q, c4, tot: S.valueOf(q, c4) };
  });
  const sub = lineVals.reduce((a, v) => a + v.tot, 0);
  const dp = parseFloat(f.discPct) || 0;
  const tp = parseFloat(f.taxPct) || 0;
  const disc = Math.round((sub * dp) / 100);
  const tax = Math.round(((sub - disc) * tp) / 100);

  const supOpts = s.suppliers.map((x) => ({ value: x.id, label: x.name }));
  const whOpts = S.WH.map((w) => ({ value: w, label: S.wh(w).name }));
  const prodOpts = s.products
    .filter((p) => p.status === "Active" && (!f.supplier || S.sup(f.supplier).brands.includes(p.brand)))
    .map((p) => ({ value: p.sku, label: p.sku + " — " + p.name }));

  const save = (submit: boolean) => {
    const lines = f.lines.map((l, i) => ({ sku: l.sku, qty: lineVals[i].q, cost4: lineVals[i].c4 })).filter((l) => l.sku);
    const r = S.poSave({ supplier: f.supplier, wh: f.wh, expected: f.expected, lines, discPct: dp, taxPct: tp }, submit);
    if (!r.ok) return setErr(r.error);
    onClose();
    S.result(r, submit ? "PO submitted" : "PO saved");
    S.nav("purchase-orders", { id: r.id });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader title="New purchase order" description="POST /api/purchase-orders · does not affect stock" />
        <DialogBody>
          {err && <Alert tone="danger">{err}</Alert>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Supplier" required>
              <Select value={f.supplier} onValueChange={(v) => setF({ supplier: v })} placeholder="Select…" options={supOpts} />
            </Field>
            <Field label="Destination warehouse" required>
              <Select value={f.wh} onValueChange={(v) => setF({ wh: v })} options={whOpts} />
            </Field>
            <Field label="Expected delivery" required>
              <DatePicker value={f.expected} onChange={(v) => setF({ expected: v })} />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <div className={`${LINE_GRID} hidden text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:grid`}>
              <span>Product</span><span>Qty</span><span>Unit</span><span>Cost / carton</span><span className="text-right">Line total</span><span />
            </div>
            {f.lines.map((l, i) => (
              <div key={i} className={`${LINE_GRID} items-center rounded-lg border p-2 sm:rounded-none sm:border-0 sm:p-0`}>
                <Select size="sm" value={l.sku} onValueChange={(v) => updLine(i, "sku", v)} placeholder="Select…" options={prodOpts} className="col-span-6 min-w-0 sm:col-span-1" />
                <Input value={l.n} onChange={(e) => updLine(i, "n", e.target.value)} inputMode="numeric" placeholder="Qty" aria-label="Quantity" className="col-span-2 h-8 text-right sm:col-span-1" />
                <Select size="sm" value={l.u} onValueChange={(v) => updLine(i, "u", v)} options={UNITS} className="col-span-2 sm:col-span-1" />
                <Input value={l.c} onChange={(e) => updLine(i, "c", e.target.value)} inputMode="decimal" placeholder="0.00" aria-label="Cost per carton" className="col-span-2 h-8 text-right sm:col-span-1" />
                <span className="col-span-5 text-[12.5px] tabular sm:col-span-1 sm:text-right">
                  <span className="text-muted-foreground sm:hidden">Line total: </span>
                  {lineVals[i].tot ? S.money(lineVals[i].tot) : "—"}
                </span>
                <Button variant="outline" size="icon-sm" aria-label="Remove" className="col-span-1 justify-self-end" onClick={() => setF({ lines: f.lines.filter((_, j) => j !== i) })}><Trash2 /></Button>
              </div>
            ))}
            <Button variant="soft" size="sm" className="self-start" onClick={() => setF({ lines: [...f.lines, blankLine()] })}><Plus />Add line</Button>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-3">
            <div className="flex gap-2.5">
              <Field label="Discount %">
                <Input value={f.discPct} onChange={(e) => setF({ discPct: e.target.value })} inputMode="decimal" className="h-8 w-24 text-right" />
              </Field>
              <Field label="Tax %">
                <Input value={f.taxPct} onChange={(e) => setF({ taxPct: e.target.value })} inputMode="decimal" className="h-8 w-24 text-right" />
              </Field>
            </div>
            <Totals
              rows={[
                { k: "Subtotal", v: S.money(sub) },
                { k: "Discount", v: S.money(-disc) },
                { k: "Tax", v: S.money(tax) },
                { k: "Expected total", v: S.money(sub - disc + tax), strong: true },
              ]}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => save(false)}>Save draft</Button>
          <Button onClick={() => save(true)}>Submit for approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
