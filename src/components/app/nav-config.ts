import {
  ArrowLeftRight,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Factory,
  History,
  LayoutDashboard,
  type LucideIcon,
  PackageOpen,
  Receipt,
  ReceiptText,
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
      { key: "catalogue", label: "Product catalogue", icon: Tags, perm: "inv.view" },
      { key: "stockcontrol", label: "Counts & adjustments", icon: ClipboardCheck, perm: "inv.view" },
      { key: "receiving", label: "Goods receiving", icon: PackageOpen, perm: "rcv.view" },
      { key: "transfers", label: "Transfers", icon: ArrowLeftRight, perm: "trf.view" },
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
      { key: "sales-orders", label: "Sales orders", icon: ShoppingCart, perm: "so.view" },
      { key: "customers", label: "Customers", icon: Store, perm: "cus.view" },
      { key: "dispatch", label: "Dispatch & deliveries", icon: Truck, perm: "dsp.view" },
    ],
  },
  {
    group: "Finance",
    items: [
      { key: "finance", label: "Invoices & payments", icon: ReceiptText, perm: "fin.view" },
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
  { label: "New goods receipt", icon: PackageOpen, perm: "rcv.create", route: "receiving" },
  { label: "New sales order", icon: ShoppingCart, perm: "so.create", route: "sales-orders" },
  { label: "New transfer request", icon: ArrowLeftRight, perm: "trf.create", route: "transfers" },
  { label: "New purchase order", icon: ClipboardList, perm: "po.create", route: "purchase-orders" },
  { label: "Record customer payment", icon: Wallet, perm: "fin.record", route: "finance" },
  { label: "Request stock adjustment", icon: SlidersHorizontal, perm: "inv.adjust.request", route: "stockcontrol" },
  { label: "Start stock count", icon: ClipboardCheck, perm: "inv.count", route: "stockcontrol" },
  { label: "Record expense", icon: Receipt, perm: "exp.create", route: "expenses" },
];

/** Permission required to open each route (mirrors the backend 403 rules). */
export const ROUTE_PERM: Record<string, string> = {
  inventory: "inv.view",
  catalogue: "inv.view",
  stockcontrol: "inv.view",
  receiving: "rcv.view",
  transfers: "trf.view",
  "purchase-orders": "po.view",
  suppliers: "sup.view",
  "sales-orders": "so.view",
  customers: "cus.view",
  dispatch: "dsp.view",
  finance: "fin.view",
  expenses: "exp.view",
  reports: "rpt.ops",
  audit: "audit.view",
  users: "usr.manage",
};
