import type { SoapStore } from "@/lib/store";
import { statusTextClass } from "@/components/shared/status-badge";

/* Report builder — a straight port of the prototype's build(). Colours are expressed as token text classes. */

export type Align = "left" | "right";
export interface Cell { v: string; align: Align; cls?: string; bold?: boolean }
export interface Col { label: string; align: Align }
export interface SummaryItem { k: string; v: string; s?: string; tone?: "default" | "success" | "warning" | "danger" }
export interface ChartBar { total: number; top: number; title: string }
export interface ReportOut {
  cols: Col[];
  rows: Cell[][];
  raw: (string | number)[][];
  summary: SummaryItem[];
  chart?: ChartBar[];
  chartTitle?: string;
  chartLegend?: string;
}

const RED = "text-danger";
const AMBER = "text-warning";
const GREEN = "text-success";
const VIOLET = "text-violet";
const GREY = "text-muted-foreground";

type CellOpts = { cls?: string; bold?: boolean };
const C = (v: unknown, o?: CellOpts): Cell => ({ v: v == null ? "" : String(v), align: "left", ...o });
const R = (v: unknown, o?: CellOpts): Cell => ({ ...C(v, o), align: "right" });
const col = (label: string, align: Align = "left"): Col => ({ label, align });

export function buildReport(key: string, S: SoapStore, whs: string[], from: string, to: string, brand: string, sku: string): ReportOut {
  const s = S.s;
  const inD = (d?: string) => !!d && d.slice(0, 10) >= from && d.slice(0, 10) <= to;
  const pOk = (x: string) => (!brand || S.prod(x).brand === brand) && (!sku || x === sku);
  const M = S.money;
  const out: ReportOut = { cols: [], rows: [], raw: [], summary: [] };
  const add = (cells: Cell[], raw?: (string | number)[]) => {
    out.rows.push(cells);
    out.raw.push(raw || cells.map((c) => c.v));
  };

  if (key === "stock" || key === "consolidated" || key === "valuation" || key === "low") {
    const cons = key === "consolidated";
    let rows = S.stockRows({ whs, consolidated: cons }).filter((r) => pOk(r.sku));
    if (key === "low") rows = rows.filter((r) => ["Low", "Out of stock"].includes(r.reorder));
    if (key === "valuation") rows = rows.filter((r) => r.sellable > 0);
    if (key === "valuation") {
      out.cols = [col("SKU"), col("Product"), col("Warehouse"), col("Sellable bars", "right"), col("Avg cost / bar", "right"), col("Value", "right")];
      rows.forEach((r) =>
        add([C(r.sku), C(S.prod(r.sku).name), C(S.wh(r.wh).name), R(S.commas(r.sellable)), R(S.cost(r.avg)), R(M(r.value))], [r.sku, S.prod(r.sku).name, r.wh, r.sellable, (r.avg / 10000).toFixed(4), (r.value / 100).toFixed(2)]),
      );
      const tv = rows.reduce((a, r) => a + r.value, 0);
      out.summary = [
        { k: "Inventory value (at cost)", v: M(tv), s: "Sellable stock only" },
        { k: "Stock lines", v: String(rows.length) },
        { k: "Excluded: damaged/quarantined", v: S.commas(S.stockRows({ whs }).reduce((a, r) => a + r.damaged + r.quarantined, 0)) + " bars", s: "Not valued as sellable" },
      ];
      out.rows.push([C("Total", { bold: true }), C(""), C(""), R(""), R(""), R(M(tv), { bold: true })]);
    } else {
      out.cols = [col("SKU"), col("Product"), col(cons ? "Warehouses" : "Warehouse"), col("Physical", "right"), col("Sellable", "right"), col("Reserved", "right"), col("Available", "right"), col("In transit", "right"), col("Min.", "right"), col("Status")];
      rows.forEach((r) =>
        add(
          [C(r.sku), C(S.prod(r.sku).name), C(cons ? whs.length + " sites" : S.wh(r.wh).name), R(S.qty(r.sku, r.physical)), R(S.qty(r.sku, r.sellable)), R(S.qty(r.sku, r.reserved)), R(S.qty(r.sku, r.available), { bold: true }), R(S.qty(r.sku, r.inTransit)), R(S.qty(r.sku, r.min)), C(r.reorder, { cls: statusTextClass(r.reorder) })],
          [r.sku, S.prod(r.sku).name, cons ? "ALL" : r.wh, r.physical, r.sellable, r.reserved, r.available, r.inTransit, r.min, r.reorder],
        ),
      );
      out.summary = [
        { k: "Stock lines", v: String(rows.length) },
        { k: "Available (bars)", v: S.commas(rows.reduce((a, r) => a + r.available, 0)) },
        { k: "Reserved (bars)", v: S.commas(rows.reduce((a, r) => a + r.reserved, 0)) },
        { k: "Low / out of stock", v: String(rows.filter((r) => r.reorder !== "OK").length), tone: "warning" },
      ];
    }
  } else if (key === "held") {
    out.cols = [col("Category"), col("Product"), col("Warehouse"), col("Quantity", "right"), col("Detail")];
    S.stockRows({ whs })
      .filter((r) => pOk(r.sku))
      .forEach((r) => {
        if (r.damaged) add([C("Damaged", { cls: RED }), C(r.sku), C(S.wh(r.wh).name), R(S.qty(r.sku, r.damaged)), C("Held outside sellable stock")]);
        if (r.quarantined) add([C("Quarantined", { cls: AMBER }), C(r.sku), C(S.wh(r.wh).name), R(S.qty(r.sku, r.quarantined)), C("Awaiting inspection / returns / expired")]);
      });
    s.movements
      .filter((m) => m.type === "Delivery return" && whs.includes(m.wh) && inD(m.ts) && pOk(m.sku))
      .forEach((m) => add([C("Returned", { cls: VIOLET }), C(m.sku), C(S.wh(m.wh).name), R(S.qty(m.sku, m.qty)), C(m.ref + " · " + S.fmtDate(m.ts))]));
    s.batches
      .filter((b) => b.qty > 0 && whs.includes(b.wh) && b.exp < S.TODAY && pOk(b.sku))
      .forEach((b) => add([C("Expired", { cls: RED }), C(b.sku), C(S.wh(b.wh).name), R(S.qty(b.sku, b.qty)), C("Batch " + b.batch + " · expired " + S.fmtDate(b.exp) + " · dispatch blocked")]));
  } else if (key === "received") {
    out.cols = [col("Date"), col("Receipt"), col("Supplier"), col("Warehouse"), col("Product"), col("Expected", "right"), col("Accepted", "right"), col("Damaged", "right"), col("Rejected", "right"), col("Short", "right")];
    const posted = s.receipts.filter((r) => r.status === "Posted" && whs.includes(r.wh) && inD(r.postedAt));
    posted.forEach((r) =>
      r.lines
        .filter((l) => pOk(l.sku))
        .forEach((l) =>
          add([
            C(S.fmtDate(r.postedAt)), C(r.id), C(S.sup(r.supplier).name), C(S.wh(r.wh).name), C(l.sku),
            R(S.qty(l.sku, l.expected)), R(S.qty(l.sku, l.accepted), { cls: GREEN }), R(S.qty(l.sku, l.damaged)), R(S.qty(l.sku, l.rejected)), R(S.qty(l.sku, Math.max(0, l.expected - l.counted))),
          ]),
        ),
    );
    const bySup: Record<string, number> = {};
    posted.forEach((r) => (bySup[r.supplier] = (bySup[r.supplier] || 0) + r.lines.reduce((a, l) => a + l.accepted, 0)));
    out.summary = Object.keys(bySup).map((k) => ({ k: S.sup(k).name, v: S.commas(bySup[k]) + " bars", s: "accepted" }));
  } else if (key === "ledger") {
    out.cols = [col("When"), col("Movement"), col("Type"), col("Warehouse"), col("SKU"), col("Bucket"), col("Qty (bars)", "right"), col("Unit cost", "right"), col("Reference"), col("User")];
    s.movements
      .filter((m) => whs.includes(m.wh) && inD(m.ts) && pOk(m.sku))
      .forEach((m) => add([C(S.fmtDate(m.ts)), C(m.id), C(m.type), C(S.wh(m.wh).name), C(m.sku), C(m.bucket), R((m.qty > 0 ? "+" : "") + S.commas(m.qty), { cls: m.qty < 0 ? RED : GREEN }), R(S.cost(m.cost4)), C(m.ref), C(S.uname(m.user))]));
  } else if (key === "transfers") {
    out.cols = [col("Transfer"), col("From"), col("To"), col("Requested"), col("Status"), col("Product"), col("Requested", "right"), col("Dispatched", "right"), col("Received", "right"), col("Discrepancy", "right")];
    s.transfers
      .filter((t) => (whs.includes(t.from) || whs.includes(t.to)) && inD(t.date))
      .forEach((t) =>
        t.lines
          .filter((l) => pOk(l.sku))
          .forEach((l) => {
            const done = ["Received", "Disputed"].includes(t.status);
            add([
              C(t.id), C(S.wh(t.from).name), C(S.wh(t.to).name), C(S.fmtDate(t.date)), C(t.status, { cls: statusTextClass(t.status) }), C(l.sku),
              R(S.qty(l.sku, l.req)), R(S.qty(l.sku, l.disp)), R(S.qty(l.sku, l.recv)),
              R(l.disp && done ? S.qty(l.sku, l.disp - l.recv) : "—", { cls: l.disp > l.recv && done ? RED : undefined }),
            ]);
          }),
      );
  } else if (key === "counts") {
    out.cols = [col("Session"), col("Warehouse / location"), col("Product"), col("Expected", "right"), col("Counted", "right"), col("Variance", "right"), col("Reason"), col("Adjustment"), col("Status")];
    s.counts
      .filter((c) => whs.includes(c.wh))
      .forEach((c) =>
        c.lines
          .filter((l) => l.counted != null && pOk(l.sku))
          .forEach((l) => {
            const v = l.counted - l.expected;
            const a = s.adjustments.find((x) => x.id === l.adj) || s.adjustments.find((x) => x.count === c.id && x.sku === l.sku);
            add([
              C(c.id), C(S.wh(c.wh).name + " · " + c.location), C(l.sku), R(S.qty(l.sku, l.expected)), R(S.qty(l.sku, l.counted)),
              R(v ? (v > 0 ? "+" : "") + S.qty(l.sku, v) : "0", { cls: v < 0 ? RED : v > 0 ? GREEN : GREY }),
              C(l.reason || "—"), C(a ? a.id : "—"), C(a ? a.status : c.status),
            ]);
          }),
      );
  } else if (key === "sales") {
    out.cols = [col("Order"), col("Date"), col("Customer"), col("Warehouse"), col("Method"), col("Terms"), col("Status"), col("Order value", "right"), col("Supplied (bars)", "right")];
    const os = s.salesOrders.filter((o) => whs.includes(o.wh) && inD(o.date) && o.lines.some((l) => pOk(l.sku)));
    os.forEach((o) =>
      add([C(o.id), C(S.fmtDate(o.date)), C(S.cust(o.customer).name), C(S.wh(o.wh).name), C(o.method), C(o.terms), C(o.status, { cls: statusTextClass(o.status) }), R(M(S.soTotal(o))), R(S.commas(o.lines.reduce((a, l) => a + l.fulfilled, 0)))]),
    );
    out.summary = [
      { k: "Orders", v: String(os.length) },
      { k: "Order value", v: M(os.filter((o) => o.status !== "Cancelled").reduce((a, o) => a + S.soTotal(o), 0)), s: "excl. cancelled" },
      { k: "Cash / credit", v: os.filter((o) => o.terms === "Cash").length + " / " + os.filter((o) => o.terms === "Credit").length },
    ];
  } else if (key === "dispatch") {
    out.cols = [col("Dispatch"), col("Order"), col("Customer"), col("Warehouse"), col("Method"), col("Status"), col("Dispatched"), col("Officer / collector"), col("Proof of delivery")];
    s.dispatches
      .filter((d) => whs.includes(d.wh) && inD(d.dispatchedAt || d.date))
      .forEach((d) => {
        const o = s.salesOrders.find((x) => x.id === d.so);
        add([C(d.id), C(d.so), C(o ? S.cust(o.customer).name : ""), C(S.wh(d.wh).name), C(d.method), C(d.status, { cls: statusTextClass(d.status) }), C(S.fmtDate(d.dispatchedAt)), C(d.driver ? S.uname(d.driver) : d.collector || "—"), C(d.pod || d.collectorId || "—")]);
      });
  } else if (key === "receivables") {
    out.cols = [col("Customer"), col("Current", "right"), col("1–30 days", "right"), col("31–60 days", "right"), col("60+ days", "right"), col("Total outstanding", "right"), col("Credit limit", "right")];
    const tot = [0, 0, 0, 0];
    s.customers.forEach((c) => {
      const b = [0, 0, 0, 0];
      s.invoices
        .filter((i) => i.customer === c.id && whs.includes(i.wh) && S.invBal(i) > 0)
        .forEach((i) => {
          const od = S.diffDays(S.TODAY, i.due);
          const k = od <= 0 ? 0 : od <= 30 ? 1 : od <= 60 ? 2 : 3;
          b[k] += S.invBal(i);
        });
      const t = b.reduce((a, x) => a + x, 0);
      if (!t) return;
      b.forEach((x, i) => (tot[i] += x));
      add([C(c.name), R(M(b[0])), R(M(b[1]), { cls: b[1] ? AMBER : undefined }), R(M(b[2]), { cls: b[2] ? RED : undefined }), R(M(b[3]), { cls: b[3] ? RED : undefined }), R(M(t), { bold: true }), R(c.limit ? M(c.limit) : "—")]);
    });
    out.summary = [
      { k: "Total receivables", v: M(tot.reduce((a, x) => a + x, 0)) },
      { k: "Current", v: M(tot[0]) },
      { k: "Overdue", v: M(tot[1] + tot[2] + tot[3]), tone: "danger" },
      { k: "Unverified receipts", v: M(s.payments.filter((p) => p.status === "Recorded").reduce((a: number, p) => a + p.amount, 0)), s: "recorded, awaiting verification" },
    ];
  } else if (key === "payables") {
    out.cols = [col("Supplier"), col("Invoice"), col("PO"), col("Due"), col("Total", "right"), col("Paid", "right"), col("Balance", "right"), col("Match")];
    s.supplierInvoices.forEach((i) => {
      const mm = S.sinvMatch(i);
      add([C(S.sup(i.supplier).name), C(i.id), C(i.po), C(S.fmtDate(i.due), { cls: i.due < S.TODAY && i.total > i.paid ? RED : undefined }), R(M(i.total)), R(M(i.paid)), R(M(i.total - i.paid), { bold: true }), C(mm.length ? "Mismatch" : "Matched", { cls: mm.length ? RED : GREEN })]);
    });
    out.summary = [
      { k: "Total payables", v: M(s.supplierInvoices.reduce((a: number, i) => a + i.total - i.paid, 0)) },
      { k: "Mismatched invoices", v: String(s.supplierInvoices.filter((i) => S.sinvMatch(i).length).length), tone: "danger" },
    ];
  } else if (key === "pnl" || key === "cogs") {
    const days = S.diffDays(to, from) + 1;
    const offset = S.diffDays(S.TODAY, to);
    const P = S.period(days + offset, whs);
    const daily = P.daily.filter((d) => d.date >= from && d.date <= to);
    const rev = daily.reduce((a, d) => a + d.rev, 0);
    const cogs = daily.reduce((a, d) => a + d.cogs, 0);
    const gp = rev - cogs;
    const exp = s.expenses.filter((e) => e.status === "Approved" && whs.includes(e.wh) && inD(e.date)).reduce((a: number, e) => a + e.amount, 0);
    if (key === "pnl") {
      out.summary = [
        { k: "Sales revenue", v: M(rev), s: "invoiced, net of credit notes" },
        { k: "Cost of goods sold", v: M(cogs), s: "weighted-average cost" },
        { k: "Gross profit", v: M(gp), s: (rev ? Math.round((gp * 1000) / rev) / 10 : 0) + "% gross margin", tone: "success" },
        { k: "Operating expenses", v: M(exp), s: "approved only" },
        { k: "Operating profit (indicative)", v: M(gp - exp), s: "before tax & financing", tone: gp - exp < 0 ? "danger" : "default" },
      ];
      out.cols = [col("Warehouse"), col("Revenue", "right"), col("COGS", "right"), col("Gross profit", "right"), col("Margin", "right"), col("Expenses", "right")];
      whs.forEach((w) => {
        const pw = S.period(days + offset, [w]).daily.filter((d) => d.date >= from && d.date <= to);
        const r = pw.reduce((a, d) => a + d.rev, 0);
        const c = pw.reduce((a, d) => a + d.cogs, 0);
        const e = s.expenses.filter((x) => x.status === "Approved" && x.wh === w && inD(x.date)).reduce((a: number, x) => a + x.amount, 0);
        add([C(S.wh(w).name), R(M(r)), R(M(c)), R(M(r - c), { bold: true }), R(r ? Math.round(((r - c) * 1000) / r) / 10 + "%" : "—"), R(M(e))]);
      });
      out.chart = daily.map((d) => ({ total: d.rev, top: d.rev ? Math.round(((d.rev - d.cogs) / d.rev) * 100) : 0, title: S.fmtDate(d.date) + ": revenue " + M(d.rev) + ", GP " + M(d.rev - d.cogs) }));
      out.chartTitle = "Daily revenue split into gross profit and COGS";
      out.chartLegend = "Green = gross profit · grey = COGS";
    } else {
      out.cols = [col("SKU"), col("Product"), col("Bars dispatched", "right"), col("COGS (live postings)", "right"), col("Avg unit cost", "right")];
      const by: Record<string, { q: number; v: number }> = {};
      s.movements
        .filter((m) => m.type === "Sales dispatch" && whs.includes(m.wh) && inD(m.ts) && pOk(m.sku))
        .forEach((m) => {
          by[m.sku] = by[m.sku] || { q: 0, v: 0 };
          by[m.sku].q += -m.qty;
          by[m.sku].v += S.valueOf(-m.qty, m.cost4);
        });
      Object.keys(by).forEach((k) => add([C(k), C(S.prod(k).name), R(S.commas(by[k].q)), R(M(by[k].v)), R(S.cost(Math.round((by[k].v * 100) / by[k].q)))]));
      out.summary = [
        { k: "COGS — period total", v: M(cogs), s: "includes illustrative historical series" },
        { k: "COGS from itemised dispatches", v: M(Object.values(by).reduce((a, x) => a + x.v, 0)), s: "ledger postings in range" },
      ];
    }
  } else if (key === "expenses") {
    out.cols = [col("Expense"), col("Date"), col("Category"), col("Warehouse"), col("Description"), col("Amount", "right"), col("Status")];
    const es = s.expenses.filter((e) => whs.includes(e.wh) && inD(e.date));
    es.forEach((e) => add([C(e.id), C(S.fmtDate(e.date)), C(e.category), C(S.wh(e.wh).name), C(e.description), R(M(e.amount)), C(e.status, { cls: statusTextClass(e.status) })]));
    out.summary = [
      { k: "Approved", v: M(es.filter((e) => e.status === "Approved").reduce((a: number, e) => a + e.amount, 0)) },
      { k: "Pending approval", v: M(es.filter((e) => e.status === "Pending Approval").reduce((a: number, e) => a + e.amount, 0)), tone: "warning" },
    ];
  } else if (key === "audit") {
    out.cols = [col("Timestamp"), col("User"), col("Role"), col("Action"), col("Reference"), col("Detail")];
    s.audit
      .filter((a) => inD(a.ts))
      .forEach((a) => {
        const role = S.user(a.user).role;
        add([C(a.ts), C(S.uname(a.user)), C(role ? S.ROLES[role].name : "—"), C(a.action), C(a.ref), C(a.detail)]);
      });
  }
  return out;
}
