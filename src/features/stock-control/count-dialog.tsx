"use client";

import * as React from "react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Field, Label } from "@/components/ui/field";
import { CheckboxField } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";

type CntForm = { wh: string; location: string; skus: string[]; blind: boolean };

export function CountDialog({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const S = useSoap();
  const [cf, setCf] = React.useState<CntForm>(() => {
    const w = S.scope()[0];
    return { wh: w, location: S.wh(w).locations[0], skus: [], blind: S.s.settings.blindCountDefault };
  });

  const toggle = (sku: string) => setCf((x) => ({ ...x, skus: x.skus.includes(sku) ? x.skus.filter((k) => k !== sku) : x.skus.concat([sku]) }));

  const submit = () => {
    const r = S.countCreate(cf);
    S.result(r, "Count started");
    if (r.ok) onDone(r.id as string);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader title="Start count session" description="Expected balances are snapshotted when the session starts." />
        <DialogBody>
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <Field label="Warehouse">
              <Select
                value={cf.wh}
                onValueChange={(v) => setCf((x) => ({ ...x, wh: v, location: S.wh(v).locations[0] }))}
                options={S.allowedWh().map((w) => ({ value: w, label: S.wh(w).name }))}
              />
            </Field>
            <Field label="Location">
              <Select value={cf.location} onValueChange={(v) => setCf((x) => ({ ...x, location: v }))} options={cf.wh ? S.wh(cf.wh).locations : []} />
            </Field>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Products to count</Label>
              <div className="grid max-h-[200px] grid-cols-1 gap-x-3 gap-y-2 overflow-auto rounded-lg border p-2.5 min-[400px]:grid-cols-2">
                {S.s.products
                  .filter((p) => p.status === "Active")
                  .map((p) => (
                    <CheckboxField key={p.sku} label={<span className="font-mono text-[12px]">{p.sku}</span>} checked={cf.skus.includes(p.sku)} onCheckedChange={() => toggle(p.sku)} />
                  ))}
              </div>
            </div>
            <CheckboxField
              className="sm:col-span-2"
              label="Blind count — hide expected quantities from counters"
              checked={cf.blind}
              onCheckedChange={(c) => setCf((x) => ({ ...x, blind: c === true }))}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Start counting</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
