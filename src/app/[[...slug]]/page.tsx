import { ClientApp } from "@/components/app/client-app";

/* Every path renders the client app; the engine maps the URL to a module (see lib/store routeToUrl/urlToRoute). */
export default function Home() {
  return <ClientApp />;
}
