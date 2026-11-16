/* Report catalogue: [key, label, view permission, uses date range, uses product filters, uses customer filter]. Mirrors the prototype's DEF table. */

export interface ReportDef {
  key: string;
  label: string;
  perm: string;
  usesDate: boolean;
  usesProduct: boolean;
  usesCustomer: boolean;
}

const d = (key: string, label: string, perm: string, usesDate: 0 | 1, usesProduct: 0 | 1, usesCustomer: 0 | 1 = 0): ReportDef => ({ key, label, perm, usesDate: !!usesDate, usesProduct: !!usesProduct, usesCustomer: !!usesCustomer });

export const REPORT_GROUPS: { label: string; items: ReportDef[] }[] = [
  {
    label: "Stock",
    items: [
      d("stock", "Current stock by product & warehouse", "rpt.ops", 0, 1),
      d("consolidated", "Consolidated stock", "rpt.ops", 0, 1),
      d("valuation", "Inventory valuation", "cost.view", 0, 1),
      d("low", "Low-stock products", "rpt.ops", 0, 1),
      d("held", "Damaged, quarantined, returned & expired", "rpt.ops", 1, 1),
    ],
  },
  {
    label: "Movements",
    items: [
      d("received", "Goods received by supplier", "rpt.ops", 1, 1),
      d("ledger", "Stock movement ledger", "rpt.ops", 1, 1),
      d("transfers", "Warehouse transfer history", "rpt.ops", 1, 1),
      d("counts", "Stocktaking discrepancies", "rpt.ops", 0, 1),
    ],
  },
  {
    label: "Sales",
    items: [
      d("sales", "Sales orders & supplies", "rpt.ops", 1, 0, 1),
      d("sales-customer", "Sales by customer", "rpt.fin", 1, 0, 1),
      d("sales-product", "Sales by product", "rpt.fin", 1, 1, 1),
      d("sales-warehouse", "Sales by warehouse", "rpt.fin", 1, 0, 1),
      d("estimates", "Estimates: created, accepted & converted", "rpt.ops", 1, 0, 1),
      d("dispatch", "Dispatch & delivery history", "rpt.ops", 1, 0),
    ],
  },
  {
    label: "Receivables",
    items: [
      d("inv-register", "Invoice register", "rpt.fin", 1, 0, 1),
      d("inv-status", "Paid, unpaid & overdue invoices", "rpt.fin", 0, 0, 1),
      d("collections", "Payment collections", "rpt.fin", 1, 0, 1),
      d("cust-balances", "Outstanding customer balances", "rpt.fin", 0, 0, 1),
      d("receivables", "Invoice aging", "rpt.fin", 0, 0, 1),
    ],
  },
  {
    label: "Finance",
    items: [
      d("payables", "Supplier payables", "rpt.fin", 0, 0),
      d("pnl", "Revenue, COGS & gross profit", "rpt.fin", 1, 0),
      d("cogs", "Cost of goods sold by product", "rpt.fin", 1, 1),
      d("expenses", "Operating expenses", "rpt.fin", 1, 0),
    ],
  },
  { label: "Control", items: [d("audit", "Audit trail", "audit.view", 1, 0)] },
];

export const ALL_REPORTS = REPORT_GROUPS.flatMap((g) => g.items);

/** Groups shown under Sales → Sales reports. */
export const SALES_GROUPS = REPORT_GROUPS.filter((g) => g.label === "Sales" || g.label === "Receivables");

export const REPORT_DESC: Record<string, string> = {
  stock: "Physical, sellable, reserved and available quantities per warehouse.",
  consolidated: "Company-wide totals across the selected warehouses.",
  valuation: "Sellable inventory at moving weighted-average cost.",
  low: "Lines at or below their minimum threshold.",
  held: "Stock that is not sellable, with the reason it is held.",
  received: "Posted receipts by supplier, with discrepancies.",
  ledger: "Every posted stock movement — append-only.",
  transfers: "Requested, dispatched and received quantities with discrepancies.",
  counts: "Counted vs expected with linked adjustment requests.",
  sales: "Orders by status, terms and method.",
  "sales-customer": "Issued invoices less credit notes per customer, excluding tax.",
  "sales-product": "Invoiced quantities and net value per product, less returns credited.",
  "sales-warehouse": "Issued invoices less credit notes per warehouse, excluding tax.",
  estimates: "Estimates created in the period with their outcome and the conversion rate into sales orders.",
  dispatch: "Collections and deliveries with proof-of-delivery.",
  "inv-register": "Every invoice raised in the period — drafts, issued, cancelled and void — with origin and amounts.",
  "inv-status": "Issued invoices grouped as paid, part-paid, unpaid, overdue and credited.",
  collections: "Payments received in the period by method and day; reversed payments are listed but excluded from totals.",
  "cust-balances": "Invoiced, paid, credited and outstanding per customer, with credit limits.",
  receivables: "Outstanding issued-invoice balances by days past due.",
  payables: "Supplier invoices and balances with 3-way match.",
  pnl: "Revenue less cost of goods sold, then operating expenses — reported separately.",
  cogs: "COGS from dispatch postings at weighted-average cost.",
  expenses: "Operating expenses by category and status.",
  audit: "Sensitive actions with user, role and reference.",
};
