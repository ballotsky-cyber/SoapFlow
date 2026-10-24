"use client";

import dynamic from "next/dynamic";

function Splash() {
  return (
    <div className="flex h-dvh items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="flex size-9 animate-pulse-soft items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">SF</div>
        <span className="text-sm font-medium">Loading SoapFlow…</span>
      </div>
    </div>
  );
}

/* The demo engine keeps its data in localStorage, so the app renders in the browser only. */
export const ClientApp = dynamic(() => import("./app-shell").then((m) => m.AppShell), { ssr: false, loading: Splash });
