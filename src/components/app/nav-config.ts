import {
  ArrowLeftRight,
  BadgeCheck,
  Boxes,
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileMinus,
  FilePen,
  FolderTree,
  Gauge,
  History,
  LayoutDashboard,
  type LucideIcon,
  PackageOpen,
  Receipt,
  ReceiptText,
  Ruler,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Tags,
  TrendingUp,
  Truck,
  UserCog,
  Wallet,
} from "lucide-react";

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Permission needed to see the module (null = everyone). */
  perm: string | null;
}

export const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Overview", items: [{ key: "dashboard", label: "Dashboard", icon: LayoutDashboard, perm: null }] },
  {
    group: "Inventory",
    items: [
      { key: "inventory", label: "Stock overview", icon: Boxes, perm: "inv.view" },
      { key: "stockcontrol", label: "Counts & adjustments", icon: ClipboardCheck, perm: "inv.view" },
      { key: "receiving", label: "Goods receiving", icon: PackageOpen, perm: "rcv.view" },
      { key: "transfers", label: "Transfers", icon: ArrowLeftRight, perm: "trf.view" },
    ],
  },
  {
    group: "Products",
    items: [
      { key: "catalogue", label: "Product catalogue", icon: Tags, perm: "inv.view" },
      { key: "categories", label: "Categories", icon: FolderTree, perm: "inv.view" },
      { key: "brands", label: "Brands", icon: BadgeCheck, perm: "inv.view" },
      { key: "units", label: "Units of measurement", icon: Ruler, perm: "inv.view" },
    ],
  },
  {
    group: "Procurement",
    items: [
      { key: "purchase-orders", label: "Purchase orders", icon: ClipboardList, perm: "po.view" },
      { key: "suppliers", label: "Suppliers", icon: Factory, perm: "sup.view" },
    ],
  },
  {
    group: "Sales",
    items: [
      { key: "sales", label: "Sales dashboard", icon: Gauge, perm: "so.view" },
      { key: "customers", label: "Customers", icon: Store, perm: "cus.view" },
      { key: "estimates", label: "Estimates", icon: FilePen, perm: "est.view" },
      { key: "sales-orders", label: "Sales orders", icon: ShoppingCart, perm: "so.view" },
      { key: "invoices", label: "Invoices", icon: ReceiptText, perm: "fin.view" },
      { key: "payments", label: "Payments", icon: Wallet, perm: "fin.view" },
      { key: "credit-notes", label: "Credit notes", icon: FileMinus, perm: "fin.view" },
      { key: "dispatch", label: "Deliveries", icon: Truck, perm: "dsp.view" },
      { key: "sales-reports", label: "Sales reports", icon: ChartColumn, perm: "rpt.ops" },
    ],
  },
  {
    group: "Finance",
    items: [
      { key: "finance", label: "Supplier payables", icon: Receipt, perm: "fin.view" },
      { key: "expenses", label: "Expenses", icon: Wallet, perm: "exp.view" },
    ],
  },
  {
    group: "Insights",
    items: [
      { key: "reports", label: "Reports", icon: TrendingUp, perm: "rpt.ops" },
      { key: "audit", label: "Audit trail", icon: History, perm: "audit.view" },
    ],
  },
  {
    group: "Administration",
    items: [
      { key: "users", label: "User management", icon: UserCog, perm: "usr.manage" },
      { key: "settings", label: "Settings", icon: Settings, perm: null },
    ],
  },
];

export const NAV_ITEMS = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));

/** Quick "New …" actions: [label, icon, permission, route]. */
export const QUICK_ACTIONS: { label: string; icon: LucideIcon; perm: string; route: string }[] = [
  { label: "New estimate", icon: FilePen, perm: "est.create", route: "estimates" },
  { label: "New sales order", icon: ShoppingCart, perm: "so.create", route: "sales-orders" },
  { label: "New invoice", icon: ReceiptText, perm: "sinv.create", route: "invoices" },
  { label: "Record customer payment", icon: Wallet, perm: "fin.record", route: "payments" },
  { label: "New goods receipt", icon: PackageOpen, perm: "rcv.create", route: "receiving" },
  { label: "New transfer request", icon: ArrowLeftRight, perm: "trf.create", route: "transfers" },
  { label: "New purchase order", icon: ClipboardList, perm: "po.create", route: "purchase-orders" },
  { label: "Request stock adjustment", icon: SlidersHorizontal, perm: "inv.adjust.request", route: "stockcontrol" },
  { label: "Start stock count", icon: ClipboardCheck, perm: "inv.count", route: "stockcontrol" },
  { label: "Record expense", icon: Receipt, perm: "exp.create", route: "expenses" },
];

/** Permission required to open each route (mirrors the backend 403 rules). */
export const ROUTE_PERM: Record<string, string> = {
  inventory: "inv.view",
  catalogue: "inv.view",
  categories: "inv.view",
  brands: "inv.view",
  units: "inv.view",
  stockcontrol: "inv.view",
  receiving: "rcv.view",
  transfers: "trf.view",
  "purchase-orders": "po.view",
  suppliers: "sup.view",
  sales: "so.view",
  estimates: "est.view",
  "sales-orders": "so.view",
  customers: "cus.view",
  invoices: "fin.view",
  payments: "fin.view",
  "credit-notes": "fin.view",
  dispatch: "dsp.view",
  "sales-reports": "rpt.ops",
  finance: "fin.view",
  expenses: "exp.view",
  reports: "rpt.ops",
  audit: "audit.view",
  users: "usr.manage",
};
