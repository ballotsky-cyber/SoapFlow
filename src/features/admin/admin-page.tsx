"use client";

import type { ModuleProps } from "@/components/app/modules";
import { Page } from "@/components/shared/page";
import { AuditView } from "./audit-view";
import { UsersView } from "./users-view";
import { SettingsView } from "./settings-view";

export default function AdminPage({ view }: ModuleProps) {
  const v = view || "users";
  return (
    <Page>
      {v === "audit" && <AuditView />}
      {v === "users" && <UsersView />}
      {v === "settings" && <SettingsView />}
    </Page>
  );
}
