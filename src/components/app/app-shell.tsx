"use client";

import * as React from "react";
import {
  Bell,
  Check,
  ChevronDown,
  CircleCheck,
  CircleHelp,
  FileText,
  Info,
  Lock,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Search,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import { getStore, routeToUrl, urlToRoute, useSoap } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/misc";
import { NAV, NAV_ITEMS, QUICK_ACTIONS, ROUTE_PERM } from "./nav-config";
import { MODULES } from "./modules";

const ROLE_ORDER = ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9", "u10", "u11"];

function useViewport() {
  const [vp, setVp] = React.useState({ mobile: false, tablet: false });
  React.useEffect(() => {
    const on = () => {
      const w = window.innerWidth;
      setVp({ mobile: w < 860, tablet: w >= 860 && w < 1200 });
    };
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return vp;
}

/** Keeps the browser URL and the engine's route in sync (deep links + back/forward). */
function useRouteSync(mainRef: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const S = getStore();
    const apply = () => {
      const { name, ...params } = urlToRoute(window.location.pathname, window.location.search);
      S.nav(name, params, { silent: true });
    };
    apply();
    S.hooks.onNavigate = (route) => {
      const url = routeToUrl(route);
      if (url !== window.location.pathname + window.location.search) window.history.pushState(null, "", url);
      mainRef.current?.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", apply);
    return () => {
      S.hooks.onNavigate = null;
      window.removeEventListener("popstate", apply);
    };
  }, [mainRef]);
}

export function AppShell() {
  const S = useSoap();
  const s = S.s;
  const route = s.route.name;
  const { mobile, tablet } = useViewport();
  const [collapsed, setCollapsed] = React.useState(false);
  const [drawer, setDrawer] = React.useState(false);
  const mainRef = React.useRef<HTMLElement>(null);
  useRouteSync(mainRef);

  const current = NAV_ITEMS.find((i) => i.key === route);
  React.useEffect(() => {
    document.title = (current ? current.label + (s.route.id ? " · " + s.route.id : "") + " — " : "") + "SoapFlow";
  }, [current, s.route.id]);

  const allowed = (r: string) => !ROUTE_PERM[r] || S.canView(ROUTE_PERM[r]);
  const showLabels = mobile ? true : !(collapsed || tablet);
  const mod = MODULES[route];
  const routeAllowed = allowed(route);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {mobile && drawer && <div className="fixed inset-0 z-40 bg-overlay animate-fade-in" onClick={() => setDrawer(false)} />}
      {(!mobile || drawer) && (
        <Sidebar
          showLabels={showLabels}
          floating={mobile}
          onNavigate={() => setDrawer(false)}
          onToggle={() => (mobile ? setDrawer(false) : (setCollapsed(!(collapsed || tablet))))}
        />
      )}

      <div className="flex h-dvh min-w-0 flex-1 flex-col">
        <TopBar mobile={mobile} wide={!mobile && !tablet} onMenu={() => setDrawer(true)} />
        <main ref={mainRef} className="relative flex-1 overflow-auto">
          {S.ui.loading ? (
            <LoadingState />
          ) : !routeAllowed ? (
            <NoAccess />
          ) : mod ? (
            <mod.Component view={mod.view} />
          ) : (
            <NotFound />
          )}
        </main>
      </div>

      <Toasts />
      <ConfirmDialog />
    </div>
  );
}

/* ---------------------------------------------------------------- sidebar */

function Sidebar({ showLabels, floating, onNavigate, onToggle }: { showLabels: boolean; floating: boolean; onNavigate: () => void; onToggle: () => void }) {
  const S = useSoap();
  const s = S.s;
  const route = s.route.name;
  const sc = S.scope();
  const isc = (w: string) => sc.includes(w);
  const counts: Record<string, number> = {
    receiving: s.receipts.filter((r) => isc(r.wh) && ["Pending Approval", "Arrived", "Counting"].includes(r.status)).length,
    stockcontrol: s.adjustments.filter((a) => isc(a.wh) && a.status === "Pending Approval").length,
    transfers: s.transfers.filter((t) => (isc(t.from) || isc(t.to)) && ["Requested", "Approved", "In Transit"].includes(t.status)).length,
    "sales-orders": s.salesOrders.filter((o) => isc(o.wh) && o.status === "Pending Approval").length,
    dispatch:
      s.dispatches.filter((d) => isc(d.wh) && ["Picking", "Verified", "Assigned", "Out for delivery"].includes(d.status) && (S.user().role !== "driver" || d.driver === s.currentUser)).length +
      (S.user().role === "driver" ? 0 : s.returns.filter((r) => isc(r.wh) && r.status !== "Inspected").length),
    estimates: s.estimates.filter((e) => S.estStatus(e) === "Accepted").length,
    invoices: s.invoices.filter((i) => isc(i.wh) && S.invStatus(i) === "Overdue").length,
    payments: s.payments.filter((p) => p.status === "Recorded").length,
  };
  const urgent: Record<string, boolean> = { invoices: true, stockcontrol: true };
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || S.canView(i.perm)) })).filter((g) => g.items.length);

  return (
    <aside
      className={cn(
        "z-50 flex h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        floating ? "fixed inset-y-0 left-0 shadow-pop animate-fade-in" : "relative",
        showLabels ? "w-[244px]" : "w-16",
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[13px] font-bold text-primary-foreground shadow-card">SF</div>
        {showLabels && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-[15px] font-bold tracking-tight">SoapFlow</span>
            <span className="text-[11px] text-muted-foreground">Distribution Ops · Demo</span>
          </div>
        )}
        {floating && (
          <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={onToggle} aria-label="Close navigation">
            <X />
          </Button>
        )}
      </div>
      {floating && (
        <div className="border-b px-3 py-3">
          <div className="mb-1.5 px-1 text-[10.5px] font-semibold tracking-[0.08em] text-subtle-foreground uppercase">Warehouse</div>
          <WarehouseSelect className="w-full max-w-none" />
        </div>
      )}
      <nav className="flex-1 overflow-y-auto px-2 pt-1 pb-4">
        {groups.map((g) => (
          <div key={g.group} className="mt-3 flex flex-col gap-px">
            {showLabels ? (
              <div className="px-2.5 pt-1 pb-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-subtle-foreground uppercase">{g.group}</div>
            ) : (
              <div className="mx-3 mb-1 h-px bg-border first:hidden" />
            )}
            {g.items.map((it) => {
              const active = route === it.key;
              const c = counts[it.key] || 0;
              const Icon = it.icon;
              return (
                <button
                  key={it.key}
                  type="button"
                  title={it.label}
                  onClick={() => {
                    onNavigate();
                    S.nav(it.key);
                  }}
                  className={cn(
                    "group relative flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors",
                    active ? "bg-primary-soft font-semibold text-foreground" : "text-secondary-foreground hover:bg-accent hover:text-foreground",
                    !showLabels && "justify-center px-0",
                  )}
                >
                  {active && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-primary" />}
                  <Icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {showLabels && <span className="flex-1 truncate">{it.label}</span>}
                  {c > 0 &&
                    (showLabels ? (
                      <span className={cn("inline-flex h-[18px] min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular", urgent[it.key] ? "bg-danger text-white" : "bg-muted text-muted-foreground")}>{c}</span>
                    ) : (
                      <span className={cn("absolute top-1.5 right-2 size-2 rounded-full", urgent[it.key] ? "bg-danger" : "bg-primary")} />
                    ))}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t p-2">
        <button
          type="button"
          onClick={onToggle}
          className={cn("flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground", !showLabels && "justify-center px-0")}
        >
          {showLabels ? <PanelLeftClose className="size-[18px]" /> : <PanelLeftOpen className="size-[18px]" />}
          {showLabels && <span>Collapse sidebar</span>}
        </button>
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------------- top bar */

function TopBar({ mobile, wide, onMenu }: { mobile: boolean; wide: boolean; onMenu: () => void }) {
  const S = useSoap();
  const s = S.s;
  const route = s.route.name;
  const current = NAV_ITEMS.find((i) => i.key === route);
  const crumbs: { label: string; go?: () => void }[] = [{ label: current?.group ?? "" }, { label: current?.label ?? "", go: s.route.id ? () => S.nav(route) : undefined }];
  if (s.route.id) crumbs.push({ label: s.route.id });
  if (s.route.action === "new") crumbs.push({ label: "New" });

  const quick = QUICK_ACTIONS.filter((q) => S.can(q.perm));

  return (
    <header className="no-print relative z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-card/90 px-3 backdrop-blur sm:gap-2.5 sm:px-4">
      {mobile && (
        <Button variant="outline" size="icon" onClick={onMenu} aria-label="Open navigation">
          <Menu />
        </Button>
      )}
      {!mobile && (
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[12.5px] whitespace-nowrap text-muted-foreground">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <React.Fragment key={i}>
                <span onClick={c.go} className={cn(last && "font-semibold text-foreground", c.go && "cursor-pointer hover:text-primary", "truncate")}>{c.label}</span>
                {!last && <span className="text-subtle-foreground">/</span>}
              </React.Fragment>
            );
          })}
        </nav>
      )}
      <div className="flex-1" />
      <GlobalSearch />
      {/* On phones the warehouse switcher lives in the navigation drawer. */}
      {!mobile && <WarehouseSelect />}
      {quick.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label="Create new">
              <Plus />
              {wide && <span>New</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60">
            <DropdownMenuLabel>Create</DropdownMenuLabel>
            {quick.map((q) => (
              <DropdownMenuItem key={q.label} onSelect={() => S.nav(q.route, { action: "new", kind: q.label })}>
                <q.icon />
                {q.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Notifications />
      <ProfileMenu wide={wide} />
    </header>
  );
}

function WarehouseSelect({ className }: { className?: string }) {
  const S = useSoap();
  const options = (S.hasAllWh() ? [{ value: "ALL", label: "All warehouses" }] : []).concat(S.allowedWh().map((w) => ({ value: w, label: S.wh(w).name })));
  return <Select aria-label="Current warehouse" value={S.s.warehouse} onValueChange={(v) => S.setWarehouse(v)} options={options} className={cn("w-auto max-w-[190px] min-w-[120px]", className)} />;
}

function GlobalSearch() {
  const S = useSoap();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const results = open ? S.search(q) : [];
  const show = open && q.trim().length >= 2;

  return (
    <Popover open={show} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="max-w-[300px] min-w-0 flex-[1_1_300px] sm:min-w-[120px] sm:flex-[0_1_300px]">
          <Input
            icon={<Search />}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            placeholder="Search SKU, order, receipt, customer…"
            className="[&_input]:bg-muted/60"
            aria-label="Global search"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="max-h-[380px] w-[min(420px,calc(100vw-24px))] overflow-auto p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if ((e.target as HTMLElement).closest("[data-slot=input]")) e.preventDefault();
        }}
      >
        {results.map((r) => (
          <button
            key={r.type + r.ref}
            type="button"
            onClick={() => {
              setOpen(false);
              setQ("");
              const { name, ...params } = r.route;
              S.nav(name, params);
            }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-accent"
          >
            <span className="w-24 shrink-0 text-[10.5px] tracking-wide text-muted-foreground uppercase">{r.type}</span>
            <span className="flex min-w-0 flex-col">
              <span className="font-mono text-xs text-primary">{r.ref}</span>
              <span className="truncate text-[12.5px]">
                {r.label} <span className="text-muted-foreground">· {r.sub}</span>
              </span>
            </span>
          </button>
        ))}
        {results.length === 0 && (
          <div className="p-3.5 text-[12.5px] text-muted-foreground">
            No matches for “{q}”. Try a SKU (VEL-BTH-100), order (SO-2026-1201) or receipt (GRN-2026-0392).
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Notifications() {
  const S = useSoap();
  const s = S.s;
  const [open, setOpen] = React.useState(false);
  type N = { kind: string; ref: string; text: string; tone: "warning" | "danger"; route: { name: string; [k: string]: unknown } };
  const ap: N[] = S.approvals().map((a) => ({ kind: "Approval · " + a.type, ref: a.ref, text: a.title + " — " + a.sub, tone: "warning", route: a.route }));
  const ex: N[] = S.canView("inv.view") || S.canView("rpt.ops") ? S.exceptions().map((e) => ({ kind: "Exception · " + e.kind, ref: e.ref, text: e.text, tone: "danger", route: e.route })) : [];
  const low = S.canView("inv.view") ? S.lowStock() : [];
  const lowN: N[] = low.length
    ? [{ kind: "Low stock", ref: low.length + " lines", text: low.slice(0, 3).map((r) => r.sku + " @ " + S.wh(r.wh).name).join(", ") + (low.length > 3 ? "…" : ""), tone: "warning", route: { name: "inventory", filter: "low" } }]
    : [];
  const expN = S.canView("inv.view") ? S.expiring() : [];
  const expI: N[] = expN.length
    ? [{ kind: "Expiry", ref: expN.length + " batches", text: expN.filter((b) => b.days < 0).length + " expired, " + expN.filter((b) => b.days >= 0).length + " within " + s.settings.expiryWarnDays + " days", tone: "danger", route: { name: "inventory", tab: "batches" } }]
    : [];
  const notifs = [...ap, ...ex, ...lowN, ...expI];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Notifications" className="relative">
          <Bell />
          {notifs.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10.5px] font-bold text-white ring-2 ring-card tabular">{notifs.length}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-[min(380px,calc(100vw-24px))] overflow-auto p-0">
        <div className="sticky top-0 flex items-center justify-between border-b bg-popover px-4 py-3">
          <span className="text-[13.5px] font-semibold">Needs your attention</span>
          <span className="text-[11.5px] text-muted-foreground">{S.role().name}</span>
        </div>
        {notifs.map((n, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setOpen(false);
              const { name, ...params } = n.route;
              S.nav(name, params);
            }}
            className="flex w-full cursor-pointer gap-3 border-b border-border/60 px-4 py-2.5 text-left last:border-0 hover:bg-muted/60"
          >
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.tone === "danger" ? "bg-danger" : "bg-warning")} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[11px] text-muted-foreground">
                {n.kind} · <span className="font-mono">{n.ref}</span>
              </span>
              <span className="text-[12.5px]">{n.text}</span>
            </span>
          </button>
        ))}
        {notifs.length === 0 && <div className="px-4 py-6 text-center text-[12.5px] text-muted-foreground">Nothing waiting for you. Approvals and alerts for your role appear here.</div>}
      </PopoverContent>
    </Popover>
  );
}

function ProfileMenu({ wide }: { wide: boolean }) {
  const S = useSoap();
  const s = S.s;
  const u = S.user();
  const whLabel = (wh: string[]) => (wh.includes("ALL") ? "All warehouses" : wh.map((w) => S.wh(w).name).join(", "));
  const initials = u.name.split(" ").map((x) => x[0]).join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-transparent pr-1.5 pl-1 outline-none hover:border-input focus-visible:ring-[3px] focus-visible:ring-ring">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">{initials}</span>
          {wide && (
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[12.5px] font-semibold">{u.name}</span>
              <span className="text-[11px] text-muted-foreground">{S.role().name}</span>
            </span>
          )}
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[min(320px,calc(100vw-24px))] p-0">
        <div className="border-b px-4 py-3">
          <div className="font-semibold">{u.name}</div>
          <div className="text-xs text-muted-foreground">
            {S.role().name} · {whLabel(u.wh)}
          </div>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1">
          <DropdownMenuLabel>Switch demo role</DropdownMenuLabel>
          {ROLE_ORDER.map((id) => S.user(id)).map((x) => {
            const cur = x.id === s.currentUser;
            return (
              <DropdownMenuItem
                key={x.id}
                className={cn("justify-between", cur && "bg-primary-soft/60")}
                onSelect={() => {
                  S.setUser(x.id);
                  S.toast("info", "Now viewing as " + S.ROLES[x.role].name, "Navigation and actions now reflect this role. In production, the API enforces the same rules.");
                  const req = ROUTE_PERM[S.s.route.name];
                  if (req && !S.canView(req)) S.nav("dashboard");
                }}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-[12.5px] font-medium">{S.ROLES[x.role].name}</span>
                  <span className="truncate text-[11.5px] text-muted-foreground">
                    {x.name} · {whLabel(x.wh)}
                  </span>
                </span>
                {cur && <Check className="!text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </div>
        <DropdownMenuSeparator className="mx-0 my-0" />
        <div className="p-1">
          <DropdownMenuItem onSelect={() => S.nav("settings", { tab: "notes" })}>
            <FileText />
            Implementation notes
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() =>
              S.confirm({
                title: "Reset demonstration data?",
                body: "All simulated transactions you created in this browser will be discarded and the illustrative dataset restored.",
                confirmLabel: "Reset data",
                danger: true,
                onConfirm: () => {
                  S.reset();
                  S.toast("success", "Demo data restored", "Illustrative dataset reloaded.");
                },
              })
            }
          >
            <RotateCcw />
            Reset demonstration data
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------------------------------------------------------- states */

function LoadingState() {
  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-4 sm:p-6" aria-busy="true">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3 w-80" />
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

function NoAccess() {
  const S = useSoap();
  return (
    <div className="mx-auto my-20 flex max-w-[520px] flex-col items-center rounded-xl border bg-card p-8 text-center shadow-card">
      <span className="flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning">
        <Lock className="size-6" />
      </span>
      <h2 className="mt-3 text-lg font-semibold">No access to this module</h2>
      <p className="mt-1.5 mb-5 leading-relaxed text-muted-foreground">
        {S.role().name} cannot open this screen. The navigation hides it, and the API would reject the request (HTTP 403) and record it in the audit log.
      </p>
      <Button variant="outline" onClick={() => S.nav("dashboard")}>
        Back to dashboard
      </Button>
    </div>
  );
}

function NotFound() {
  const S = useSoap();
  return (
    <div className="mx-auto my-20 flex max-w-[520px] flex-col items-center rounded-xl border bg-card p-8 text-center shadow-card">
      <h2 className="text-lg font-semibold">Page not found</h2>
      <p className="mt-1.5 mb-5 text-muted-foreground">This screen doesn’t exist in the demo.</p>
      <Button variant="outline" onClick={() => S.nav("dashboard")}>
        Back to dashboard
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------------- toasts & confirm */

const TOAST_TONE = {
  success: { Icon: CircleCheck, cls: "text-success" },
  error: { Icon: XCircle, cls: "text-danger" },
  info: { Icon: Info, cls: "text-primary" },
  warn: { Icon: TriangleAlert, cls: "text-warning" },
} as const;

function Toasts() {
  const S = useSoap();
  const who = S.user().name;
  return (
    <div className="no-print pointer-events-none fixed right-4 bottom-4 z-[400] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-2">
      {S.ui.toasts.map((t) => {
        const { Icon, cls } = TOAST_TONE[t.kind] ?? TOAST_TONE.info;
        return (
          <div key={t.id} role="status" className="pointer-events-auto flex gap-3 rounded-xl border bg-card py-3 pr-3 pl-3.5 shadow-pop animate-slide-up">
            <Icon className={cn("mt-px size-5 shrink-0", cls)} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="text-[13px] font-semibold">
                {t.title} {t.ref && <span className="font-mono text-[11.5px] font-medium text-muted-foreground">{t.ref}</span>}
              </div>
              {t.msg && <div className="text-[12.5px] leading-snug text-secondary-foreground">{t.msg}</div>}
              <div className="text-[11px] text-subtle-foreground">by {who} · simulated</div>
            </div>
            <button type="button" onClick={() => S.dismissToast(t.id)} aria-label="Dismiss" className="h-6 cursor-pointer rounded p-0.5 text-subtle-foreground hover:bg-accent hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ConfirmDialog() {
  const S = useSoap();
  const cf = S.ui.confirm;
  const [reason, setReason] = React.useState("");
  const [err, setErr] = React.useState(false);
  const close = () => {
    setReason("");
    setErr(false);
    S.closeConfirm();
  };
  const confirm = () => {
    if (!cf) return;
    if (cf.reasonLabel && !reason.trim()) return setErr(true);
    const fn = cf.onConfirm;
    const rs = reason.trim();
    setReason("");
    setErr(false);
    S.closeConfirm();
    fn?.(rs);
  };

  return (
    <Dialog open={!!cf} onOpenChange={(o) => !o && close()}>
      {cf && (
        <DialogContent size="sm" hideClose>
          <DialogHeader
            className="border-b-0 pb-0"
            icon={
              <span className={cn("flex size-9 items-center justify-center rounded-full", cf.danger ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary")}>
                {cf.danger ? <TriangleAlert className="size-5" /> : <CircleHelp className="size-5" />}
              </span>
            }
            title={cf.title}
            description={cf.body}
          />
          <DialogBody className="pt-3">
            {cf.reasonLabel && (
              <Field label={cf.reasonLabel} error={err ? "A reason is required — it is stored in the audit trail." : undefined}>
                <Textarea
                  autoFocus
                  rows={3}
                  value={reason}
                  aria-invalid={err || undefined}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setErr(false);
                  }}
                />
              </Field>
            )}
            <div className="text-[11.5px] text-subtle-foreground">
              Will be recorded as {S.user().name} ({S.role().name}).
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button variant={cf.danger ? "destructive" : "default"} onClick={confirm}>
              {cf.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
