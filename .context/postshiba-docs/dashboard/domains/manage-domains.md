# Managing domains

> How to create, verify, import, suspend, and delete a sending domain.

Add a sending domain, publish its DNS records, and keep it healthy from the dashboard. Every action here also has an API route on [Sending domains](/docs/api-reference/domains).

## Before you start

- You need the Team Administrator role to add or change a domain.
- Use a host you control, such as `mail.example.com`. A single word such as `mta` is rejected. See [Subdomain or root domain?](/docs/knowledge-base/is-it-better-to-send-emails-from-a-subdomain).

## Add a domain

1. In the sidebar, open **Sending** → **Domains**, then select **Add domain**.
2. Enter the **Domain**, such as `mail.example.com`.
3. If your team has extra tenants, choose the **Tenant**. Only SMTP users on that tenant can send as the domain.
4. Leave **DKIM selector** as `ps1` unless you already use that selector.
5. To manage DKIM yourself, check **Publish a TXT yourself**. You can paste an existing key into **DKIM private key** to import it.
6. Select **Add domain**.

## Publish and verify DNS

The domain page lists each record under **DNS records**, with its name, type, value, and status.

1. Publish the DKIM record and the `rp` return-path CNAME at your DNS host. The DMARC record is optional.
2. Select **Check DNS**. PostShiba also re-checks on its own for a few minutes after you add the domain.
3. Send once **Check DNS** reports `Domain verified.` With your own TXT, `You can send.` also means the domain is ready.

To publish faster, select **Download BIND file** and import it at your DNS host. If your DNS is on Cloudflare and the default DKIM CNAME is in use, **Add records in Cloudflare** may appear. Mail CNAMEs on Cloudflare must stay DNS-only.

If a check fails, the page says which record is wrong and where it was found. See [What if my domain is not verifying?](/docs/knowledge-base/what-if-my-domain-is-not-verifying).

## Create a domain with the API

POST this body to `/api/v1/teams/:obfuscated_team_id/sending_domains`. `tenant_id` is optional and defaults to the default tenant.

```json domain.json
{
  "sending_domain": {
    "name": "mail.example.com",
    "tenant_id": "WbLcFd"
  }
}
```

The response carries `dkim_status`, `return_path_status`, and `sending_allowed`. Default DKIM can send when both statuses are `verified`. With your own TXT, `dkim_status` `verified` is enough.

## Change or refresh DKIM

- **Edit DKIM** changes the selector, switches to your own TXT, or imports a private key.
- **Refresh keys** issues a new keypair and sets `dkim_status` back to `pending`.

Both break authentication and sending until you publish the new DKIM record and it verifies.

## Suspend or resume a domain

Select **Suspend** to pause sending from that domain. Select **Resume** to turn it back on. DNS records stay in place either way.

While a domain is paused, REST sends return `403` `domain_suspended`, and SMTP and HTTP inject return `550` `domain_suspended`.

If **Resume** says the domain is still on the Spamhaus Domain Block List, clear that listing first, then resume. The API route is `POST /api/v1/sending_domains/:sending_domain_id/resume`. See [Errors](/docs/api-reference/errors).

## Make a domain primary

The first domain you add is the account primary. Outbound mail from other domains is also DKIM-signed with it. **Make primary** appears on any other verified domain that is not suspended. Select it to move the second signature.

## Remove a domain

Select **Remove**, then confirm. PostShiba blocks removal while a live inbox uses the domain. Disable those inboxes first. Disabled inboxes are detached when the domain goes.

## Next steps

- [Verified domains](/docs/dashboard/domains/introduction)
- [Return-path](/docs/dashboard/domains/custom-return-path)
- [Add and verify a domain](/docs/add-a-domain)
- [Sending domains API](/docs/api-reference/domains)
