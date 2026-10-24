"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FLine { sku: string; n: string; u: string }
interface Form { from: string; to: string; note: string; lines: FLine[] }

/** New transfer request (draft or submitted). */
export function TransferFormDialog({ onClose }: { onClose: () => void }) {
  const S = useSoap();
  const s = S.s;
  const [f, setFState] = React.useState<Form>(() => {
    const a = S.allowedWh();
    return { from: a[0], to: S.WH.find((w) => w !== a[0]) ?? "", note: "", lines: [{ sku: "", n: "", u: "ctn" }] };
  });
  const [err, setErr] = React.useState("");
  const setF = (patch: Partial<Form>) => {
    setFState((x) => ({ ...x, ...patch }));
    setErr("");
  };
  const upd = (i: number, patch: Partial<FLine>) => setF({ lines: f.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  const whAll = S.WH.map((w) => ({ value: w, label: S.wh(w).name }));
  const prodOpts = [{ value: "", label: "Select product…" }, ...s.products.filter((p) => p.status === "Active").map((p) => ({ value: p.sku, label: p.sku + " — " + p.name }))];

  const save = (submit: boolean) => {
    const lines = f.lines.filter((l) => l.sku).map((l) => ({ sku: l.sku, req: S.toBars(l.sku, l.n, l.u) }));
    const r = S.transferSave({ from: f.from, to: f.to, note: f.note, lines }, submit);
    if (!r.ok) return setErr(r.error);
    onClose();
    S.result(r, submit ? "Transfer requested" : "Draft saved");
    S.nav("transfers", { id: r.id as string });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader title="New transfer request" description="Availability is checked again at dispatch — concurrent orders may consume stock in the meantime." />
        <DialogBody>
          {err && <Alert tone="danger">{err}</Alert>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Source warehouse">
              <Select value={f.from} onValueChange={(v) => setF({ from: v })} options={whAll} />
            </Field>
            <Field label="Destination warehouse">
              <Select value={f.to} onValueChange={(v) => setF({ to: v })} options={whAll} />
            </Field>
          </div>
          <div className="flex flex-col gap-3">
            {f.lines.map((l, i) => {
              const av = l.sku ? S.avail(f.from, l.sku) : 0;
              const need = l.sku ? S.toBars(l.sku, l.n, l.u) : 0;
              const over = need > av;
              return (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_72px_32px] items-start gap-1.5 sm:grid-cols-[minmax(0,1fr)_90px_72px_32px]">
                  <div className="col-span-3 flex min-w-0 flex-col gap-1 sm:col-span-1">
                    <Select size="sm" value={l.sku} onValueChange={(v) => upd(i, { sku: v })} options={prodOpts} aria-label="Product" />
                    {l.sku && <span className={cn("text-[11px]", over ? "text-danger" : "text-muted-foreground")}>{"Available at " + S.wh(f.from).name + ": " + S.qty(l.sku, av) + (over ? " — request exceeds availability" : "")}</span>}
                  </div>
                  <Input value={l.n} onChange={(e) => upd(i, { n: e.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" placeholder="Qty" aria-label="Quantity" className="h-8 px-2 text-right tabular" />
                  <Select size="sm" value={l.u} onValueChange={(v) => upd(i, { u: v })} options={["ctn", "pk", "bar"]} aria-label="Unit" className="px-2" />
                  <Button variant="outline" size="icon-sm" aria-label="Remove line" onClick={() => setF({ lines: f.lines.filter((_, j) => j !== i) })}>
                    <Trash2 className="text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
            <Button variant="soft" size="sm" className="self-start border border-dashed border-primary/40" onClick={() => setF({ lines: [...f.lines, { sku: "", n: "", u: "ctn" }] })}>
              <Plus />
              Add product
            </Button>
          </div>
          <Field label="Notes">
            <Input value={f.note} onChange={(e) => setF({ note: e.target.value })} placeholder="Reason for transfer" />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => save(false)}>Save draft</Button>
          <Button onClick={() => save(true)}>Request transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
