"use client";

import type { ComponentType } from "react";
import DashboardPage from "@/features/dashboard/dashboard-page";
import InventoryPage from "@/features/inventory/inventory-page";
import CataloguePage from "@/features/catalogue/catalogue-page";
import StockControlPage from "@/features/stock-control/stock-control-page";
import ReceivingPage from "@/features/receiving/receiving-page";
import TransfersPage from "@/features/transfers/transfers-page";
import ProcurementPage from "@/features/procurement/procurement-page";
import SalesPage from "@/features/sales/sales-page";
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
  stockcontrol: { Component: StockControlPage },
  receiving: { Component: ReceivingPage },
  transfers: { Component: TransfersPage },
  "purchase-orders": { Component: ProcurementPage, view: "po" },
  suppliers: { Component: ProcurementPage, view: "suppliers" },
  "sales-orders": { Component: SalesPage, view: "orders" },
  customers: { Component: SalesPage, view: "customers" },
  dispatch: { Component: DispatchPage },
  finance: { Component: FinancePage, view: "invoices" },
  expenses: { Component: FinancePage, view: "expenses" },
  reports: { Component: ReportsPage },
  audit: { Component: AdminPage, view: "audit" },
  users: { Component: AdminPage, view: "users" },
  settings: { Component: AdminPage, view: "settings" },
};
