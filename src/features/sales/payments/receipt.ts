import type { Payment, SoapStore } from "@/lib/store";
import type { PrintSpec } from "@/features/sales/shared/doc-print";

/** Printable payment receipt for a payment (number = receipt number). */
export function receiptSpec(S: SoapStore, p: Payment): PrintSpec {
  const c = S.cust(p.customer);
  const allocated = p.alloc.reduce((a, x) => a + x.amount, 0);
  return {
    title: "Payment receipt",
    number: p.rct,
    facts: [
      ["Receipt no.", p.rct],
      ["Payment ref.", p.id],
      ["Date received", S.fmtDate(p.date)],
      ["Method", p.method],
      ["Transaction ref.", p.extRef || "—"],
      ["Received by", S.uname(p.receivedBy)],
    ],
    party: { label: "Received from", p: { name: c.name, contact: c.contact, phone: c.phone, email: c.email, address: c.address, delivAddr: c.delivAddr, tin: c.tin } },
    table: {
      cols: ["Invoice", "Invoice date", "Invoice total", "Amount applied", "Balance remaining"],
      rows: p.alloc.map((a) => {
        const i = S.s.invoices.find((x) => x.id === a.inv);
        return [a.inv, i ? S.fmtDate(i.date) : "—", i ? S.money(i.total) : "—", S.money(a.amount), a.balAfter != null ? S.money(a.balAfter) : "—"];
      }),
      right: [2, 3, 4],
    },
    totals: [
      { k: "Amount received", v: S.money(p.amount), strong: true },
      { k: "Applied to invoices", v: S.money(allocated) },
      { k: "Held on account", v: S.money(p.unallocated || 0) },
    ],
    notes: [p.notes, p.status === "Reversed" ? "Reversed: " + (p.reversal || "") : ""].filter(Boolean).join("\n"),
    signatures: ["Received by — " + S.uname(p.receivedBy), "Customer"],
    stamp: p.status === "Reversed" ? "REVERSED" : undefined,
  };
}
