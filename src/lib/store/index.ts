"use client";

import { useSyncExternalStore } from "react";
import { createSoapStore } from "./engine";
import type { Route, SoapStore } from "./types";

export type * from "./types";

let instance: SoapStore | null = null;

/** Singleton engine. Browser-only: the app shell is rendered client-side. */
export function getStore(): SoapStore {
  if (!instance) instance = createSoapStore();
  return instance;
}

/** Subscribe the calling component to every store change and return the engine. */
export function useSoap(): SoapStore {
  const S = getStore();
  useSyncExternalStore(S.subscribe, () => S.version, () => 0);
  return S;
}

/* ---------- URL <-> route mapping: /{name}/{id}?tab=…&action=… */

const PARAM_KEYS = ["tab", "action", "filter", "kind", "view", "sku", "so", "est", "inv", "customer"] as const;

export function routeToUrl(r: Route): string {
  const path = "/" + (r.name === "dashboard" && !r.id ? "" : r.name + (r.id ? "/" + encodeURIComponent(r.id) : ""));
  const qs = new URLSearchParams();
  PARAM_KEYS.forEach((k) => {
    const v = r[k];
    if (typeof v === "string" && v) qs.set(k, v);
  });
  const q = qs.toString();
  return path + (q ? "?" + q : "");
}

export function urlToRoute(pathname: string, search: string): Route {
  const [name, id] = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const route: Route = { name: name || "dashboard" };
  if (id) route.id = id;
  const qs = new URLSearchParams(search);
  PARAM_KEYS.forEach((k) => {
    const v = qs.get(k);
    if (v) route[k] = v;
  });
  return route;
}
