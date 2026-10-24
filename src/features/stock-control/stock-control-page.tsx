"use client";

import * as React from "react";
import { ClipboardCheck, ClipboardList, Lock, SlidersHorizontal } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { Page, PageHeader, Ref, Toolbar } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { AdjustmentDialog } from "./adjustment-dialog";
import { CountDialog } from "./count-dialog";
import { CountList, CountSession, type Entries } from "./counts";

type TabKey = "adjustments" | "counts";

export default function StockControlPage() {
  const S = useSoap();
  const s = S.s;
  const sc = S.scope();
  const [tab, setTab] = React.useState<TabKey>(() => {
    const r = S.s.route;
    return r.tab === "counts" || (r.kind || "").includes("count") ? "counts" : "adjustments";
  });
  const [af, setAf] = React.useState("");
  const [countId, setCountId] = React.useState<string | null>(null);
  const [entries, setEntries] = React.useState<Entries>({});
  // undefined = closed; otherwise the initial SKU (may be "").
  const [adjSku, setAdjSku] = React.useState<string | undefined>(() => {
    const r = S.s.route;
    return r.action === "new" && !(r.kind || "").includes("count") ? (typeof r.sku === "string" ? r.sku : "") : undefined;
  });
  const [cntOpen, setCntOpen] = React.useState(() => {
    const r = S.s.route;
    return r.action === "new" && (r.kind || "").includes("count");
  });

  const costV = S.canView("cost.view");
  const canApprove = S.can("inv.adjust.approve");
  const canCount = S.can("inv.count");
  const canRequest = S.can("inv.adjust.request");

  const adjs = s.adjustments.filter((a) => sc.includes(a.wh) && (!af || a.status === af));
  const cs = countId ? s.counts.find((x) => x.id === countId) : undefined;

  return (
    <Page>
      <PageHeader
        icon={ClipboardCheck}
        title="Stock counts & adjustments"
        description="Every change outside receiving, dispatch and transfers needs a reason and a warehouse manager's approval before posting"
        actions={
          <>
            {canCount && (
              <Button variant="outline" onClick={() => setCntOpen(true)}>
                <ClipboardList />
                Start count session
              </Button>
            )}
            {canRequest && (
              <Button onClick={() => setAdjSku("")}>
                <SlidersHorizontal />
                Request adjustment
              </Button>
            )}
          </>
        }
      />
      <Tabs
        value={tab}
        onValueChange={(v) => { setTab(v); setCountId(null); }}
        items={[{ value: "adjustments", label: "Adjustment requests" }, { value: "counts", label: "Stocktaking" }]}
      />

      {tab === "adjustments" && (
        <>
          <Toolbar>
            <Select
              value={af}
              onValueChange={setAf}
              options={[{ value: "", label: "All statuses" }, { value: "Pending Approval", label: "Pending approval" }, "Posted", "Rejected"]}
              className="w-full sm:w-48"
            />
            {!canApprove && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="size-3.5 shrink-0" />
                Approval controls are only shown to warehouse managers for their warehouses.
              </span>
            )}
          </Toolbar>
          <div className="flex flex-col gap-2.5">
            {adjs.map((a) => {
              const pending = a.status === "Pending Approval";
              const hl = s.route.id === a.id;
              const qtyTxt = (a.qty > 0 ? "+" : "") + S.qty(a.sku, a.qty);
              const name = S.prod(a.sku).name;
              const whName = S.wh(a.wh).name;
              const canAct = pending && canApprove && S.allowedWh().includes(a.wh);
              const decision = pending
                ? "Awaiting warehouse manager"
                : (a.status === "Posted" ? "Approved & posted by " : "Rejected by ") + S.uname(a.approver) + " · " + S.fmtDate(a.decidedAt) + (a.note ? " — “" + a.note + "”" : "");
              const approve = () =>
                S.confirm({
                  title: "Approve and post " + a.id + "?",
                  body: `${qtyTxt} of ${name} at ${whName}. Stock and valuation update at the current weighted-average cost. Posted adjustments cannot be edited or deleted.`,
                  confirmLabel: "Approve & post",
                  onConfirm: () => S.result(S.adjAct(a.id, "approve"), "Adjustment posted"),
                });
              const reject = () =>
                S.confirm({
                  title: "Reject " + a.id + "?",
                  body: "The request is kept in history with your reason. No stock changes.",
                  confirmLabel: "Reject request",
                  danger: true,
                  reasonLabel: "Rejection reason",
                  onConfirm: (rs) => S.result(S.adjAct(a.id, "reject", rs), "Adjustment rejected"),
                });
              return (
                <Card key={a.id} className={cn("grid grid-cols-1 items-start gap-x-4 gap-y-2.5 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]", hl && "border-primary ring-1 ring-primary/30")}>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Ref className="text-xs">{a.id}</Ref>
                      <StatusBadge status={a.status} />
                      <Badge tone="gray">{a.type}</Badge>
                      {!!a.count && (
                        <span className="text-[11.5px] text-muted-foreground">from <span className="font-mono">{a.count}</span></span>
                      )}
                    </div>
                    <div className="text-[13.5px]">
                      <b className={cn("tabular", a.qty < 0 ? "text-danger" : "text-success")}>{qtyTxt}</b> · {name} · {whName}
                    </div>
                    <div className="text-[12.5px] text-secondary-foreground">“{a.reason}”</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-muted-foreground">
                      <span>Requested by <b className="text-secondary-foreground">{S.uname(a.by)}</b> · {S.fmtDate(a.at)}</span>
                      <span>{decision}</span>
                      {costV && <span>Value impact {S.money(S.valueOf(a.qty, a.cost4 || S.bal(a.wh, a.sku).avg))}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:justify-end">
                    {canAct && (
                      <>
                        <Button size="sm" variant="destructive-outline" onClick={reject}>Reject</Button>
                        <Button size="sm" variant="success" onClick={approve}>Approve &amp; post</Button>
                      </>
                    )}
                    {!pending && (
                      <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
                        <Lock className="size-3.5" />
                        Immutable
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
            {!adjs.length && (
              <Card className="border-dashed">
                <EmptyState title="No adjustments in this view." />
              </Card>
            )}
          </div>
        </>
      )}

      {tab === "counts" &&
        (cs ? (
          <CountSession
            cs={cs}
            entries={entries}
            setEntries={setEntries}
            onBack={() => setCountId(null)}
            onGoAdjustments={() => { setTab("adjustments"); setCountId(null); }}
          />
        ) : (
          <CountList onOpen={setCountId} />
        ))}

      {adjSku !== undefined && (
        <AdjustmentDialog
          initialSku={adjSku}
          onClose={() => setAdjSku(undefined)}
          onDone={() => { setAdjSku(undefined); setTab("adjustments"); }}
        />
      )}
      {cntOpen && (
        <CountDialog
          onClose={() => setCntOpen(false)}
          onDone={(id) => { setCntOpen(false); setTab("counts"); setCountId(id); }}
        />
      )}
    </Page>
  );
}
