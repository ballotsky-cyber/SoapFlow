import type { Charge, DocTotals, Estimate, Invoice, SalesOrder, SoapStore } from "@/lib/store";
import type { PrintSpec } from "@/features/sales/shared/doc-print";

/* Print layouts for estimates, sales orders and invoices (see shared/doc-print). */

/** Subtotal → discounts → tax → each additional charge → total. */
export function totalsWithCharges(S: SoapStore, d: DocTotals & { charges: Charge[] }, label: string): NonNullable<PrintSpec["totals"]> {
  return [
    { k: "Subtotal", v: S.money(d.sub) },
    ...(d.disc ? [{ k: "Discounts", v: S.money(-d.disc) }] : []),
    { k: "Tax", v: S.money(d.tax) },
    ...d.charges.map((c) => ({ k: c.label, v: S.money(c.amount) })),
    { k: label, v: S.money(d.total), strong: true },
  ];
}

export function estimateSpec(S: SoapStore, e: Estimate): PrintSpec {
  const st = S.estStatus(e);
  return {
    title: "Quotation",
    number: e.id,
    facts: [
      ["Estimate date", S.fmtDate(e.date)],
      ["Valid until", S.fmtDate(e.expiry)],
      ...(e.ref ? ([["Customer ref", e.ref]] as [string, string][]) : []),
      ["Prepared by", S.uname(e.by)],
    ],
    party: { label: "Quotation for", p: e.party, shipTo: true },
    lines: e.lines,
    totals: totalsWithCharges(S, e, "Estimate total"),
    notes: e.notes,
    terms: e.terms || S.s.settings.termsEstimate,
    signatures: ["Prepared by", "Accepted by (customer) · date"],
    stamp: ["Expired", "Cancelled", "Rejected"].includes(st) ? st.toUpperCase() : st === "Draft" ? "DRAFT" : undefined,
  };
}

export function orderSpec(S: SoapStore, o: SalesOrder): PrintSpec {
  return {
    title: "Sales order",
    number: o.id,
    facts: [
      ["Order date", S.fmtDate(o.date)],
      ...(o.expected ? ([["Expected delivery", S.fmtDate(o.expected)]] as [string, string][]) : []),
      ["Warehouse", S.wh(o.wh).name],
      ["Fulfilment", o.method],
      ["Payment terms", o.terms === "Cash" ? "Cash" : "Credit · Net " + o.termsDays + " days"],
      ...(o.ref ? ([["Customer ref", o.ref]] as [string, string][]) : []),
      ...(o.est ? ([["Estimate", o.est]] as [string, string][]) : []),
    ],
    party: { label: "Customer", p: o.walkin ? { ...o.party, name: o.party.name + " — " + o.walkin } : o.party, shipTo: o.method === "Delivery" },
    lines: o.lines,
    totals: totalsWithCharges(S, o, "Order total"),
    notes: [o.method === "Delivery" && o.address ? "Delivery address: " + o.address : "", o.notes].filter(Boolean).join("\n"),
    terms: S.s.settings.termsOrder,
    signatures: ["Authorised by", "Customer acceptance"],
    stamp: o.status === "Cancelled" ? "CANCELLED" : o.status === "Draft" ? "DRAFT" : undefined,
  };
}

export function invoiceSpec(S: SoapStore, i: Invoice): PrintSpec {
  const st = S.invStatus(i);
  const bal = S.invBal(i);
  return {
    title: i.status === "Draft" ? "Draft invoice" : "Tax invoice",
    number: i.id,
    facts: [
      ["Invoice date", S.fmtDate(i.date)],
      ["Due date", S.fmtDate(i.due)],
      ["Payment terms", i.termsDays ? "Net " + i.termsDays + " days" : "Due on receipt"],
      ...(i.so ? ([["Sales order", i.so]] as [string, string][]) : []),
      ...(i.ref ? ([["Customer ref", i.ref]] as [string, string][]) : []),
      ["Warehouse", S.wh(i.wh).name],
    ],
    party: { label: "Bill to", p: i.party, shipTo: true },
    lines: i.lines,
    totals: [
      ...totalsWithCharges(S, i, "Invoice total"),
      ...(i.status === "Issued" ? [{ k: "Paid", v: S.money(-i.paid) }, ...(i.credited ? [{ k: "Credited", v: S.money(-i.credited) }] : []), { k: "Balance due", v: S.money(bal), strong: true }] : []),
    ],
    payment: [S.s.settings.bankDetails, "Quote " + i.id + " as the payment reference.", "Accepted: " + S.s.settings.paymentMethods.join(", ")],
    notes: i.notes,
    terms: S.s.settings.termsInvoice,
    signatures: ["Authorised signature", "Received by"],
    stamp: i.status === "Draft" ? "DRAFT" : i.status === "Void" ? "VOID" : i.status === "Cancelled" ? "CANCELLED" : st === "Paid" ? "PAID" : undefined,
  };
}
