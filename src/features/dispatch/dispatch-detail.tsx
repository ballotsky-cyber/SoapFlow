"use client";

import * as React from "react";
import { Check, Printer } from "lucide-react";
import { useSoap, type Doc } from "@/lib/store";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { RadioGroup } from "@/components/ui/checkbox";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Alert, FileInput } from "@/components/ui/misc";
import { DetailHeader, Ref } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { DispatchPrintDialog } from "./dispatch-print-dialog";

type Outcome = "Delivered" | "Partially delivered" | "Failed";
interface FormState { collector: string; collectorId: string; driver: string; vehicle: string; outcome: Outcome; recipient: string; pod: string; note: string; file: string }
type Edits = Record<number, Record<string, string>>;
type Tone = "default" | "success" | "primary" | "danger";
interface Cell { edit: boolean; key: string; val: string; conv: string; over: boolean; txt: string; tone: Tone }
interface Action { label: string; go: () => void; variant: ButtonProps["variant"] }

const toneCls: Record<Tone, string> = { default: "", success: "text-success", primary: "text-primary", danger: "text-danger" };

export function DispatchDetail({ d: x }: { d: Doc }) {
  const S = useSoap();
  const s = S.s;
  const me = s.currentUser;
  const isDriver = S.user().role === "driver";
  const canProcess = S.can("dsp.process");
  const [edits, setEdits] = React.useState<Edits>({});
  const [form, setForm] = React.useState<FormState>(() => ({ collector: "", collectorId: "", driver: x.driver || "", vehicle: x.vehicle || "", outcome: "Delivered", recipient: "", pod: "", note: "", file: "" }));
  const [err, setErr] = React.useState("");
  const [print, setPrint] = React.useState(false);

  const setF = (k: keyof FormState) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErr("");
  };

  const o = s.salesOrders.find((y) => y.id === x.so);
  const bpc = (sku: string) => S.bpc(sku);
  const ctn = (sku: string, b: number) => String(Math.round((b / bpc(sku)) * 100) / 100);
  const toB = (sku: string, v: string) => Math.round((parseFloat(v) || 0) * bpc(sku));
  const coll = x.method === "Collection";
  const flow = coll ? ["Pick", "Verify", "Confirm collector", "Hand over & complete"] : ["Pick & verify", "Assign officer", "Dispatch", "Out for delivery", "Outcome"];
  const idxMap: Record<string, number> = coll
    ? { Picking: 0, Verified: 2, Completed: 4 }
    : { Picking: 0, Verified: 1, Assigned: 2, "Out for delivery": 3, Delivered: 5, "Partially delivered": 5, Failed: 5 };
  const idx = idxMap[x.status] ?? -1;
  const picking = x.status === "Picking" && canProcess;
  const handover = coll && x.status === "Verified" && canProcess;
  const outcome = x.status === "Out for delivery" && (S.can("dsp.deliver") || canProcess) && (!isDriver || x.driver === me);
  const partial = outcome && form.outcome === "Partially delivered";

  const E = (i: number, k: string, def: string) => (edits[i] && edits[i][k] != null ? edits[i][k] : def);
  const setE = (i: number, k: string) => (v: string) => {
    setEdits((ed) => ({ ...ed, [i]: { ...(ed[i] || {}), [k]: v.replace(/[^0-9.]/g, "") } }));
    setErr("");
  };
  const fieldCols = coll ? ["Picked", "Verified", "Handed over"] : ["Picked", "Verified", "Dispatched", "Delivered"];
  const finished = ["Delivered", "Partially delivered", "Failed"].includes(x.status);

  const lines = x.lines.map((l, i) => {
    const p = S.prod(l.sku);
    const F = (edit: boolean, k: string, def: string, txt: string, tone: Tone = "default"): Cell => {
      const v = E(i, k, def);
      const b = toB(l.sku, v);
      return { edit, key: k, val: v, conv: S.qty(l.sku, b), over: b > l.ordered, txt, tone };
    };
    const cells = [
      F(picking, "picked", ctn(l.sku, l.picked || l.ordered), l.picked ? S.qty(l.sku, l.picked) : "—"),
      F(picking, "verified", ctn(l.sku, l.verified || l.ordered), l.verified ? S.qty(l.sku, l.verified) : "—", "success"),
    ];
    if (coll) cells.push(F(handover, "handed", ctn(l.sku, l.verified), l.dispatched ? S.qty(l.sku, l.dispatched) : "—", "primary"));
    else {
      cells.push(F(false, "", "", l.dispatched ? S.qty(l.sku, l.dispatched) : "—", "primary"));
      cells.push(
        F(
          partial,
          "delivered",
          ctn(l.sku, l.dispatched),
          finished ? S.qty(l.sku, l.delivered) + (l.delivered < l.dispatched ? " (" + S.qty(l.sku, l.dispatched - l.delivered) + " returned)" : "") : "—",
          l.delivered < l.dispatched && x.status !== "Out for delivery" ? "danger" : "success",
        ),
      );
    }
    const bt = ((l.batches || []) as { batch: string }[]).map((b) => b.batch).join(", ");
    return { sku: l.sku, name: p.name, loc: bt ? "FEFO batches: " + bt : p.batch ? "FEFO — earliest non-expired batch first" : "Not batch-tracked", ordered: S.qty(l.sku, l.ordered), cells };
  });

  const actions: Action[] = [];
  if (picking)
    actions.push({
      label: "Confirm pick & verify",
      variant: "default",
      go: () => {
        const r = S.dispatchVerify(
          x.id,
          x.lines.map((l, i) => ({ picked: toB(l.sku, E(i, "picked", ctn(l.sku, l.picked || l.ordered))), verified: toB(l.sku, E(i, "verified", ctn(l.sku, l.verified || l.ordered))) })),
        );
        if (!r.ok) return setErr(r.error);
        setEdits({});
        S.result(r, "Pick verified");
      },
    });
  if (handover)
    actions.push({
      label: "Complete handover",
      variant: "success",
      go: () => {
        const handed = x.lines.map((l, i) => toB(l.sku, E(i, "handed", ctn(l.sku, l.verified))));
        if (!form.collector.trim()) return setErr("Record who collected the goods.");
        S.confirm({
          title: "Complete handover for " + x.id + "?",
          body: "Stock is deducted once for the handed-over quantities, reservations are consumed, COGS is recorded at weighted-average cost and an invoice is raised. This cannot be repeated.",
          confirmLabel: "Complete handover",
          onConfirm: () => {
            const r = S.dispatchHandover(x.id, { collector: form.collector.trim(), collectorId: form.collectorId.trim(), handed });
            if (!r.ok) return setErr(r.error);
            S.result(r, "Collection completed");
          },
        });
      },
    });
  if (!coll && x.status === "Verified" && canProcess)
    actions.push({
      label: "Assign delivery officer",
      variant: "default",
      go: () => {
        const r = S.dispatchAssign(x.id, form.driver, form.vehicle.toUpperCase());
        if (!r.ok) return setErr(r.error);
        S.result(r, "Officer assigned");
      },
    });
  if (x.status === "Assigned" && canProcess)
    actions.push({
      label: "Record dispatch from warehouse",
      variant: "default",
      go: () =>
        S.confirm({
          title: "Dispatch " + x.id + "?",
          body: "Verified quantities leave " + S.wh(x.wh).name + " with " + S.uname(x.driver) + ". Stock is deducted now (once) and the invoice is raised.",
          confirmLabel: "Confirm dispatch",
          onConfirm: () => S.result(S.dispatchOut(x.id), "Dispatched"),
        }),
    });
  if (outcome)
    actions.push({
      label: "Record outcome",
      variant: form.outcome === "Delivered" ? "success" : "default",
      go: () => {
        const delivered = x.lines.map((l, i) => toB(l.sku, E(i, "delivered", ctn(l.sku, l.dispatched))));
        const r = S.dispatchDeliver(x.id, { outcome: form.outcome, recipient: form.recipient.trim(), pod: form.pod.trim() || (form.file ? "POD-" + x.id.slice(-4) : ""), note: form.note.trim(), delivered });
        if (!r.ok) return setErr(r.error);
        S.result(r, "Delivery " + form.outcome.toLowerCase());
      },
    });

  const banner: { text: string; tone: "success" | "info" | "warning" } | null = x.outcomeNote
    ? { text: x.status + ": " + x.outcomeNote, tone: "warning" }
    : x.deducted
      ? { text: "Stock deducted once on " + S.fmtDate(x.dispatchedAt) + (x.invoice ? " · invoice " + x.invoice : "") + (x.cogs ? " · COGS " + S.money(x.cogs) : "") + ". Any further attempt to dispatch is blocked.", tone: "success" }
      : x.status === "Picking"
        ? { text: "Pick from the reserved stock. Quantities above the order are blocked to prevent over-dispatch. Nothing is deducted yet.", tone: "info" }
        : null;

  const panelTitles: Record<string, string> = { Picking: "Pick list", Verified: coll ? "Hand over to customer" : "Ready for dispatch", Assigned: "Assigned — awaiting departure", "Out for delivery": "Record delivery outcome", Completed: "Collected", Delivered: "Delivered", "Partially delivered": "Partially delivered", Failed: "Failed delivery" };
  const panelHint = picking ? "Enter cartons (decimals allowed for packs/bars)" : handover ? "Record the actual quantity handed over" : partial ? "Enter quantity accepted by the recipient" : "";
  const lockText = S.role().readonly ? "Read-only role." : x.deducted && !outcome ? "Dispatch posted — locked." : isDriver && x.driver !== me ? "Assigned to another officer." : "No actions for your role.";
  const showAssign = !coll && x.status === "Verified" && canProcess;
  const customer = S.cust(o?.customer ?? "").name + (o?.walkin ? " — " + o.walkin : "");
  const printLabel = coll ? "Collection note" : "Dispatch note";
  const drivers = s.users.filter((u) => u.role === "driver" && u.status === "Active").map((u) => ({ value: u.id, label: u.name }));

  return (
    <>
      <DetailHeader
        backLabel="Dispatch board"
        onBack={() => S.nav("dispatch")}
        reference={x.id}
        title={customer}
        meta={
          <>
            <StatusBadge status={x.status} />
            <Badge tone="gray">{x.method}</Badge>
            <span>{x.so + " · " + S.wh(x.wh).name + " · " + (o?.terms ?? "") + (x.driver ? " · officer " + S.uname(x.driver) + (x.vehicle ? " (" + x.vehicle + ")" : "") : "") + (o?.address && !coll ? " · " + o.address : "")}</span>
          </>
        }
        actions={x.deducted && <Button variant="outline" onClick={() => setPrint(true)}><Printer />{printLabel}</Button>}
      />

      <Card className="flex overflow-x-auto px-4 py-3">
        {flow.map((label, i) => {
          const dn = i < idx;
          const cur = i === idx;
          return (
            <div key={label} className="flex min-w-[120px] flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex size-[22px] shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                  dn ? "border-success bg-success text-white" : cur ? "border-primary bg-primary text-primary-foreground" : "bg-card text-subtle-foreground",
                )}
              >
                {dn ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("text-xs whitespace-nowrap", cur && "font-semibold")}>{label}</span>
              <span className="mr-2 h-px min-w-2 flex-1 bg-border" />
            </div>
          );
        })}
      </Card>

      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      <Card className="overflow-hidden">
        <CardHeader title={panelTitles[x.status] || x.status} actions={panelHint && <span className="text-xs text-muted-foreground">{panelHint}</span>} />
        <Table>
          <THead>
            <tr>
              <TH>Product</TH>
              <TH align="right">To fulfil</TH>
              {fieldCols.map((c) => <TH key={c} align="right">{c}</TH>)}
            </tr>
          </THead>
          <TBody>
            {lines.map((l, i) => (
              <tr key={l.sku + i}>
                <TD className="min-w-[180px]">
                  <Ref>{l.sku}</Ref>
                  <div>{l.name}</div>
                  <div className="text-[11px] text-muted-foreground">{l.loc}</div>
                </TD>
                <TD nowrap align="right">{l.ordered}</TD>
                {l.cells.map((c, j) => (
                  <TD key={j} nowrap align="right">
                    {c.edit ? (
                      <>
                        <div className="flex items-center justify-end gap-1">
                          <Input value={c.val} onChange={(e) => setE(i, c.key)(e.target.value)} inputMode="decimal" aria-invalid={c.over || undefined} className="h-8 w-[76px] text-right tabular" />
                          <span className="text-[11px] text-muted-foreground">ctn</span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{c.conv}</div>
                      </>
                    ) : (
                      <span className={toneCls[c.tone]}>{c.txt}</span>
                    )}
                  </TD>
                ))}
              </tr>
            ))}
          </TBody>
        </Table>

        {err && <Alert tone="danger" className="mx-4 mt-3">{err}</Alert>}

        {handover && (
          <div className="grid grid-cols-1 gap-3 border-t px-4 py-3 sm:grid-cols-2">
            <Field label="Customer / authorised collector" required>
              <Input value={form.collector} onChange={(e) => setF("collector")(e.target.value)} placeholder="Full name" />
            </Field>
            <Field label="ID / authorisation reference">
              <Input value={form.collectorId} onChange={(e) => setF("collectorId")(e.target.value)} placeholder="Ghana Card or letter ref" />
            </Field>
            {o?.terms === "Cash" && (
              <Alert tone="warning" className="sm:col-span-2">Cash order — the cash received will be recorded as a payment with status “Recorded”, pending finance verification.</Alert>
            )}
          </div>
        )}

        {showAssign && (
          <div className="grid grid-cols-1 gap-3 border-t px-4 py-3 sm:grid-cols-2">
            <Field label="Delivery officer" required>
              <Select value={form.driver} onValueChange={setF("driver")} placeholder="Select…" options={drivers} />
            </Field>
            <Field label="Vehicle">
              <Input value={form.vehicle} onChange={(e) => setF("vehicle")(e.target.value)} placeholder="GT-0000-24" className="uppercase" />
            </Field>
          </div>
        )}

        {outcome && (
          <div className="flex flex-col gap-3 border-t px-4 py-3">
            <RadioGroup
              value={form.outcome}
              onValueChange={(v) => setForm((f) => ({ ...f, outcome: v as Outcome }))}
              options={[
                { value: "Delivered", label: "Delivered" },
                { value: "Partially delivered", label: "Partially delivered" },
                { value: "Failed", label: "Failed / returned" },
              ]}
              className="grid grid-cols-1 sm:grid-cols-3"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Recipient name" required={form.outcome !== "Failed"}>
                <Input value={form.recipient} onChange={(e) => setF("recipient")(e.target.value)} />
              </Field>
              <Field label="Proof-of-delivery reference">
                <Input value={form.pod} onChange={(e) => setF("pod")(e.target.value)} placeholder="e.g. signed note no." />
              </Field>
              <Field label="POD attachment (optional)">
                <FileInput value={form.file} onChange={setF("file")} accept="image/*,.pdf" />
              </Field>
              <Field label="Note" className="sm:col-span-2 lg:col-span-3">
                <Input value={form.note} onChange={(e) => setF("note")(e.target.value)} placeholder="Reason for partial/failed delivery" />
              </Field>
            </div>
            <div className="text-[11.5px] text-muted-foreground">Timestamp is captured automatically. GPS tracking is out of scope for this phase.</div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t bg-muted/60 px-4 py-3">
          {!actions.length && <span className="self-center text-xs text-muted-foreground">{lockText}</span>}
          {actions.map((a) => (
            <Button key={a.label} variant={a.variant} onClick={a.go}>{a.label}</Button>
          ))}
        </div>
      </Card>

      {print && x.deducted && <DispatchPrintDialog d={x} customer={customer} title={printLabel} onClose={() => setPrint(false)} />}
    </>
  );
}
