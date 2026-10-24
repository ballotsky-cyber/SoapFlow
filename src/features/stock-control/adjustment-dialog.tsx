"use client";

import * as React from "react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";

type AdjForm = { wh: string; sku: string; type: string; dir: "-" | "+"; n: string; unit: string; reason: string };

export function AdjustmentDialog({ initialSku, onClose, onDone }: { initialSku: string; onClose: () => void; onDone: () => void }) {
  const S = useSoap();
  const [a, setA] = React.useState<AdjForm>(() => ({ wh: S.scope()[0], sku: initialSku, type: "Damage", dir: "-", n: "", unit: "bar", reason: "" }));
  const [err, setErr] = React.useState("");
  const set = <K extends keyof AdjForm>(k: K) => (v: AdjForm[K]) => { setA((x) => ({ ...x, [k]: v })); setErr(""); };

  const adjBars = a.sku ? S.toBars(a.sku, a.n, a.unit) : 0;
  const adjAvail = a.sku && a.wh ? "Available at " + S.wh(a.wh).name + ": " + S.qty(a.sku, S.avail(a.wh, a.sku)) + " · sellable " + S.qty(a.sku, S.bal(a.wh, a.sku).sellable) : "";

  const submit = () => {
    const r = S.adjRequest({ wh: a.wh, sku: a.sku, qty: (a.dir === "-" ? -1 : 1) * adjBars, type: a.type, reason: a.reason.trim() });
    if (!r.ok) return setErr(r.error);
    onDone();
    S.result(r, "Adjustment requested");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader title="Request stock adjustment" description="Creates a pending request. Stock changes only after a warehouse manager approves." />
        <DialogBody>
          {err && <Alert tone="danger">{err}</Alert>}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <Field label="Warehouse">
              <Select value={a.wh} onValueChange={set("wh")} options={S.allowedWh().map((w) => ({ value: w, label: S.wh(w).name }))} />
            </Field>
            <Field label="Adjustment type">
              <Select value={a.type} onValueChange={set("type")} options={["Damage", "Count variance", "Expiry write-off", "Found stock", "Opening balance"]} />
            </Field>
            <Field label="Product" hint={adjAvail || undefined} className="sm:col-span-2">
              <Select
                value={a.sku}
                onValueChange={set("sku")}
                placeholder="Select product…"
                options={[{ value: "", label: "Select product…" }, ...S.s.products.map((p) => ({ value: p.sku, label: p.sku + " — " + p.name }))]}
              />
            </Field>
            <Field label="Direction">
              <Select value={a.dir} onValueChange={(v) => set("dir")(v === "+" ? "+" : "-")} options={[{ value: "-", label: "Decrease (−)" }, { value: "+", label: "Increase (+)" }]} />
            </Field>
            <Field label="Quantity" hint={"= " + S.commas(adjBars) + " bars"}>
              <div className="flex gap-1.5">
                <Input value={a.n} onChange={(e) => set("n")(e.target.value)} inputMode="numeric" className="min-w-0 flex-1" />
                <Select value={a.unit} onValueChange={set("unit")} options={["ctn", "pk", "bar"]} className="w-20" aria-label="Unit" />
              </div>
            </Field>
            <Field label="Reason (required, kept in audit trail)" className="sm:col-span-2">
              <Textarea value={a.reason} onChange={(e) => set("reason")(e.target.value)} rows={3} placeholder="What happened, where, and how it was verified" />
            </Field>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Submit for approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
