"use client";

import * as React from "react";
import { Download, History, Search } from "lucide-react";
import { useSoap } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/misc";
import { PageHeader, Ref, Toolbar } from "@/components/shared/page";

const PAGE_SIZE = 50;
const COLS = ["Timestamp", "User", "Action", "Reference", "Detail"];

export function AuditView() {
  const S = useSoap();
  const s = S.s;
  const [aq, setAq] = React.useState("");
  const [au, setAu] = React.useState("");
  const [page, setPage] = React.useState(1);

  const qq = aq.trim().toLowerCase();
  const rows = s.audit
    .filter((a) => (!au || a.user === au) && (!qq || (a.action + " " + a.ref + " " + a.detail).toLowerCase().includes(qq)))
    .map((a) => {
      const role = S.user(a.user).role;
      return { ...a, userName: S.uname(a.user), role: role ? S.ROLES[role].name : "" };
    });
  const pg = S.paginate(rows, page, PAGE_SIZE);

  const exportCsv = () =>
    S.csv("audit-trail", [...COLS, "Role"], rows.map((a) => [a.ts, a.userName, a.action, a.ref, a.detail, a.role]));

  return (
    <>
      <PageHeader
        icon={History}
        title="Audit trail"
        description="Immutable log of sensitive and financial actions. In production this is written server-side in the same transaction as the change."
        actions={<Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download />Export CSV</Button>}
      />
      <Toolbar>
        <Input icon={<Search />} value={aq} onChange={(e) => { setAq(e.target.value); setPage(1); }} placeholder="Search action, reference or detail" className="w-full sm:w-64" />
        <Select
          value={au}
          onValueChange={(v) => { setAu(v); setPage(1); }}
          options={[{ value: "", label: "All users" }, ...s.users.map((u) => ({ value: u.id, label: u.name }))]}
          className="w-full sm:w-52"
        />
      </Toolbar>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>{COLS.map((c) => <TH key={c}>{c}</TH>)}</tr>
          </THead>
          <TBody>
            {pg.rows.map((a) => (
              <tr key={a.id}>
                <TD nowrap className="font-mono text-[11.5px] text-muted-foreground">{a.ts}</TD>
                <TD nowrap>
                  {a.userName}
                  <div className="text-[11px] text-muted-foreground">{a.role}</div>
                </TD>
                <TD nowrap>{a.action}</TD>
                <TD nowrap><Ref>{a.ref}</Ref></TD>
                <TD className="min-w-[220px] text-secondary-foreground">{a.detail}</TD>
              </tr>
            ))}
          </TBody>
        </Table>
        {!rows.length && <EmptyState icon={<Search />} title="No audit entries match." />}
        {rows.length > 0 && <Pagination {...pg} onPage={setPage} />}
      </Card>
    </>
  );
}
