"use client";

import * as React from "react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { toMinor } from "./money";
import type { SupplierInvoice } from "./types";

/** Record supplier payment — the engine allocates it oldest-first. */
export function SupplierPaymentDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const S = useSoap();
  const s = S.s;
  const [sp, setSp] = React.useState({ supplier: "", amount: "", method: "Bank transfer", ref: "" });
  const [err, setErr] = React.useState("");
  const set = (k: keyof typeof sp) => (v: string) => {
    setSp((x) => ({ ...x, [k]: v }));
    if (k === "supplier") setErr("");
  };

  const outstanding = sp.supplier ? (s.supplierInvoices as SupplierInvoice[]).filter((i) => i.supplier === sp.supplier).reduce((a, i) => a + i.total - i.paid, 0) : null;

  const save = () => {
    const amt = toMinor(sp.amount);
    const r = S.supplierPayment({ supplier: sp.supplier, amount: isNaN(amt) ? 0 : amt, method: sp.method, ref: sp.ref.trim() });
    if (!r.ok) return setErr(r.error);
    onSaved();
    S.result(r, "Supplier payment recorded");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader title="Record supplier payment" description="Allocated to the supplier's oldest open invoices first" />
        <DialogBody>
          {err && <Alert tone="danger">{err}</Alert>}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <Field label="Supplier" className="sm:col-span-2" hint={outstanding != null ? "Outstanding: " + S.money(outstanding) : undefined}>
              <Select value={sp.supplier} onValueChange={set("supplier")} placeholder="Select…" options={s.suppliers.map((x) => ({ value: x.id, label: x.name }))} />
            </Field>
            <Field label="Amount (GHS)">
              <Input value={sp.amount} onChange={(e) => set("amount")(e.target.value)} inputMode="decimal" className="text-right tabular" />
            </Field>
            <Field label="Method">
              <Select value={sp.method} onValueChange={set("method")} options={s.settings.paymentMethods} />
            </Field>
            <Field label="Payment reference" className="sm:col-span-2">
              <Input value={sp.ref} onChange={(e) => set("ref")(e.target.value)} />
            </Field>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Record payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
