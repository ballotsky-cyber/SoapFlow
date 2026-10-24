"use client";

import type { ModuleProps } from "@/components/app/modules";
import { InvoicesView } from "./invoices-view";
import { ExpensesView } from "./expenses-view";

/** Finance module: "invoices" (Invoices & payments) or "expenses" (Operating expenses). */
export default function FinancePage({ view }: ModuleProps) {
  return view === "expenses" ? <ExpensesView /> : <InvoicesView />;
}
