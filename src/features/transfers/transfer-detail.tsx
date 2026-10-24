"use client";

import * as React from "react";
import { useSoap, type Doc } from "@/lib/store";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/checkbox";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Alert } from "@/components/ui/misc";
import { DetailHeader, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { StepTrack, type StepState } from "./transfers-ui";

type Edit = { appr?: string; recv?: string; dmg?: string };

const AT: Record<string, number> = { Draft: -1, Requested: 0, Approved: 1, "In Transit": 2, "Partially Received": 2, Received: 4, Disputed: 3, Cancelled: -1 };

export function TransferDetail({ t: x }: { t: Doc }) {
  const S = useSoap();
  const costV = S.canView("cost.view");
  const [edits, setEdits] = React.useState<Record<number, Edit>>({});
  const [vehicle, setVehicle] = React.useState("");
  const [rmode, setRmode] = React.useState("transit");
  const [err, setErr] = React.useState("");

  const bpc = (sku: string) => S.bpc(sku);
  const ctn = (sku: string, bars: number) => String(Math.round((bars / bpc(sku)) * 100) / 100);
  const toBars = (sku: string, v: string | number) => Math.round((parseFloat(String(v)) || 0) * bpc(sku));
  const setEdit = (i: number, patch: Edit) => setEdits((ed) => ({ ...ed, [i]: { ...ed[i], ...patch } }));
  const num = (v: string) => v.replace(/[^0-9.]/g, "");

  const fromName = S.wh(x.from).name;
  const toName = S.wh(x.to).name;
  const at = AT[x.status] ?? -1;
  const disputed = x.status === "Disputed";
  const subs = [S.uname(x.by) + " · " + S.fmtDate(x.date), x.approvedBy ? S.uname(x.approvedBy) : "", x.dispatchedAt ? S.fmtDate(x.dispatchedAt) : "", x.receivedAt ? S.fmtDate(x.receivedAt) : ""];
  const steps = ["Requested", "Approved", "Dispatched · in transit", disputed ? "Received — disputed" : "Received"].map((label, i) => {
    const done = i < at || (i === 3 && x.status === "Received");
    return { label, sub: subs[i], state: (done ? "done" : i === at ? "current" : "todo") as StepState, danger: disputed };
  });

  const isReq = x.status === "Requested";
  const isAppr = x.status === "Approved";
  const isTr = ["In Transit", "Partially Received"].includes(x.status);
  const allowed = S.allowedWh();
  const canAppr = isReq && S.can("trf.approve") && allowed.includes(x.from);
  const canDisp = isAppr && S.can("trf.dispatch") && allowed.includes(x.from);
  const canRecv = isTr && S.can("trf.receive") && allowed.includes(x.to);

  const actions: { label: string; go: () => void; variant: ButtonProps["variant"] }[] = [];
  if (x.status === "Draft" && S.can("trf.create")) actions.push({ label: "Submit request", variant: "default", go: () => S.result(S.transferAct(x.id, "submit"), "Transfer requested") });
  if (canAppr) {
    actions.push({
      label: "Reject",
      variant: "destructive-outline",
      go: () => S.confirm({ title: "Reject " + x.id + "?", body: "No stock will move.", confirmLabel: "Reject", danger: true, reasonLabel: "Reason", onConfirm: (rs) => S.result(S.transferAct(x.id, "reject", rs), "Transfer rejected") }),
    });
    actions.push({
      label: "Approve quantities",
      variant: "default",
      go: () => {
        const q = x.lines.map((l, i) => toBars(l.sku, edits[i]?.appr != null ? (edits[i].appr as string) : l.req / bpc(l.sku)));
        if (q.some((v) => v <= 0)) return setErr("Approved quantities must be above zero.");
        setEdits({});
        setErr("");
        S.result(S.transferAct(x.id, "approve", q), "Transfer approved");
      },
    });
  }
  if (canDisp)
    actions.push({
      label: "Confirm dispatch",
      variant: "default",
      go: () =>
        S.confirm({
          title: "Dispatch " + x.id + "?",
          body: "Approved quantities leave " + fromName + " now and are recorded as in transit to " + toName + ". Source cost travels with the goods.",
          confirmLabel: "Confirm dispatch",
          onConfirm: () => {
            const r = S.result(S.transferAct(x.id, "dispatch", { vehicle: vehicle.toUpperCase() }), "Transfer dispatched");
            if (!r.ok) setErr(r.error);
          },
        }),
    });
  if (canRecv)
    actions.push({
      label: "Confirm receipt",
      variant: "success",
      go: () => {
        const data = {
          mode: rmode === "short" ? "shortage" : "transit",
          lines: x.lines.map((l, i) => {
            const e = edits[i] || {};
            return { recv: e.recv != null ? toBars(l.sku, e.recv) : l.disp - l.recv, damaged: e.dmg != null ? toBars(l.sku, e.dmg) : 0 };
          }),
        };
        const r = S.transferAct(x.id, "receive", data);
        if (!r.ok) return setErr(r.error);
        setEdits({});
        setErr("");
        S.result(r, "Transfer received");
      },
    });
  if (disputed && S.can("trf.approve"))
    actions.push({
      label: "Resolve dispute",
      variant: "default",
      go: () => S.confirm({ title: "Resolve dispute on " + x.id + "?", body: "The shortage is written off as a transit loss. The discrepancy record stays on the transfer.", confirmLabel: "Resolve", reasonLabel: "Resolution / findings", onConfirm: (rs) => S.result(S.transferAct(x.id, "resolve", rs), "Dispute resolved") }),
    });

  const panel = ({
    Draft: ["Draft lines", "Submit to request approval."],
    Requested: ["Approve quantities", canAppr ? "Adjust approved cartons if the source can only spare part of the request." : "Awaiting approval by the source warehouse manager."],
    Approved: ["Ready to dispatch", canDisp ? "Availability is re-checked at dispatch. Negative stock is blocked." : "Awaiting dispatch from the source warehouse."],
    "In Transit": ["In transit", canRecv ? "Enter what physically arrived. Destination stock increases by received minus damaged." : "Awaiting receipt at the destination."],
    "Partially Received": ["Partially received", canRecv ? "Receive the remainder as it arrives." : "Remainder still in transit."],
    Received: ["Received", "Complete."],
    Disputed: ["Disputed", "Discrepancy under review."],
    Cancelled: ["Cancelled", ""],
  } as Record<string, [string, string]>)[x.status] ?? [x.status, ""];
  const noteTxt: string | undefined = disputed ? x.note || "Received quantity differs from dispatched." : x.resolution ? "Resolved: " + x.resolution : x.note;
  const lockText = S.role().readonly ? "Read-only role." : ["Received", "Cancelled"].includes(x.status) ? "Completed transfers are locked." : "No actions available for your role or warehouse access.";
  const unit = <span className="text-[11px] text-muted-foreground">ctn</span>;

  return (
    <>
      <DetailHeader
        backLabel="All transfers"
        onBack={() => S.nav("transfers")}
        reference={x.id}
        title={`${fromName} → ${toName}`}
        meta={
          <>
            <StatusBadge status={x.status} />
            <span>{"Requested by " + S.uname(x.by) + " · " + S.fmtDate(x.date) + (x.vehicle ? " · vehicle " + x.vehicle : "") + " · not a sale or purchase — value moves at source cost"}</span>
          </>
        }
      />
      <StepTrack steps={steps} />
      {noteTxt &&
        (disputed ? (
          <Alert tone="danger">{noteTxt}</Alert>
        ) : (
          <div className="rounded-lg border bg-muted/60 px-3 py-2.5 text-[12.5px] text-secondary-foreground">{noteTxt}</div>
        ))}
      <Card className="overflow-hidden">
        <CardHeader title={panel[0]}>
          <span className="text-xs text-muted-foreground">{panel[1]}</span>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <TH>Product</TH>
              <TH align="right">Requested</TH>
              <TH align="right">Approved</TH>
              <TH align="right">Available at source</TH>
              <TH align="right">Dispatched</TH>
              <TH align="right">Received</TH>
              <TH align="right">Discrepancy</TH>
              {costV && <TH align="right">Transfer cost/bar</TH>}
            </tr>
          </THead>
          <TBody>
            {x.lines.map((l, i) => {
              const av = S.avail(x.from, l.sku);
              const need = isReq ? l.req : l.appr;
              const out = l.disp - l.recv;
              const e = edits[i] || {};
              const dmg = l.damaged || 0;
              const shortQ = l.short || (disputed && l.disp > l.recv ? l.disp - l.recv : 0);
              const disc = shortQ ? "Short " + S.qty(l.sku, shortQ) + (dmg ? ", dmg " + S.qty(l.sku, dmg) : "") : dmg ? "Damaged " + S.qty(l.sku, dmg) : isTr && l.recv ? S.qty(l.sku, out) + " in transit" : "—";
              return (
                <TR key={l.sku}>
                  <TD className="min-w-[180px]">
                    <Ref>{l.sku}</Ref>
                    <div>{S.prod(l.sku).name}</div>
                  </TD>
                  <TD nowrap align="right">{S.qty(l.sku, l.req)}</TD>
                  <TD nowrap align="right">
                    {canAppr ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input value={e.appr ?? ctn(l.sku, l.req)} onChange={(ev) => setEdit(i, { appr: num(ev.target.value) })} inputMode="decimal" aria-label={`${l.sku} approved cartons`} className="h-8 w-[70px] px-2 text-right tabular" />
                        {unit}
                      </div>
                    ) : l.appr ? (
                      S.qty(l.sku, l.appr)
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD nowrap align="right" className={cn(["Requested", "Approved"].includes(x.status) && av < need ? "text-danger" : "text-secondary-foreground")}>
                    {["Requested", "Approved", "Draft"].includes(x.status) ? S.qty(l.sku, av) : "—"}
                  </TD>
                  <TD nowrap align="right">{l.disp ? S.qty(l.sku, l.disp) : "—"}</TD>
                  <TD nowrap align="right">
                    {canRecv ? (
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">recv</span>
                          <Input value={e.recv ?? ctn(l.sku, out)} onChange={(ev) => setEdit(i, { recv: num(ev.target.value) })} inputMode="decimal" aria-label={`${l.sku} received cartons`} className="h-7 w-16 px-1.5 text-right tabular" />
                          {unit}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">damaged</span>
                          <Input value={e.dmg ?? "0"} onChange={(ev) => setEdit(i, { dmg: num(ev.target.value) })} inputMode="decimal" aria-label={`${l.sku} damaged cartons`} className="h-7 w-16 px-1.5 text-right tabular" />
                          {unit}
                        </div>
                      </div>
                    ) : (
                      <span className={cn(l.recv && l.recv < l.disp && "text-danger")}>{l.recv ? S.qty(l.sku, l.recv) : "—"}</span>
                    )}
                  </TD>
                  <TD nowrap align="right" className={l.short || dmg || disputed ? "text-danger" : "text-muted-foreground"}>{disc}</TD>
                  {costV && <TD nowrap align="right" className="font-mono text-[11.5px]">{l.cost4 ? S.cost(l.cost4) : "Set at dispatch"}</TD>}
                </TR>
              );
            })}
          </TBody>
        </Table>
        {err && <Alert tone="danger" className="mx-4 mt-3">{err}</Alert>}
        {canDisp && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <label className="flex w-full items-center gap-2 text-xs text-secondary-foreground sm:w-auto">
              Vehicle
              <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="GT-0000-24" className="h-8 min-w-0 flex-1 uppercase sm:w-44" />
            </label>
          </div>
        )}
        {canRecv && (
          <div className="flex flex-col gap-2 border-t px-4 py-3 text-[12.5px]">
            <span className="font-medium">If received is less than dispatched:</span>
            <RadioGroup
              value={rmode}
              onValueChange={setRmode}
              options={[
                { value: "transit", label: "Remainder still in transit (Partially Received)" },
                { value: "short", label: "Report shortage (Disputed)" },
              ]}
              className="flex-col sm:flex-row"
            />
          </div>
        )}
        <CardFooter className="flex-wrap justify-end bg-muted/60">
          {!actions.length && <span className="text-xs text-muted-foreground">{lockText}</span>}
          {actions.map((a) => (
            <Button key={a.label} variant={a.variant} onClick={a.go}>{a.label}</Button>
          ))}
        </CardFooter>
      </Card>
    </>
  );
}
