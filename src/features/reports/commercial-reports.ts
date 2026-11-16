import type { Invoice, SoapStore } from "@/lib/store";
import { statusTextClass } from "@/components/shared/status-badge";
import type { Align, Cell, Col, ReportOut } from "./build-report";

/* Sales & receivables reports, built from issued invoices, credit notes, estimates and payments (no synthetic series). */

const RED = "text-danger";
const GREY = "text-muted-foreground";
type CellOpts = { cls?: string; bold?: boolean };
const C = (v: unknown, o?: CellOpts): Cell => ({ v: v == null ? "" : String(v), align: "left", ...o });
const R = (v: unknown, o?: CellOpts): Cell => ({ ...C(v, o), align: "right" });
const col = (label: string, align: Align = "left"): Col => ({ label, align });
const g2 = (m: number) => (m / 100).toFixed(2);
const KIND: Record<string, string> = { SO: "From sales order", Direct: "Direct", Legacy: "Opening balance" };
export const COMMERCIAL_REPORTS = ["sales-customer", "sales-warehouse", "sales-product", "estimates", "inv-register", "inv-status", "collections", "cust-balances"];

export function buildCommercialReport(key: string, S: SoapStore, whs: string[], from: string, to: string, brand: string, sku: string, customer: string): ReportOut {
  const s = S.s;
  const M = S.money;
  const inD = (d?: string) => !!d && d.slice(0, 10) >= from && d.slice(0, 10) <= to;
  const pOk = (x: string) => (!brand || S.prod(x).brand === brand) && (!sku || x === sku);
  const cOk = (c: string) => !customer || c === customer;
  const out: ReportOut = { cols: [], rows: [], raw: [], summary: [] };
  const add = (cells: Cell[], raw?: (string | number)[]) => {
    out.rows.push(cells);
    out.raw.push(raw || cells.map((c) => c.v));
  };
  const issuedIn = (i: Invoice) => i.status === "Issued" && whs.includes(i.wh) && cOk(i.customer);

  if (key === "sales-customer" || key === "sales-warehouse") {
    const byC = key === "sales-customer";
    type Agg = { n: number; gross: number; disc: number; charges: number; credit: number; tax: number; total: number };
    const g: Record<string, Agg> = {};
    const row = (k: string) => (g[k] ||= { n: 0, gross: 0, disc: 0, charges: 0, credit: 0, tax: 0, total: 0 });
    s.invoices.filter((i) => issuedIn(i) && inD(i.date)).forEach((i) => { const r = row(byC ? i.customer : i.wh); r.n++; r.gross += i.sub; r.disc += i.disc; r.charges += i.chargesTotal; r.tax += i.tax; r.total += i.total; });
    s.creditNotes.filter((n) => whs.includes(n.wh) && inD(n.date) && cOk(n.customer)).forEach((n) => { const r = row(byC ? n.customer : n.wh); r.credit += n.net; r.tax -= n.tax; r.total -= n.amount; });
    const net = (r: Agg) => r.gross - r.disc + r.charges - r.credit;
    out.cols = [col(byC ? "Customer" : "Warehouse"), col("Invoices", "right"), col("Gross sales", "right"), col("Discounts", "right"), col("Charges", "right"), col("Credit notes", "right"), col("Net sales (excl. tax)", "right"), col("Tax", "right"), col("Total incl. tax", "right")];
    const keys = Object.keys(g).sort((a, b) => net(g[b]) - net(g[a]));
    const T: Agg = { n: 0, gross: 0, disc: 0, charges: 0, credit: 0, tax: 0, total: 0 };
    keys.forEach((k) => {
      const r = g[k];
      (Object.keys(T) as (keyof Agg)[]).forEach((f) => (T[f] += r[f]));
      const name = byC ? S.cust(k).name : S.wh(k).name;
      add([C(name), R(r.n), R(M(r.gross)), R(M(-r.disc)), R(M(r.charges)), R(M(-r.credit)), R(M(net(r)), { bold: true }), R(M(r.tax)), R(M(r.total))], [name, r.n, g2(r.gross), g2(-r.disc), g2(r.charges), g2(-r.credit), g2(net(r)), g2(r.tax), g2(r.total)]);
    });
    if (keys.length) out.rows.push([C("Total", { bold: true }), R(T.n, { bold: true }), R(M(T.gross)), R(M(-T.disc)), R(M(T.charges)), R(M(-T.credit)), R(M(net(T)), { bold: true }), R(M(T.tax)), R(M(T.total), { bold: true })]);
    out.summary = [
      { k: "Net sales (excl. tax)", v: M(net(T)), s: "issued invoices less credit notes" },
      { k: "Invoices issued", v: String(T.n) },
      { k: "Credit notes", v: M(T.credit), s: "net of tax", tone: T.credit ? "warning" : "default" },
      { k: byC ? "Customers" : "Warehouses", v: String(keys.length) },
    ];
  } else if (key === "sales-product") {
    type Agg = { q: number; gross: number; disc: number; retQ: number; ret: number };
    const g: Record<string, Agg> = {};
    const row = (k: string) => (g[k] ||= { q: 0, gross: 0, disc: 0, retQ: 0, ret: 0 });
    s.invoices.filter((i) => issuedIn(i) && inD(i.date)).forEach((i) => i.lines.filter((l) => pOk(l.sku)).forEach((l) => { const c = S.lineCalc(l); const r = row(l.sku); r.q += l.qty; r.gross += c.gross; r.disc += c.disc; }));
    s.creditNotes.filter((n) => whs.includes(n.wh) && inD(n.date) && cOk(n.customer)).forEach((n) => n.lines.filter((l) => pOk(l.sku)).forEach((l) => { const r = row(l.sku); r.retQ += l.qty; r.ret += l.net; }));
    const net = (r: Agg) => r.gross - r.disc - r.ret;
    out.cols = [col("SKU"), col("Product"), col("Brand"), col("Invoiced qty", "right"), col("Returned qty", "right"), col("Gross", "right"), col("Discounts", "right"), col("Returns credited", "right"), col("Net sales", "right"), col("Avg net / base unit", "right")];
    const keys = Object.keys(g).sort((a, b) => net(g[b]) - net(g[a]));
    let tn = 0;
    keys.forEach((k) => {
      const r = g[k]; const nq = r.q - r.retQ; const p = S.prod(k); tn += net(r);
      add(
        [C(k), C(p.name), C(p.brand), R(S.qty(k, r.q)), R(r.retQ ? S.qty(k, r.retQ) : "—"), R(M(r.gross)), R(M(-r.disc)), R(M(-r.ret)), R(M(net(r)), { bold: true }), R(nq > 0 ? M(Math.round(net(r) / nq)) : "—")],
        [k, p.name, p.brand, r.q, r.retQ, g2(r.gross), g2(-r.disc), g2(-r.ret), g2(net(r)), nq > 0 ? (net(r) / nq / 100).toFixed(4) : ""],
      );
    });
    out.summary = [
      { k: "Net product sales", v: M(tn), s: "excl. tax and charges" },
      { k: "Products sold", v: String(keys.length) },
      { k: "Amount-only credit notes", v: M(s.creditNotes.filter((n) => !n.lines.length && whs.includes(n.wh) && inD(n.date) && cOk(n.customer)).reduce((a, n) => a + n.net, 0)), s: "not attributable to a product" },
    ];
  } else if (key === "estimates") {
    const es = s.estimates.filter((e) => (!e.wh || whs.includes(e.wh)) && inD(e.date) && cOk(e.customer));
    out.cols = [col("Estimate"), col("Date"), col("Customer"), col("Valid until"), col("Value", "right"), col("Status"), col("Sales order"), col("Order status")];
    es.forEach((e) => {
      const st = S.estStatus(e); const o = e.so ? s.salesOrders.find((x) => x.id === e.so) : undefined;
      add([C(e.id), C(S.fmtDate(e.date)), C(S.cust(e.customer).name), C(S.fmtDate(e.expiry)), R(M(e.total)), C(st, { cls: statusTextClass(st) }), C(e.so || "—"), C(o ? o.status : "—")], [e.id, e.date, S.cust(e.customer).name, e.expiry, g2(e.total), st, e.so || "", o ? o.status : ""]);
    });
    const acc = es.filter((e) => ["Accepted", "Converted"].includes(e.status));
    const conv = es.filter((e) => e.status === "Converted");
    const decided = es.filter((e) => ["Accepted", "Converted", "Rejected"].includes(e.status) || S.estStatus(e) === "Expired");
    out.summary = [
      { k: "Estimates created", v: String(es.length), s: M(es.reduce((a, e) => a + e.total, 0)) + " quoted" },
      { k: "Accepted", v: String(acc.length), s: M(acc.reduce((a, e) => a + e.total, 0)), tone: "success" },
      { k: "Converted to orders", v: String(conv.length), s: M(conv.reduce((a, e) => a + e.total, 0)) },
      { k: "Conversion rate", v: es.length ? Math.round((conv.length * 1000) / es.length) / 10 + "%" : "—", s: "converted ÷ created" },
      { k: "Win rate", v: decided.length ? Math.round((acc.length * 1000) / decided.length) / 10 + "%" : "—", s: "accepted ÷ decided (incl. expired)" },
    ];
  } else if (key === "inv-register") {
    const inv = s.invoices.filter((i) => whs.includes(i.wh) && inD(i.date) && cOk(i.customer)).sort((a, b) => (a.id < b.id ? -1 : 1));
    out.cols = [col("Invoice"), col("Date"), col("Due"), col("Customer"), col("Origin"), col("Sales order"), col("Status"), col("Subtotal", "right"), col("Discounts", "right"), col("Tax", "right"), col("Charges", "right"), col("Total", "right"), col("Paid", "right"), col("Credited", "right"), col("Balance", "right")];
    inv.forEach((i) => {
      const st = S.invStatus(i);
      add(
        [C(i.id), C(S.fmtDate(i.date)), C(S.fmtDate(i.due)), C(S.cust(i.customer).name), C(KIND[i.kind] || i.kind), C(i.so || "—"), C(st, { cls: statusTextClass(st) }), R(M(i.sub)), R(M(-i.disc)), R(M(i.tax)), R(M(i.chargesTotal)), R(M(i.total), { bold: i.status === "Issued", cls: i.status === "Issued" ? undefined : GREY }), R(M(i.paid)), R(M(i.credited)), R(M(S.invBal(i)))],
        [i.id, i.date, i.due, S.cust(i.customer).name, KIND[i.kind] || i.kind, i.so || "", st, g2(i.sub), g2(-i.disc), g2(i.tax), g2(i.chargesTotal), g2(i.total), g2(i.paid), g2(i.credited), g2(S.invBal(i))],
      );
    });
    const iss = inv.filter((i) => i.status === "Issued");
    out.summary = [
      { k: "Invoices", v: String(inv.length), s: iss.length + " issued · " + inv.filter((i) => i.status === "Draft").length + " draft · " + inv.filter((i) => ["Void", "Cancelled"].includes(i.status)).length + " void/cancelled" },
      { k: "Issued value", v: M(iss.reduce((a, i) => a + i.total, 0)), s: "incl. tax " + M(iss.reduce((a, i) => a + i.tax, 0)) },
      { k: "From orders / direct", v: iss.filter((i) => i.kind === "SO").length + " / " + iss.filter((i) => i.kind === "Direct").length },
      { k: "Outstanding", v: M(iss.reduce((a, i) => a + S.invBal(i), 0)), tone: "warning" },
    ];
  } else if (key === "inv-status") {
    const ORDER = ["Overdue", "Issued", "Partially Paid", "Paid", "Credited"];
    const LABEL: Record<string, string> = { Issued: "Unpaid (not yet due)", Overdue: "Overdue", "Partially Paid": "Partially paid", Paid: "Paid", Credited: "Credited" };
    const inv = s.invoices.filter(issuedIn);
    out.cols = [col("Status"), col("Invoice"), col("Customer"), col("Date"), col("Due"), col("Days overdue", "right"), col("Total", "right"), col("Paid", "right"), col("Credited", "right"), col("Balance", "right")];
    ORDER.forEach((st) =>
      inv
        .filter((i) => S.invStatus(i) === st)
        .sort((a, b) => (a.due < b.due ? -1 : 1))
        .forEach((i) => {
          const od = Math.max(0, S.diffDays(S.TODAY, i.due));
          add(
            [C(LABEL[st], { cls: statusTextClass(st) }), C(i.id), C(S.cust(i.customer).name), C(S.fmtDate(i.date)), C(S.fmtDate(i.due)), R(st === "Overdue" ? od : "—", { cls: st === "Overdue" ? RED : undefined }), R(M(i.total)), R(M(i.paid)), R(M(i.credited)), R(M(S.invBal(i)), { bold: true })],
            [LABEL[st], i.id, S.cust(i.customer).name, i.date, i.due, st === "Overdue" ? od : "", g2(i.total), g2(i.paid), g2(i.credited), g2(S.invBal(i))],
          );
        }),
    );
    const by = (st: string) => inv.filter((i) => S.invStatus(i) === st);
    out.summary = [
      { k: "Paid", v: String(by("Paid").length), s: M(by("Paid").reduce((a, i) => a + i.total, 0)), tone: "success" },
      { k: "Partially paid", v: String(by("Partially Paid").length), s: M(by("Partially Paid").reduce((a, i) => a + S.invBal(i), 0)) + " outstanding", tone: "warning" },
      { k: "Unpaid (not yet due)", v: String(by("Issued").length), s: M(by("Issued").reduce((a, i) => a + S.invBal(i), 0)) },
      { k: "Overdue", v: String(by("Overdue").length), s: M(by("Overdue").reduce((a, i) => a + S.invBal(i), 0)), tone: "danger" },
    ];
  } else if (key === "collections") {
    const scoped = new Set(s.invoices.filter((i) => whs.includes(i.wh)).map((i) => i.id));
    const ps = s.payments.filter((p) => inD(p.date) && cOk(p.customer) && (!p.alloc.length || p.alloc.some((a) => scoped.has(a.inv)))).sort((a, b) => (a.date < b.date ? -1 : 1));
    out.cols = [col("Payment"), col("Receipt"), col("Date"), col("Customer"), col("Method"), col("Transaction ref."), col("Applied to"), col("Amount", "right"), col("On account", "right"), col("Received by"), col("Status")];
    ps.forEach((p) =>
      add(
        [C(p.id), C(p.rct), C(S.fmtDate(p.date)), C(S.cust(p.customer).name), C(p.method), C(p.extRef || "—"), C(p.alloc.map((a) => a.inv).join(", ") || "—"), R(M(p.amount), { bold: p.status !== "Reversed", cls: p.status === "Reversed" ? GREY : undefined }), R(M(p.unallocated || 0)), C(S.uname(p.receivedBy)), C(p.status, { cls: statusTextClass(p.status) })],
        [p.id, p.rct, p.date, S.cust(p.customer).name, p.method, p.extRef, p.alloc.map((a) => a.inv + ":" + g2(a.amount)).join(" "), g2(p.amount), g2(p.unallocated || 0), S.uname(p.receivedBy), p.status],
      ),
    );
    const live = ps.filter((p) => p.status !== "Reversed");
    const byM: Record<string, number> = {};
    live.forEach((p) => (byM[p.method] = (byM[p.method] || 0) + p.amount));
    out.summary = [
      { k: "Collected", v: M(live.reduce((a, p) => a + p.amount, 0)), s: live.length + " payments, excl. reversed", tone: "success" },
      { k: "Awaiting verification", v: M(live.filter((p) => p.status === "Recorded").reduce((a, p) => a + p.amount, 0)), tone: "warning" },
      ...Object.keys(byM)
        .sort((a, b) => byM[b] - byM[a])
        .slice(0, 3)
        .map((m) => ({ k: m, v: M(byM[m]) })),
    ];
    const days = Math.max(1, Math.min(120, S.diffDays(to, from) + 1));
    out.chart = Array.from({ length: days }, (_, k) => {
      const d = S.addDays(to, -(days - 1 - k));
      const dp = live.filter((p) => p.date === d);
      const tot = dp.reduce((a, p) => a + p.amount, 0);
      const ver = dp.filter((p) => p.status === "Verified").reduce((a, p) => a + p.amount, 0);
      return { total: tot, top: tot ? Math.round((ver / tot) * 100) : 0, title: S.fmtDate(d) + ": collected " + M(tot) + " · verified " + M(ver) };
    });
    out.chartTitle = "Daily collections";
    out.chartLegend = "Green = verified against statement · grey = recorded, awaiting verification";
  } else if (key === "cust-balances") {
    out.cols = [col("Customer"), col("Terms"), col("Invoiced", "right"), col("Paid", "right"), col("Credited", "right"), col("On account", "right"), col("Balance", "right"), col("Overdue", "right"), col("Credit limit", "right"), col("Available credit", "right")];
    const T = [0, 0, 0, 0, 0, 0];
    s.customers
      .filter((c) => cOk(c.id))
      .forEach((c) => {
        const inv = s.invoices.filter((i) => i.customer === c.id && i.status === "Issued" && whs.includes(i.wh));
        const onAcc = s.payments.filter((p) => p.customer === c.id && p.status !== "Reversed").reduce((a, p) => a + (p.unallocated || 0), 0);
        if (!inv.length && !onAcc) return;
        const tot = inv.reduce((a, i) => a + i.total, 0);
        const pd = inv.reduce((a, i) => a + i.paid, 0);
        const cr = inv.reduce((a, i) => a + i.credited, 0);
        const bal = inv.reduce((a, i) => a + S.invBal(i), 0) - onAcc;
        const od = inv.filter((i) => S.invStatus(i) === "Overdue").reduce((a, i) => a + S.invBal(i), 0);
        [tot, pd, cr, onAcc, bal, od].forEach((v, k) => (T[k] += v));
        add(
          [C(c.name), C(c.terms ? "Net " + c.terms : "Cash"), R(M(tot)), R(M(pd)), R(M(cr)), R(M(onAcc)), R(M(bal), { bold: true }), R(od ? M(od) : "—", { cls: od ? RED : undefined }), R(c.limit ? M(c.limit) : "—"), R(c.limit ? M(c.limit - bal) : "—", { cls: c.limit && bal > c.limit ? RED : undefined })],
          [c.name, c.terms, g2(tot), g2(pd), g2(cr), g2(onAcc), g2(bal), g2(od), g2(c.limit), c.limit ? g2(c.limit - bal) : ""],
        );
      });
    out.summary = [
      { k: "Total outstanding", v: M(T[4]), s: "issued invoices less on-account credit" },
      { k: "Overdue", v: M(T[5]), tone: "danger" },
      { k: "Credited", v: M(T[2]) },
      { k: "Held on account", v: M(T[3]) },
    ];
  }
  return out;
}
