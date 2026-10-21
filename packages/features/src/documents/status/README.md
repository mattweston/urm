STUDIO

per-domain observability would need domain_id on trace spans and a separate contract, and Metrics/System can't be domain-scoped at all.

---

Special Subdomain sitegen for status.{domain}

1. The status data. A static page shows static content. To report live up/down it needs a prober that isn't your app — a Cloudflare Worker on a Cron trigger pinging your API and writing to KV, with the page reading KV. Entirely within infrastructure you already have, no new vendor, and it keeps working while your app is down. That's the piece that makes it real.

2. Publishing incident updates. Automated status survives an outage; human-written updates ("we're aware, ETA 30m") normally go through the app that generates sites — which is the thing that's down. Options: accept automated-only during outages, or give the status page a minimal edit path that writes straight to KV rather than through the generator. Worth deciding deliberately, because it's the bit teams discover mid-incident.

The product case is good too: if you host tenant websites, tenants have their own outages to communicate, and status.<their-domain> is the conventional shape. You'd be dogfooding the feature under real conditions — which is the strongest version of the argument you made earlier.

I'd still do yours first, since it's one page and it exercises the Worker/KV prober before you commit to productising it.

Separately, still open from before: shall I wire studio into web-vite? It's the same mechanical job as the labs — the feature is complete, only the mounting is missing, and the RPCs are already platform-admin gated.
