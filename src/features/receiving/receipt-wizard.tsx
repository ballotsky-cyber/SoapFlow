"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { Ref } from "@/components/shared/page";
import { cn } from "@/lib/utils";
import { calc, lineFromPO, STEP_LABELS, toData, validate, type WLine, type WReceipt } from "./receiving-model";
import { StepDot } from "./receiving-ui";
import { BatchesStep, ConditionStep, QuantitiesStep } from "./wizard-lines";

export function ReceiptWizard({ initial, initialStep, onClose }: { initial: WReceipt; initialStep: number; onClose: () => void }) {
  const S = useSoap();
  const s = S.s;
  const [w, setWState] = React.useState<WReceipt>(initial);
  const [step, setStep] = React.useState(initialStep);
  const [err, setErr] = React.useState("");
  const [addSku, setAddSku] = React.useState("");

  const setW = (patch: Partial<WReceipt>) => {
    setWState((x) => ({ ...x, ...patch }));
    setErr("");
  };
  const upd = (i: number, patch: Partial<WLine>) => {
    setWState((x) => ({ ...x, lines: x.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
    setErr("");
  };
  const fail = (v: [number, string]) => {
    setStep(v[0]);
    setErr(v[1]);
  };

  const po = w.po ? s.pos.find((p) => p.id === w.po) : undefined;
  const poOpts = s.pos
    .filter((p) => p.status === "Approved" && (!w.supplier || p.supplier === w.supplier) && S.poDelivery(p) !== "Fully received")
    .map((p) => ({ value: p.id, label: p.id + " · " + S.wh(p.wh).name + " · " + S.poDelivery(p) }));
  // Keep a saved receipt's PO selectable even if it no longer qualifies (e.g. now fully received).
  if (w.po && !poOpts.some((o) => o.value === w.po)) poOpts.unshift({ value: w.po, label: w.po });
  const onPO = (id: string) => {
    const p = s.pos.find((x) => x.id === id);
    setW(p ? { po: p.id, wh: p.wh, supplier: p.supplier, lines: p.lines.filter((l) => l.qty > S.poReceived(p.id, l.sku)).map((l) => lineFromPO(S, p, l)) } : { po: "" });
  };

  const used = w.lines.map((l) => l.sku);
  const addOpts = s.products.filter((p) => p.status === "Active" && !used.includes(p.sku)).map((p) => ({ value: p.sku, label: p.sku + " — " + p.name }));
  const addLine = () => {
    if (!addSku) return;
    const p = S.prod(addSku);
    const pl = po?.lines.find((x) => x.sku === p.sku);
    setW({ lines: [...w.lines, { sku: p.sku, cost4: pl ? pl.cost4 : p.cost4, expN: "", expU: "ctn", cntN: "", cntU: "ctn", rejN: "", rejU: "ctn", dmgN: "", dmgU: "ctn", batch: "", mfg: "", exp: "" }] });
    setAddSku("");
  };

  const cs = w.lines.map((l) => calc(S, l));
  const sum = (k: keyof (typeof cs)[number]) => cs.reduce((a, c) => a + c[k], 0);
  const issues: string[] = [];
  w.lines.forEach((l, i) => {
    const c = cs[i];
    if (c.short > 0) issues.push(`${l.sku}: short-delivered ${S.qty(l.sku, c.short)} against delivery note.`);
    if (c.short < 0) issues.push(`${l.sku}: over-delivered ${S.qty(l.sku, -c.short)} — confirm with procurement.`);
    if (c.rej) issues.push(`${l.sku}: ${S.qty(l.sku, c.rej)} rejected (returned on truck).`);
    if (c.dmg) issues.push(`${l.sku}: ${S.qty(l.sku, c.dmg)} damaged — held in damaged stock.`);
    if (po && !po.lines.some((x) => x.sku === l.sku)) issues.push(`${l.sku}: not on ${po.id}.`);
  });
  if (!w.po) issues.push("No purchase order selected — receipt will be flagged for procurement review.");

  const goStep = (n: number) => {
    if (n === 7) return;
    if (n > step) {
      const v = validate(S, w, n - 1);
      if (v) return fail(v);
    }
    setStep(n);
    setErr("");
  };
  const next = () => {
    const v = validate(S, w, step);
    if (v) return fail(v);
    setStep(step + 1);
    setErr("");
  };
  const submit = () => {
    const v = validate(S, w, 5);
    if (v) return fail(v);
    if (issues.length && !w.notes.trim()) return setErr("Add discrepancy notes explaining the differences before submitting.");
    const r = S.receiptSave(toData(S, w), true);
    if (!r.ok) return setErr(r.error);
    onClose();
    S.result(r, "Submitted for approval");
    S.nav("receiving", { id: r.id as string });
  };
  const saveDraft = () => {
    const v = validate(S, w, 1);
    if (v) return fail([1, v[1]]);
    const d = toData(S, w);
    d.status = step >= 3 ? "Counting" : "Arrived";
    const r = S.receiptSave(d, false);
    if (!r.ok) return setErr(r.error);
    onClose();
    S.result(r, "Receipt saved");
    S.nav("receiving", { id: r.id as string });
  };

  const [date, time] = [w.arrival.slice(0, 10), w.arrival.slice(11, 16)];
  const [stepTitle, stepHint] = STEP_LABELS[step - 1];
  const reviewStats = [
    { k: "Lines", v: String(w.lines.length), cls: "" },
    { k: "Expected", v: S.commas(sum("exp")) + " bars", cls: "" },
    { k: "Counted", v: S.commas(sum("cnt")) + " bars", cls: "" },
    { k: "Accepted", v: S.commas(sum("acc")) + " bars", cls: "text-success" },
    { k: "Rejected + damaged", v: S.commas(sum("rej") + sum("dmg")) + " bars", cls: sum("rej") + sum("dmg") ? "text-danger" : "" },
    { k: "Short", v: S.commas(Math.max(0, sum("short"))) + " bars", cls: sum("short") > 0 ? "text-warning" : "" },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={onClose} className="mb-2 inline-flex cursor-pointer items-center gap-1 text-[12.5px] font-medium text-primary hover:underline">
            <ArrowLeft className="size-3.5" />
            Cancel
          </button>
          <h1 className="text-xl font-semibold tracking-tight">{w.id ? "Receipt " + w.id : "Record truck arrival"}</h1>
          <div className="mt-1 text-[12.5px] text-muted-foreground">Nothing reaches stock until a warehouse manager posts the receipt.</div>
        </div>
        <Button variant="outline" onClick={saveDraft}>Save &amp; exit</Button>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="flex gap-0.5 overflow-x-auto p-2 lg:flex-col">
          {STEP_LABELS.map(([label], i) => {
            const n = i + 1;
            const cur = n === step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => goStep(n)}
                aria-current={cur ? "step" : undefined}
                disabled={n === 7}
                className={cn("flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left disabled:cursor-default", cur ? "bg-primary-soft/60" : "hover:bg-muted/60")}
              >
                <StepDot n={n} state={n < step ? "done" : cur ? "current" : "todo"} />
                <span className={cn("text-[12.5px] whitespace-nowrap", n === 7 ? "text-subtle-foreground" : "text-foreground", cur && "font-semibold")}>{label}</span>
              </button>
            );
          })}
        </Card>
        <Card className="min-w-0">
          <CardHeader title={stepTitle} description={stepHint} />
          {err && <Alert tone="danger" className="mx-4 mt-3">{err}</Alert>}

          {step === 1 && (
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Supplier" required>
                <Select value={w.supplier} onValueChange={(v) => setW({ supplier: v, po: "" })} placeholder="Select supplier…" options={s.suppliers.map((x) => ({ value: x.id, label: x.name }))} />
              </Field>
              <Field label="Purchase order">
                <Select value={w.po} onValueChange={onPO} options={[{ value: "", label: "No PO (exception — will be flagged)" }, ...poOpts]} />
              </Field>
              <Field label="Destination warehouse" required>
                <Select value={w.wh} onValueChange={(v) => setW({ wh: v })} options={S.allowedWh().map((x) => ({ value: x, label: S.wh(x).name }))} />
              </Field>
              <Field label="Truck registration" required>
                <Input value={w.truck} onChange={(e) => setW({ truck: e.target.value })} placeholder="GT-0000-24" className="uppercase" />
              </Field>
              <Field label="Driver name">
                <Input value={w.driver} onChange={(e) => setW({ driver: e.target.value })} />
              </Field>
              <Field label="Supplier delivery note" required>
                <Input value={w.dn} onChange={(e) => setW({ dn: e.target.value })} placeholder="Delivery note number" />
              </Field>
              <Field label="Arrival time" required>
                <div className="flex gap-2">
                  <DatePicker value={date} onChange={(v) => setW({ arrival: v ? v + "T" + (time || "00:00") : "" })} className="min-w-0 flex-1" />
                  <Input type="time" value={time} onChange={(e) => setW({ arrival: (date || S.TODAY) + "T" + e.target.value })} aria-label="Arrival time of day" className="w-[104px] shrink-0" />
                </div>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-2.5 p-4">
              {w.lines.map((l, i) => {
                const p = S.prod(l.sku);
                const pl = po?.lines.find((x) => x.sku === l.sku);
                return (
                  <div key={l.sku} className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border px-3 py-2">
                    <span className="min-w-0">
                      <Ref>{l.sku}</Ref> · {p.name}
                      <div className="text-[11.5px] text-muted-foreground">
                        {`1 ctn = ${p.cartonPacks} pk × ${p.packBars} bars`} · {pl && po ? "PO ordered " + S.qty(l.sku, pl.qty) + ", previously received " + S.qty(l.sku, S.poReceived(po.id, l.sku)) : "Not on PO — will be flagged"}
                      </div>
                    </span>
                    <Button size="xs" variant="destructive-outline" onClick={() => setW({ lines: w.lines.filter((_, j) => j !== i) })}>Remove</Button>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2">
                <Select value={addSku} onValueChange={setAddSku} options={[{ value: "", label: "Add another product to this truck…" }, ...addOpts]} className="min-w-0 flex-1 basis-[220px]" />
                <Button variant="outline" onClick={addLine}>Add line</Button>
              </div>
            </div>
          )}

          {step === 3 && <QuantitiesStep lines={w.lines} upd={upd} />}
          {step === 4 && <ConditionStep lines={w.lines} upd={upd} />}
          {step === 5 && <BatchesStep lines={w.lines} upd={upd} />}

          {step === 6 && (
            <div className="flex flex-col gap-3 p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                {reviewStats.map((k) => (
                  <div key={k.k} className="min-w-0 rounded-lg border px-2.5 py-2">
                    <div className="truncate text-[11px] text-muted-foreground">{k.k}</div>
                    <div className={cn("mt-0.5 truncate text-[15px] font-semibold tabular", k.cls)}>{k.v}</div>
                  </div>
                ))}
              </div>
              {issues.map((t, i) => (
                <Alert key={i} tone="warning">{t}</Alert>
              ))}
              {!issues.length && <Alert tone="success">No discrepancies — counted quantities match the delivery note.</Alert>}
              <Field label="Discrepancy notes">
                <Textarea value={w.notes} onChange={(e) => setW({ notes: e.target.value })} rows={3} placeholder="Describe shortages, damage, rejected items and who from the supplier was informed" />
              </Field>
            </div>
          )}

          <CardFooter className="justify-between rounded-b-xl bg-muted/60">
            <Button variant="outline" disabled={step === 1} onClick={() => { setStep(Math.max(1, step - 1)); setErr(""); }}>Back</Button>
            {step < 6 ? <Button onClick={next}>Continue</Button> : <Button onClick={submit}>Submit for approval</Button>}
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
