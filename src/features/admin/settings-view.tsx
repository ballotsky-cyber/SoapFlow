"use client";

import * as React from "react";
import { Plus, Settings, X } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Grid, PageHeader } from "@/components/shared/page";
import { cn } from "@/lib/utils";
import { ImplementationNotes } from "./implementation-notes";

type STab = "config" | "notes";
const CORE_METHODS = ["Cash", "Bank transfer", "Mobile money"];

function SettingRow({ label, children, muted }: { label: React.ReactNode; children: React.ReactNode; muted?: boolean }) {
  return (
    <label className={cn("flex items-center justify-between gap-3 text-[13px]", muted && "text-subtle-foreground")}>
      <span className="min-w-0">{label}</span>
      {children}
    </label>
  );
}

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex h-[26px] items-center gap-1 rounded-full bg-muted pr-1 pl-2.5 text-xs">{children}</span>
);

export function SettingsView() {
  const S = useSoap();
  const s = S.s;
  const [sTab, setSTab] = React.useState<STab>(() => (s.route.tab === "notes" ? "notes" : "config"));
  const [cfg, setCfg] = React.useState(() => {
    const st = s.settings;
    return { expiryWarnDays: String(st.expiryWarnDays), blindCountDefault: st.blindCountDefault, maxDiscountPct: String(st.maxDiscountPct), creditCheck: st.creditCheck, paymentMethods: st.paymentMethods.slice() };
  });
  const [newMethod, setNewMethod] = React.useState("");
  const canSet = S.can("set.manage");
  const ro = !canSet;
  const patch = (p: Partial<typeof cfg>) => setCfg((c) => ({ ...c, ...p }));

  const addMethod = () => {
    const m = newMethod.trim();
    if (!m || cfg.paymentMethods.includes(m)) return;
    patch({ paymentMethods: [...cfg.paymentMethods, m] });
    setNewMethod("");
  };

  const save = () => {
    const d = parseInt(cfg.expiryWarnDays, 10);
    const md = parseFloat(cfg.maxDiscountPct);
    if (!(d >= 1 && d <= 365)) return S.toast("error", "Invalid value", "Expiry warning must be 1–365 days.");
    if (!(md >= 0 && md <= 50)) return S.toast("error", "Invalid value", "Max discount must be between 0 and 50%.");
    S.result(S.settingsSave({ expiryWarnDays: d, maxDiscountPct: md, blindCountDefault: cfg.blindCountDefault, creditCheck: cfg.creditCheck, paymentMethods: cfg.paymentMethods }), "Settings saved");
  };

  return (
    <>
      <PageHeader
        icon={Settings}
        title="Settings"
        description={canSet ? "Changes are audited and apply to all users." : "Read-only — only System Administrators can change settings."}
        actions={canSet && sTab === "config" && <Button onClick={save}>Save settings</Button>}
      />
      <Tabs value={sTab} onValueChange={setSTab} items={[{ value: "config", label: "Configuration" }, { value: "notes", label: "Implementation notes" }]} />

      {sTab === "notes" ? (
        <ImplementationNotes />
      ) : (
        <Grid min={420}>
          <Card>
            <CardHeader title="Inventory rules" />
            <CardContent className="flex flex-col gap-3">
              <SettingRow label="Expiry warning period (days)">
                <Input value={cfg.expiryWarnDays} onChange={(e) => patch({ expiryWarnDays: e.target.value.replace(/[^0-9]/g, "") })} disabled={ro} inputMode="numeric" className="h-8 w-[90px] text-right tabular" />
              </SettingRow>
              <SettingRow label="Blind counting by default">
                <Switch checked={cfg.blindCountDefault} onCheckedChange={(c) => patch({ blindCountDefault: c })} disabled={ro} />
              </SettingRow>
              <div className="flex flex-col gap-1">
                <SettingRow label="Allow negative sellable stock" muted>
                  <Switch checked={false} disabled />
                </SettingRow>
                <div className="text-[11.5px] text-muted-foreground">Prohibited by policy — the backend rejects any posting that would go negative.</div>
              </div>
              <div className="rounded-lg bg-muted/70 px-2.5 py-2 text-xs text-secondary-foreground">
                Costing method: <b>Moving weighted average</b> per product per warehouse · locked after go-live.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Sales controls" />
            <CardContent className="flex flex-col gap-3">
              <SettingRow label="Max discount without approval (%)">
                <Input value={cfg.maxDiscountPct} onChange={(e) => patch({ maxDiscountPct: e.target.value.replace(/[^0-9.]/g, "") })} disabled={ro} inputMode="decimal" className="h-8 w-[90px] text-right tabular" />
              </SettingRow>
              <SettingRow label="Require approval when credit limit is exceeded">
                <Switch checked={cfg.creditCheck} onCheckedChange={(c) => patch({ creditCheck: c })} disabled={ro} />
              </SettingRow>
              <div className="mt-1 text-[13px] font-semibold">Payment methods</div>
              <div className="flex flex-wrap gap-1.5">
                {cfg.paymentMethods.map((m) => (
                  <Chip key={m}>
                    <span className={cn(!(canSet && !CORE_METHODS.includes(m)) && "pr-1.5")}>{m}</span>
                    {canSet && !CORE_METHODS.includes(m) && (
                      <button type="button" aria-label="Remove" onClick={() => patch({ paymentMethods: cfg.paymentMethods.filter((x) => x !== m) })} className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
                        <X className="size-3.5" />
                      </button>
                    )}
                  </Chip>
                ))}
              </div>
              {canSet && (
                <div className="flex gap-1.5">
                  <Input value={newMethod} onChange={(e) => setNewMethod(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMethod()} placeholder="Add method, e.g. POS card" className="h-8 flex-1" />
                  <Button variant="outline" size="sm" onClick={addMethod}><Plus />Add</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Warehouses & storage locations" />
            <CardContent className="flex flex-col py-2">
              {s.warehouses.map((w) => (
                <div key={w.id} className="flex flex-col gap-0.5 border-b py-2 text-[12.5px] last:border-0">
                  <span>
                    <b className="font-semibold">{w.name}</b> <span className="text-muted-foreground">· {w.id} · manager {S.uname(w.manager)}</span>
                  </span>
                  <span className="text-muted-foreground">{w.locations.join(" · ")}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Expense categories" />
            <CardContent className="flex flex-col gap-2.5">
              <div className="flex flex-wrap gap-1.5">
                {s.settings.expenseCategories.map((c) => <Chip key={c}><span className="pr-1.5">{c}</span></Chip>)}
              </div>
              <div className="text-xs text-muted-foreground">Company: {s.settings.company} · Currency: GHS (minor unit: pesewa)</div>
            </CardContent>
          </Card>
        </Grid>
      )}
    </>
  );
}
