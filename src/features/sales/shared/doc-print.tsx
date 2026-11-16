"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { Download, Mail, Printer } from "lucide-react";
import { useSoap, type DocLine, type DocTotals, type Party, type SoapStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { fmtNum } from "./line-editor";
import { lineQty, pct } from "./doc-view";

/* Printable commercial documents (estimate, sales order, invoice, delivery note, receipt, credit note).
   One layout for all of them; "Download PDF" uses the browser's Save-as-PDF with the document number as file name. */

export interface PrintSpec {
  title: string;
  number: string;
  facts: [string, string][];
  party?: { label: string; p: Party; shipTo?: boolean };
  /** Priced lines (amount columns) — or a plain table, e.g. for delivery notes and receipts. */
  lines?: DocLine[];
  table?: { cols: string[]; rows: string[][]; right?: number[] };
  totals?: { k: string; v: string; strong?: boolean }[];
  payment?: string[];
  notes?: string;
  terms?: string;
  signatures?: string[];
  /** Large overlay text, e.g. DRAFT, VOID, CANCELLED. */
  stamp?: string;
}

export const totalsRows = (S: SoapStore, t: DocTotals, label = "Total due"): PrintSpec["totals"] => [
  { k: "Subtotal", v: S.money(t.sub) },
  ...(t.disc ? [{ k: "Discounts", v: S.money(-t.disc) }] : []),
  { k: "Tax", v: S.money(t.tax) },
  ...(t.chargesTotal ? [{ k: "Additional charges", v: S.money(t.chargesTotal) }] : []),
  { k: label, v: S.money(t.total), strong: true },
];

/** Print with the document number as the window title (browsers use it as the PDF file name). */
export function printDocument(number: string) {
  const prev = document.title;
  document.title = number;
  window.print();
  setTimeout(() => { document.title = prev; }, 500);
}

/** Open the user's email client with a prefilled message. */
export function mailDocument(to: string, subject: string, body: string) {
  window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const cell = "border-b px-1.5 py-1.5 align-top";

export function DocumentSheet({ spec }: { spec: PrintSpec }) {
  const S = useSoap();
  const st = S.s.settings;
  const tableRows = spec.lines
    ? spec.lines.map((l) => {
        const c = S.lineCalc(l);
        return [l.name + (l.desc ? " — " + l.desc : "") + "\n" + l.sku, lineQty(S, l), S.money(l.uprice), l.discPct ? fmtNum(l.discPct) + "%" : "—", l.taxRate ? pct(l.taxRate) : "—", S.money(c.total)];
      })
    : spec.table?.rows || [];
  const cols = spec.lines ? ["Description", "Quantity", "Unit price", "Disc.", "Tax", "Amount"] : spec.table?.cols || [];
  const right = spec.lines ? [1, 2, 3, 4, 5] : spec.table?.right || [];
  return (
    <div className="relative flex flex-col gap-4 bg-white text-[12px] text-neutral-900">
      {spec.stamp && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 rounded-lg border-4 border-red-500/40 px-6 py-1 text-6xl font-black tracking-widest text-red-500/30">{spec.stamp}</span>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-neutral-900 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#2563eb] text-base font-bold text-white">SF</div>
          <div className="leading-snug">
            <div className="text-[15px] font-bold">{st.company}</div>
            <div className="text-neutral-600">{st.companyAddress}</div>
            <div className="text-neutral-600">{[st.companyPhone, st.companyEmail].filter(Boolean).join(" · ")}</div>
            {st.companyTin && <div className="text-neutral-600">TIN {st.companyTin}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold tracking-tight uppercase">{spec.title}</div>
          <div className="font-mono text-[13px] font-semibold">{spec.number}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {spec.party ? (
          <div className="leading-snug">
            <div className="mb-0.5 text-[10.5px] font-semibold tracking-wider text-neutral-500 uppercase">{spec.party.label}</div>
            <div className="font-semibold">{spec.party.p.name}</div>
            {spec.party.p.contact && spec.party.p.contact !== "—" && <div>Attn: {spec.party.p.contact}</div>}
            {spec.party.p.address && <div>{spec.party.p.address}</div>}
            <div>{[spec.party.p.phone, spec.party.p.email].filter(Boolean).join(" · ")}</div>
            {spec.party.p.tin && <div>TIN {spec.party.p.tin}</div>}
            {spec.party.shipTo && spec.party.p.delivAddr && <div className="mt-1"><span className="text-neutral-500">Deliver to:</span> {spec.party.p.delivAddr}</div>}
          </div>
        ) : <div />}
        <dl className="grid grid-cols-[auto_auto] content-start justify-end gap-x-4 gap-y-0.5">
          {spec.facts.map(([k, v]) => (
            <React.Fragment key={k}>
              <dt className="text-neutral-500">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>

      {cols.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>{cols.map((c, i) => <th key={c} className={`border-b-2 border-neutral-900 px-1.5 py-1 text-[10.5px] font-semibold tracking-wide uppercase ${right.includes(i) ? "text-right" : "text-left"}`}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i}>
                  {r.map((v, j) => (
                    <td key={j} className={`${cell} ${right.includes(j) ? "text-right whitespace-nowrap tabular-nums" : ""}`}>
                      {v.split("\n").map((t, k) => <div key={k} className={k ? "font-mono text-[10.5px] text-neutral-500" : undefined}>{t}</div>)}
                    </td>
                  ))}
                </tr>
              ))}
              {!tableRows.length && <tr><td colSpan={cols.length} className={`${cell} text-center text-neutral-500`}>No item lines.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-md min-w-0 flex-1 flex-col gap-2 leading-snug">
          {spec.payment && spec.payment.length > 0 && (
            <div>
              <div className="text-[10.5px] font-semibold tracking-wider text-neutral-500 uppercase">Payment information</div>
              {spec.payment.map((p, i) => <div key={i}>{p}</div>)}
            </div>
          )}
          {spec.notes && (
            <div>
              <div className="text-[10.5px] font-semibold tracking-wider text-neutral-500 uppercase">Notes</div>
              <div className="whitespace-pre-line">{spec.notes}</div>
            </div>
          )}
        </div>
        {spec.totals && (
          <dl className="grid min-w-[220px] grid-cols-[auto_auto] gap-x-6 gap-y-0.5">
            {spec.totals.map((t) => (
              <React.Fragment key={t.k}>
                <dt className={t.strong ? "border-t border-neutral-900 pt-1 font-bold" : "text-neutral-600"}>{t.k}</dt>
                <dd className={`text-right tabular-nums ${t.strong ? "border-t border-neutral-900 pt-1 font-bold" : ""}`}>{t.v}</dd>
              </React.Fragment>
            ))}
          </dl>
        )}
      </div>

      {spec.terms && (
        <div className="border-t pt-2 leading-snug">
          <div className="text-[10.5px] font-semibold tracking-wider text-neutral-500 uppercase">Terms &amp; conditions</div>
          <div className="whitespace-pre-line text-neutral-700">{spec.terms}</div>
        </div>
      )}
      {spec.signatures && spec.signatures.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-8">
          {spec.signatures.map((s) => <div key={s} className="border-t border-neutral-900 pt-1 text-neutral-600">{s}</div>)}
        </div>
      )}
      <div className="text-center text-[10px] text-neutral-400">Generated by SoapFlow · {S.fmtDate(S.TODAY)} · demonstration data</div>
    </div>
  );
}

/** Preview dialog with Print, Download PDF and (optionally) Email. While open, printing shows only the document. */
export function PrintDocDialog({ spec, onClose, email }: { spec: PrintSpec; onClose: () => void; email?: { to: string; subject: string; body: string; onSent?: () => void } }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg" hideClose className="sf-print-doc">
        <style>{`@media print { body * { visibility: hidden !important; } .sf-print-doc, .sf-print-doc * { visibility: visible !important; } .sf-print-doc { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; border: 0 !important; box-shadow: none !important; } @page { margin: 14mm; } }`}</style>
        <D.Title className="sr-only">{spec.title + " " + spec.number}</D.Title>
        <D.Description className="sr-only">Printable document</D.Description>
        <DialogBody className="px-5 py-6 sm:px-8">
          <DocumentSheet spec={spec} />
        </DialogBody>
        <DialogFooter className="no-print">
          <span className="mr-auto hidden text-[11.5px] text-muted-foreground sm:inline">Download PDF opens the print dialog — choose “Save as PDF”.</span>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {email && (
            <Button variant="outline" onClick={() => { mailDocument(email.to, email.subject, email.body); email.onSent?.(); }}>
              <Mail />Email
            </Button>
          )}
          <Button variant="outline" onClick={() => printDocument(spec.number)}><Download />Download PDF</Button>
          <Button onClick={() => printDocument(spec.number)}><Printer />Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
