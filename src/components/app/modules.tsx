"use client";

import type { ComponentType } from "react";
import DashboardPage from "@/features/dashboard/dashboard-page";
import InventoryPage from "@/features/inventory/inventory-page";
import CataloguePage from "@/features/catalogue/catalogue-page";
import MastersPage from "@/features/catalogue/masters-page";
import StockControlPage from "@/features/stock-control/stock-control-page";
import ReceivingPage from "@/features/receiving/receiving-page";
import TransfersPage from "@/features/transfers/transfers-page";
import ProcurementPage from "@/features/procurement/procurement-page";
import SalesPage from "@/features/sales/sales-page";
import SalesDashboard from "@/features/sales/dashboard/sales-dashboard";
import EstimatesPage from "@/features/sales/estimates/estimates-page";
import InvoicesPage from "@/features/sales/invoices/invoices-page";
import PaymentsPage from "@/features/sales/payments/payments-page";
import CreditNotesPage from "@/features/sales/credit-notes/credit-notes-page";
import DispatchPage from "@/features/dispatch/dispatch-page";
import FinancePage from "@/features/finance/finance-page";
import ReportsPage from "@/features/reports/reports-page";
import AdminPage from "@/features/admin/admin-page";

export interface ModuleProps {
  /** Sub-view for modules that serve several routes (e.g. Procurement: "po" | "suppliers"). */
  view?: string;
}

/** Route name → module component and the view it is opened with. */
export const MODULES: Record<string, { Component: ComponentType<ModuleProps>; view?: string }> = {
  dashboard: { Component: DashboardPage },
  inventory: { Component: InventoryPage },
  catalogue: { Component: CataloguePage },
  categories: { Component: MastersPage, view: "categories" },
  brands: { Component: MastersPage, view: "brands" },
  units: { Component: MastersPage, view: "units" },
  stockcontrol: { Component: StockControlPage },
  receiving: { Component: ReceivingPage },
  transfers: { Component: TransfersPage },
  "purchase-orders": { Component: ProcurementPage, view: "po" },
  suppliers: { Component: ProcurementPage, view: "suppliers" },
  sales: { Component: SalesDashboard },
  estimates: { Component: EstimatesPage },
  "sales-orders": { Component: SalesPage, view: "orders" },
  customers: { Component: SalesPage, view: "customers" },
  invoices: { Component: InvoicesPage },
  payments: { Component: PaymentsPage },
  "credit-notes": { Component: CreditNotesPage },
  dispatch: { Component: DispatchPage },
  "sales-reports": { Component: ReportsPage, view: "sales" },
  finance: { Component: FinancePage, view: "payables" },
  expenses: { Component: FinancePage, view: "expenses" },
  reports: { Component: ReportsPage },
  audit: { Component: AdminPage, view: "audit" },
  users: { Component: AdminPage, view: "users" },
  settings: { Component: AdminPage, view: "settings" },
};
