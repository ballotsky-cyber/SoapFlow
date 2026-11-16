"use client";

import * as React from "react";
import { Undo2 } from "lucide-react";
import { useSoap, type CustomerReturn } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Alert, EmptyState } from "@/components/ui/misc";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

/** Customer returns: goods come back into quarantine and are restored to stock only after inspection. */
export function ReturnsTab({ focus }: { focus?: string }) {
  const S = useSoap();
  const s = S.s;
  const sc = S.scope();
  const [inspect, setInspect] = React.useState<string | null>(() => {
    const r = focus ? s.returns.find((x) => x.id === focus) : undefined;
    return r && r.status === "Pending inspection" && S.can("rtn.inspect") ? r.id : null;
  });
  const rows = s.returns.filter((r) => sc.includes(r.wh));
  const canReceive = S.can("rtn.inspect") || S.can("dsp.process");
  const canInspect = S.can("rtn.inspect");

  const receive = (r: CustomerReturn) =>
    S.confirm({
      title: "Receive " + r.id + " into quarantine?",
      body: "Confirm the returned goods have arrived at " + S.wh(r.wh).name + ". They are held in quarantine — not sellable — until inspected.",
      confirmLabel: "Receive goods",
      onConfirm: () => S.result(S.returnAct(r.id, "receive"), "Return received"),
    });
  const link = (r: CustomerReturn) => (r.source === "Delivery" ? () => S.nav("dispatch", { id: r.ref }) : () => S.nav("credit-notes", { id: r.ref }));
  const cur = inspect ? s.returns.find((x) => x.id === inspect) : undefined;

  return (
    <>
      <div className="text-[12.5px] text-muted-foreground">Returned goods are received into quarantine, then inspected: accepted quantities go back to sellable stock (once), damaged quantities are held separately.</div>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Return</TH>
              <TH>Source</TH>
              <TH>Customer</TH>
              <TH>Warehouse</TH>
              <TH>Lines</TH>
              <TH>Status</TH>
              <TH align="right"><span className="sr-only">Actions</span></TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <tr key={r.id} className={cn(focus === r.id && "bg-primary-soft/50")}>
                <TD nowrap>
                  <Ref>{r.id}</Ref>
                  <div className="text-[11px] text-muted-foreground">{S.fmtDate(r.date)}</div>
                </TD>
                <TD nowrap>
                  {r.source === "Delivery" ? "Refused on delivery" : "Credit note"} <Ref onClick={link(r)}>{r.ref}</Ref>
                  {r.so && <div className="text-[11px] text-muted-foreground">Order <Ref onClick={() => S.nav("sales-orders", { id: r.so })}>{r.so}</Ref>{r.cn && r.cn !== r.ref ? <> · <Ref onClick={() => S.nav("credit-notes", { id: r.cn as string })}>{r.cn}</Ref></> : null}</div>}
                </TD>
                <TD className="min-w-[140px]">{S.cust(r.customer).name}</TD>
                <TD nowrap>{S.wh(r.wh).name}</TD>
                <TD className="min-w-[180px] text-[12px]">
                  {r.lines.map((l) => (
                    <div key={l.sku}>
                      <span className="font-mono text-[11px]">{l.sku}</span> {S.qty(l.sku, l.qty)}
                      {r.status === "Inspected" && <span className="text-muted-foreground"> → {S.qty(l.sku, l.accepted)} sellable{l.damaged ? ", " + S.qty(l.sku, l.damaged) + " damaged" : ""}</span>}
                    </div>
                  ))}
                </TD>
                <TD nowrap>
                  <StatusBadge status={r.status} />
                  {r.inspectedBy && <div className="mt-0.5 text-[11px] text-muted-foreground">by {S.uname(r.inspectedBy)}</div>}
                </TD>
                <TD nowrap align="right">
                  {r.status === "Awaiting return" && canReceive && <Button size="xs" variant="outline" onClick={() => receive(r)}>Receive into quarantine</Button>}
                  {r.status === "Pending inspection" && canInspect && <Button size="xs" onClick={() => setInspect(r.id)}>Inspect</Button>}
                </TD>
              </tr>
            ))}
          </TBody>
        </Table>
        {!rows.length && <EmptyState icon={<Undo2 />} title="No customer returns in this scope." />}
      </Card>
      {cur && <InspectDialog r={cur} onClose={() => setInspect(null)} />}
    </>
  );
}

function InspectDialog({ r, onClose }: { r: CustomerReturn; onClose: () => void }) {
  const S = useSoap();
  const [rows, setRows] = React.useState(() => r.lines.map((l) => ({ accepted: String(l.qty), damaged: "0" })));
  const [note, setNote] = React.useState("");
  const [err, setErr] = React.useState("");
  const set = (k: number, f: "accepted" | "damaged", v: string) => {
    setRows((x) => x.map((y, j) => (j === k ? { ...y, [f]: v.replace(/[^0-9]/g, "") } : y)));
    setErr("");
  };
  const save = () => {
    const res = S.returnAct(r.id, "inspect", { lines: rows.map((x) => ({ accepted: parseInt(x.accepted, 10) || 0, damaged: parseInt(x.damaged, 10) || 0 })), note });
    if (!res.ok) return setErr(res.error);
    S.result(res, "Inspection posted");
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader title={"Inspect " + r.id} description={S.cust(r.customer).name + " · " + S.wh(r.wh).name + " · quantities in base units"} />
        <DialogBody>
          {err && <Alert tone="danger">{err} Your entries have been kept.</Alert>}
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem] gap-2 border-b bg-muted/60 px-3 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              <span>Product</span><span className="text-right">Accept</span><span className="text-right">Damaged</span>
            </div>
            {r.lines.map((l, k) => {
              const sum = (parseInt(rows[k].accepted, 10) || 0) + (parseInt(rows[k].damaged, 10) || 0);
              return (
                <div key={l.sku} className="grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem] items-center gap-2 border-b px-3 py-2 text-[12.5px] last:border-0">
                  <span className="min-w-0">
                    <span className="font-medium">{l.name}</span>
                    <span className={cn("block text-[11.5px]", sum === l.qty ? "text-muted-foreground" : "text-danger")}>Returned {S.qty(l.sku, l.qty)} ({l.qty}) · entered {sum}</span>
                  </span>
                  <Input value={rows[k].accepted} onChange={(e) => set(k, "accepted", e.target.value)} inputMode="numeric" aria-label={"Accepted " + l.name} className="h-8 text-right tabular" />
                  <Input value={rows[k].damaged} onChange={(e) => set(k, "damaged", e.target.value)} inputMode="numeric" aria-label={"Damaged " + l.name} className="h-8 text-right tabular" />
                </div>
              );
            })}
          </div>
          <Field label="Inspection note">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. outer cartons wet, bars intact" />
          </Field>
          <Alert tone="info">Accepted quantities return to sellable stock at the original dispatch cost; damaged quantities move to the damaged bucket. This posts once and cannot be repeated.</Alert>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Post inspection</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
