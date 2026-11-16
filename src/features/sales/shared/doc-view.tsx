"use client";

import * as React from "react";
import { useSoap, type DocLine, type Party, type SoapStore } from "@/lib/store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { ListRow } from "@/features/procurement/parts";
import { fmtNum } from "./line-editor";

/** "200 cartons", "2.5 cartons", "1 bar". */
export function unitQty(S: SoapStore, unit: string, uqty: number) {
  const u = S.unitDef(unit);
  return fmtNum(uqty) + " " + (uqty === 1 ? u.name.toLowerCase() : u.plural);
}
export const lineQty = (S: SoapStore, l: DocLine) => unitQty(S, l.unit, l.qty / (l.factor || 1));
export const pct = (bp: number) => fmtNum(bp / 100) + "%";

/** Read-only priced lines. `extra` adds columns (header + cell) after the quantity, e.g. order progress. */
export function DocLinesTable({ lines, extra, empty = "No item lines." }: { lines: DocLine[]; extra?: { head: string; cell: (l: DocLine, i: number) => React.ReactNode }[]; empty?: string }) {
  const S = useSoap();
  return (
    <Table>
      <THead>
        <tr>
          <TH>Product</TH>
          <TH align="right">Quantity</TH>
          {extra?.map((x) => <TH key={x.head} align="right">{x.head}</TH>)}
          <TH align="right">Unit price</TH>
          <TH align="right">Disc.</TH>
          <TH align="right">Tax</TH>
          <TH align="right">Amount</TH>
        </tr>
      </THead>
      <TBody>
        {lines.map((l, i) => {
          const c = S.lineCalc(l);
          return (
            <tr key={l.sku + i}>
              <TD className="min-w-[200px]">
                <div className="font-medium">{l.name}</div>
                <div className="text-[11px] text-muted-foreground"><span className="font-mono">{l.sku}</span>{l.desc ? " · " + l.desc : ""}</div>
              </TD>
              <TD nowrap align="right">
                {lineQty(S, l)}
                {l.factor > 1 && <div className="text-[11px] text-subtle-foreground">{S.qty(l.sku, l.qty)}</div>}
              </TD>
              {extra?.map((x) => <TD key={x.head} nowrap align="right">{x.cell(l, i)}</TD>)}
              <TD nowrap align="right">{S.money(l.uprice)}<div className="text-[11px] text-subtle-foreground">per {S.unitDef(l.unit).name.toLowerCase()}</div></TD>
              <TD nowrap align="right">{l.discPct ? fmtNum(l.discPct) + "%" : "—"}</TD>
              <TD nowrap align="right">{l.taxRate ? pct(l.taxRate) : l.taxCode ? "0%" : "—"}<div className="text-[11px] text-subtle-foreground">{c.tax ? S.money(c.tax) : ""}</div></TD>
              <TD nowrap align="right" className="font-medium">{S.money(c.total)}</TD>
            </tr>
          );
        })}
      </TBody>
      {!lines.length && (
        <tbody><tr><td colSpan={6 + (extra?.length || 0)} className="px-4 py-5 text-center text-[12.5px] text-muted-foreground">{empty}</td></tr></tbody>
      )}
    </Table>
  );
}

/** Customer block as snapshotted on the document. */
export function PartyCard({ title = "Customer", party, id, children }: { title?: string; party: Party; id?: string; children?: React.ReactNode }) {
  const S = useSoap();
  return (
    <Card>
      <CardHeader title={title} actions={id && S.canView("cus.view") ? <Ref onClick={() => S.nav("customers", { id })}>{id}</Ref> : undefined} />
      <CardContent className="flex flex-col gap-1 text-[12.5px]">
        <div className="text-[13.5px] font-semibold">{party.name}</div>
        {party.contact && party.contact !== "—" && <div>Attn: {party.contact}</div>}
        {party.address && <div className="text-muted-foreground">{party.address}</div>}
        {party.delivAddr && party.delivAddr !== party.address && <div className="text-muted-foreground">Deliver to: {party.delivAddr}</div>}
        <div className="text-muted-foreground">{[party.phone, party.email].filter(Boolean).join(" · ") || "No contact details"}</div>
        {party.tin && <div className="text-muted-foreground">TIN {party.tin}</div>}
        {children}
      </CardContent>
    </Card>
  );
}

/** Linked documents across the commercial chain. */
export function RelatedCard({ id, title = "Related documents" }: { id: string; title?: string }) {
  const S = useSoap();
  const rows = S.related(id);
  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} />
      {rows.map((r) => (
        <ListRow key={r.id} onClick={() => S.nav(r.route.name, { id: r.route.id, ...(r.route.tab ? { tab: r.route.tab } : {}) })} right={<span className="inline-flex items-center gap-2">{r.amount != null && S.money(r.amount)}<StatusBadge status={r.status} /></span>}>
          <span className="text-muted-foreground">{r.type}</span> <Ref>{r.id}</Ref>
        </ListRow>
      ))}
      {!rows.length && <div className="px-4 py-4 text-[12.5px] text-muted-foreground">No linked documents yet.</div>}
    </Card>
  );
}

/** Audit entries that reference the document. */
export function ActivityCard({ id }: { id: string }) {
  const S = useSoap();
  const rows = S.history(id);
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Activity history" description="From the audit trail" />
      <div className="max-h-80 overflow-y-auto">
        {rows.map((a) => (
          <div key={a.id} className="flex flex-col gap-0.5 border-b px-4 py-2.5 text-[12.5px] last:border-0">
            <span><b className="font-semibold">{a.action}</b>{a.ref !== id && <span className="font-mono text-[11px] text-muted-foreground"> · {a.ref}</span>}</span>
            <span className="text-[11.5px] text-muted-foreground">{S.fmtDate(a.ts)} · {S.uname(a.user)}{a.detail ? " · " + a.detail : ""}</span>
          </div>
        ))}
        {!rows.length && <div className="px-4 py-4 text-[12.5px] text-muted-foreground">No activity recorded.</div>}
      </div>
    </Card>
  );
}

/** Label / value list used in detail side panels. */
export function KV({ rows }: { rows: [React.ReactNode, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[12.5px]">
      {rows.map(([k, v], i) => (
        <React.Fragment key={i}>
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0 text-right font-medium break-words">{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
