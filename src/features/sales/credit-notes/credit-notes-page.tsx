"use client";

import * as React from "react";
import { FileMinus, Mail, Plus, Printer, Search } from "lucide-react";
import { useSoap, type CreditNote, type SoapStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Alert, EmptyState } from "@/components/ui/misc";
import { DetailHeader, Grid, Page, PageHeader, Ref, Toolbar } from "@/components/shared/page";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActivityCard, DocLinesTable, KV, PartyCard, RelatedCard } from "@/features/sales/shared/doc-view";
import { mailDocument, PrintDocDialog, type PrintSpec } from "@/features/sales/shared/doc-print";
import { Totals } from "@/features/procurement/parts";
import { CreditNoteDialog } from "./credit-note-dialog";

/** Sales → Credit notes: returns, price corrections, discounts and adjustments against issued invoices. */
export default function CreditNotesPage() {
  const S = useSoap();
  const s = S.s;
  const route = s.route;
  const [form, setForm] = React.useState(() => route.action === "new" && S.can("cn.create"));
  const dialog = form && <CreditNoteDialog invId={typeof route.inv === "string" ? route.inv : undefined} onClose={() => setForm(false)} onSaved={(id) => S.nav("credit-notes", { id })} />;
  const n0 = route.id ? s.creditNotes.find((n) => n.id === route.id) : undefined;
  return (
    <Page>
      {n0 ? <CreditNoteDetail key={n0.id} n={n0} /> : <CreditNoteList onNew={() => setForm(true)} />}
      {dialog}
    </Page>
  );
}

function CreditNoteList({ onNew }: { onNew: () => void }) {
  const S = useSoap();
  const s = S.s;
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [page, setPage] = React.useState(1);
  const term = q.trim().toLowerCase();
  const rows = s.creditNotes.filter(
    (n) => (!type || n.type === type) && (!customer || n.customer === customer) && (!term || (n.id + " " + n.inv + " " + n.reason + " " + S.cust(n.customer).name).toLowerCase().includes(term)),
  );
  const pg = S.paginate(rows, page, 12);
  const reset = () => setPage(1);
  return (
    <>
      <PageHeader
        icon={FileMinus}
        title="Credit notes"
        description="Corrections to issued invoices. The original invoice is never edited; returned goods are restored to stock only after inspection."
        actions={S.can("cn.create") && <Button onClick={onNew}><Plus />New credit note</Button>}
      />
      <Toolbar>
        <Input icon={<Search />} value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder="Search credit note, invoice, reason or customer" className="w-full sm:w-72" />
        <Select value={type} onValueChange={(v) => { setType(v); reset(); }} options={[{ value: "", label: "All types" }, "Return", "Price correction", "Discount", "Adjustment"]} className="w-[calc(50%-4px)] sm:w-44" aria-label="Type" />
        <Select value={customer} onValueChange={(v) => { setCustomer(v); reset(); }} options={[{ value: "", label: "All customers" }, ...s.customers.map((c) => ({ value: c.id, label: c.name }))]} className="w-[calc(50%-4px)] sm:w-56" aria-label="Customer" />
      </Toolbar>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Credit note</TH>
              <TH>Invoice</TH>
              <TH>Customer</TH>
              <TH>Date</TH>
              <TH>Type</TH>
              <TH>Reason</TH>
              <TH align="right">Net</TH>
              <TH align="right">Tax</TH>
              <TH align="right">Amount</TH>
              <TH>Return</TH>
            </tr>
          </THead>
          <TBody>
            {pg.rows.map((n) => {
              const r = n.rtn ? s.returns.find((x) => x.id === n.rtn) : undefined;
              return (
                <TR key={n.id} onClick={() => S.nav("credit-notes", { id: n.id })}>
                  <TD nowrap><Ref>{n.id}</Ref></TD>
                  <TD nowrap><Ref onClick={() => S.nav("invoices", { id: n.inv })}>{n.inv}</Ref></TD>
                  <TD className="min-w-[150px]">{S.cust(n.customer).name}</TD>
                  <TD nowrap className="text-muted-foreground">{S.fmtDate(n.date)}</TD>
                  <TD nowrap>{n.type}</TD>
                  <TD className="max-w-[260px] min-w-[160px] truncate text-muted-foreground" title={n.reason}>{n.reason}</TD>
                  <TD nowrap align="right">{S.money(n.net)}</TD>
                  <TD nowrap align="right" className="text-muted-foreground">{S.money(n.tax)}</TD>
                  <TD nowrap align="right" className="font-semibold">{S.money(n.amount)}</TD>
                  <TD nowrap>{r ? <span className="inline-flex items-center gap-1.5"><span className="font-mono text-[11.5px]">{r.id}</span><StatusBadge status={r.status} /></span> : <span className="text-subtle-foreground">—</span>}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        {!pg.rows.length && <EmptyState icon={<Search />} title="No credit notes match." />}
        <Pagination {...pg} onPage={setPage} />
      </Card>
    </>
  );
}

export function creditNoteSpec(S: SoapStore, n: CreditNote): PrintSpec {
  return {
    title: "Credit note",
    number: n.id,
    facts: [["Credit note no.", n.id], ["Date", S.fmtDate(n.date)], ["Original invoice", n.inv], ...(n.so ? [["Sales order", n.so] as [string, string]] : []), ["Type", n.type], ["Issued by", S.uname(n.by)]],
    party: { label: "Credit to", p: n.party },
    lines: n.lines.length ? n.lines : undefined,
    table: n.lines.length ? undefined : { cols: ["Description", "Amount"], rows: [[n.type + " — " + n.reason, S.money(n.net)]], right: [1] },
    totals: [{ k: "Net", v: S.money(n.net) }, { k: "Tax", v: S.money(n.tax) }, { k: "Total credit", v: S.money(n.amount), strong: true }],
    notes: "Reason: " + n.reason + (n.rtn ? "\nReturned goods: " + n.rtn + " — restored to stock only after inspection." : ""),
    terms: "This credit note reduces the balance of invoice " + n.inv + ". It may be applied to that invoice or held on account.",
    signatures: ["Authorised by", "Customer acknowledgement"],
  };
}

function CreditNoteDetail({ n }: { n: CreditNote }) {
  const S = useSoap();
  const s = S.s;
  const [print, setPrint] = React.useState(false);
  const inv = s.invoices.find((i) => i.id === n.inv);
  const r = n.rtn ? s.returns.find((x) => x.id === n.rtn) : undefined;
  const email = {
    to: n.party.email || "",
    subject: `Credit note ${n.id} — ${s.settings.company}`,
    body: `Dear ${n.party.contact && n.party.contact !== "—" ? n.party.contact : n.party.name},\n\nWe have issued credit note ${n.id} for ${S.money(n.amount)} against invoice ${n.inv}.\nReason: ${n.reason}\n\nRegards,\n${s.settings.company}`,
  };
  return (
    <>
      <DetailHeader
        backLabel="Credit notes"
        onBack={() => S.nav("credit-notes")}
        reference={<span className="inline-flex items-center gap-2">{n.id}<StatusBadge status={n.status} /></span>}
        title={n.party.name}
        meta={`${n.type} · ${S.fmtDate(n.date)} · against ${n.inv} · by ${S.uname(n.by)}`}
        actions={[
          <Button key="p" variant="outline" onClick={() => setPrint(true)}><Printer />Print / PDF</Button>,
          <Button key="m" variant="outline" onClick={() => (email.to ? mailDocument(email.to, email.subject, email.body) : S.toast("warn", "No email on file", "Add an email address to the customer first."))}><Mail />Email</Button>,
        ]}
      />
      {n.reopen && <Alert tone="info">Raised automatically for goods refused on delivery. The quantity went back onto {n.so} to be delivered and invoiced again.</Alert>}
      {r && (
        <Alert tone={r.status === "Inspected" ? "success" : "warning"}>
          Return <b>{r.id}</b> — {r.status}.{" "}
          {r.status === "Inspected" ? "Accepted goods were restored to sellable stock after inspection." : r.status === "Awaiting return" ? "The goods have not been received yet; stock is unchanged." : "Goods are in quarantine awaiting inspection."}{" "}
          <Ref onClick={() => S.nav("dispatch", { tab: "returns", id: r.id })}>Open return</Ref>
        </Alert>
      )}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Card className="overflow-hidden">
            <CardHeader title={n.lines.length ? "Returned items" : "Credit"} />
            {n.lines.length ? (
              <DocLinesTable lines={n.lines} />
            ) : (
              <CardContent className="text-[12.5px]">{n.type} — {n.reason}</CardContent>
            )}
            <div className="flex justify-end border-t px-4 py-3">
              <Totals rows={[{ k: "Net", v: S.money(n.net) }, { k: "Tax", v: S.money(n.tax) }, { k: "Total credit", v: S.money(n.amount), strong: true }]} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Reason" />
            <CardContent className="text-[12.5px] whitespace-pre-line">{n.reason}</CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-3">
          <PartyCard party={n.party} id={n.customer} />
          {inv && (
            <Card>
              <CardHeader title="Invoice balance" actions={<Ref onClick={() => S.nav("invoices", { id: inv.id })}>{inv.id}</Ref>} />
              <CardContent>
                <KV rows={[["Invoice total", S.money(inv.total)], ["Paid", S.money(inv.paid)], ["Credited (all notes)", S.money(inv.credited)], ["Balance now", S.money(S.invBal(inv))], ["Status", <StatusBadge key="s" status={S.invStatus(inv)} />]]} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Grid min={380}>
        <RelatedCard id={n.id} />
        <ActivityCard id={n.id} />
      </Grid>
      {print && <PrintDocDialog spec={creditNoteSpec(S, n)} onClose={() => setPrint(false)} email={email.to ? email : undefined} />}
    </>
  );
}
