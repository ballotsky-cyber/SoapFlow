"use client";

import * as React from "react";
import { useSoap } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { Ref } from "@/components/shared/page";
import { cn } from "@/lib/utils";
import { calc, shortInfo, type WLine } from "./receiving-model";
import { QtyUnit } from "./receiving-ui";

type Upd = (i: number, patch: Partial<WLine>) => void;

/** Table-like line editor: a header row on md+, stacked labelled cards on phones. */
function LineGrid({ cols, template, children }: { cols: { label: string; right?: boolean }[]; template: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className={cn("hidden gap-3 border-b bg-muted/70 px-4 py-2 md:grid", template)}>
        {cols.map((c) => (
          <span key={c.label} className={cn("text-[11px] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase", c.right && "text-right")}>{c.label}</span>
        ))}
      </div>
      <div className="flex flex-col gap-2 p-3 md:gap-0 md:p-0">{children}</div>
    </div>
  );
}

function Row({ template, children }: { template: string; children: React.ReactNode }) {
  return <div className={cn("grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border p-3 md:items-start md:rounded-none md:border-0 md:border-b md:px-4 md:py-2.5 md:last:border-b-0", template)}>{children}</div>;
}

/** Cell with a label shown only on phones (the md+ header row labels it otherwise). */
function Cell({ label, children, className }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      {label && <span className="text-[11px] font-medium text-muted-foreground md:hidden">{label}</span>}
      {children}
    </div>
  );
}

const T3 = "md:grid-cols-[minmax(170px,1.2fr)_minmax(170px,1fr)_minmax(170px,1fr)_minmax(110px,auto)]";

export function QuantitiesStep({ lines, upd }: { lines: WLine[]; upd: Upd }) {
  const S = useSoap();
  return (
    <LineGrid template={T3} cols={[{ label: "Product" }, { label: "Expected (delivery note)" }, { label: "Physically counted" }, { label: "Short / over", right: true }]}>
      {lines.map((l, i) => {
        const p = S.prod(l.sku);
        const c = calc(S, l);
        const sh = shortInfo(S, l, c);
        return (
          <Row key={l.sku} template={T3}>
            <Cell className="col-span-2 md:col-span-1">
              <Ref>{l.sku}</Ref>
              <span className="text-[11.5px] text-muted-foreground">{`1 ctn = ${p.cartonPacks} pk × ${p.packBars} bars`}</span>
            </Cell>
            <Cell label="Expected (delivery note)">
              <QtyUnit label={`${l.sku} expected`} n={l.expN} u={l.expU} onN={(v) => upd(i, { expN: v })} onU={(v) => upd(i, { expU: v })} />
              <span className="text-[11px] text-muted-foreground tabular">{S.commas(c.exp)} bars</span>
            </Cell>
            <Cell label="Physically counted">
              <QtyUnit label={`${l.sku} counted`} n={l.cntN} u={l.cntU} onN={(v) => upd(i, { cntN: v })} onU={(v) => upd(i, { cntU: v })} />
              <span className="text-[11px] text-muted-foreground tabular">{S.commas(c.cnt)} bars = {S.qty(l.sku, c.cnt)}</span>
            </Cell>
            <Cell label="Short / over" className="col-span-2 md:col-span-1 md:items-end md:pt-2">
              <span className={cn("font-semibold whitespace-nowrap tabular", sh.cls)}>{sh.text}</span>
            </Cell>
          </Row>
        );
      })}
    </LineGrid>
  );
}

const T4 = "md:grid-cols-[minmax(150px,1.2fr)_minmax(160px,1fr)_minmax(160px,1fr)_minmax(110px,auto)_minmax(110px,auto)]";

export function ConditionStep({ lines, upd }: { lines: WLine[]; upd: Upd }) {
  const S = useSoap();
  return (
    <>
      <LineGrid template={T4} cols={[{ label: "Product" }, { label: "Rejected" }, { label: "Damaged" }, { label: "Accepted", right: true }, { label: "Short / over", right: true }]}>
        {lines.map((l, i) => {
          const c = calc(S, l);
          const sh = shortInfo(S, l, c);
          return (
            <Row key={l.sku} template={T4}>
              <Cell className="col-span-2 md:col-span-1">
                <Ref>{l.sku}</Ref>
                <span className="text-[11.5px] text-muted-foreground">counted {S.qty(l.sku, c.cnt)}</span>
              </Cell>
              <Cell label="Rejected">
                <QtyUnit label={`${l.sku} rejected`} n={l.rejN} u={l.rejU} onN={(v) => upd(i, { rejN: v })} onU={(v) => upd(i, { rejU: v })} invalid={c.acc < 0} />
              </Cell>
              <Cell label="Damaged">
                <QtyUnit label={`${l.sku} damaged`} n={l.dmgN} u={l.dmgU} onN={(v) => upd(i, { dmgN: v })} onU={(v) => upd(i, { dmgU: v })} invalid={c.acc < 0} />
              </Cell>
              <Cell label="Accepted" className="md:items-end md:pt-2">
                <span className={cn("font-semibold whitespace-nowrap tabular", c.acc < 0 ? "text-danger" : "text-success")}>{S.qty(l.sku, Math.max(0, c.acc))}</span>
              </Cell>
              <Cell label="Short / over" className="md:items-end md:pt-2">
                <span className={cn("whitespace-nowrap tabular", sh.cls)}>{sh.text}</span>
              </Cell>
            </Row>
          );
        })}
      </LineGrid>
      <p className="px-4 pt-1 pb-3 text-xs text-muted-foreground">Accepted = counted − rejected − damaged. Rejected goods go back on the truck; damaged goods are held in the damaged bucket and never become sellable automatically.</p>
    </>
  );
}

export function BatchesStep({ lines, upd }: { lines: WLine[]; upd: Upd }) {
  const S = useSoap();
  return (
    <div className="flex flex-col gap-2.5 p-4">
      {lines.map((l, i) => {
        const p = S.prod(l.sku);
        return (
          <div key={l.sku} className="flex flex-col gap-2.5 rounded-lg border px-3 py-2.5">
            <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
              <span className="min-w-0"><Ref>{l.sku}</Ref> · {p.name}</span>
              <span className={cn("text-[11.5px] font-semibold", p.batch ? "text-warning" : "text-muted-foreground")}>{p.batch ? "Batch & expiry required" : "Batch not required for this product"}</span>
            </div>
            {p.batch && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Field label="Batch number" required>
                  <Input value={l.batch} onChange={(e) => upd(i, { batch: e.target.value })} className="h-8" />
                </Field>
                <Field label="Manufacturing date">
                  <DatePicker size="sm" value={l.mfg} onChange={(v) => upd(i, { mfg: v })} clearable />
                </Field>
                <Field label="Expiry date" required>
                  <DatePicker size="sm" value={l.exp} onChange={(v) => upd(i, { exp: v })} clearable />
                </Field>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
