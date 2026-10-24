/* Report catalogue: [key, label, view permission, uses date range, uses product filters]. Mirrors the prototype's DEF table. */

export interface ReportDef {
  key: string;
  label: string;
  perm: string;
  usesDate: boolean;
  usesProduct: boolean;
}

const d = (key: string, label: string, perm: string, usesDate: 0 | 1, usesProduct: 0 | 1): ReportDef => ({ key, label, perm, usesDate: !!usesDate, usesProduct: !!usesProduct });

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
    items: [d("sales", "Sales orders & supplies", "rpt.ops", 1, 0), d("dispatch", "Dispatch & delivery history", "rpt.ops", 1, 0)],
  },
  {
    label: "Finance",
    items: [
      d("receivables", "Customer receivables (aging)", "rpt.fin", 0, 0),
      d("payables", "Supplier payables", "rpt.fin", 0, 0),
      d("pnl", "Revenue, COGS & gross profit", "rpt.fin", 1, 0),
      d("cogs", "Cost of goods sold by product", "rpt.fin", 1, 1),
      d("expenses", "Operating expenses", "rpt.fin", 1, 0),
    ],
  },
  { label: "Control", items: [d("audit", "Audit trail", "audit.view", 1, 0)] },
];

export const ALL_REPORTS = REPORT_GROUPS.flatMap((g) => g.items);

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
  dispatch: "Collections and deliveries with proof-of-delivery.",
  receivables: "Outstanding customer balances by age.",
  payables: "Supplier invoices and balances with 3-way match.",
  pnl: "Revenue less cost of goods sold, then operating expenses — reported separately.",
  cogs: "COGS from dispatch postings at weighted-average cost.",
  expenses: "Operating expenses by category and status.",
  audit: "Sensitive actions with user, role and reference.",
};
