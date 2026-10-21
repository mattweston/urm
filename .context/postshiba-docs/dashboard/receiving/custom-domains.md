# Custom receiving domains

> MX on inbound.your-domain, another subdomain, or the root if it has no MX.

A domain-bound inbox receives mail on a host under one of your sending domains. This guide shows how to pick the host and publish its MX record.

## Before you start

- A sending domain. It doesn't need to be verified yet. Create the inbox right after adding the domain, and the domain's DNS records list and BIND file include the MX record, so you can publish everything in one visit. See [Add and verify a domain](/docs/add-a-domain).
- Pick a host that does not already receive mail. PostShiba refuses a host that already has MX records. See [How do I avoid MX conflicts?](/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records).

## Pick the receive host

| Choice on the form | Host | When to use it |
| --- | --- | --- |
| **A subdomain** | `inbound.your-domain` by default. You can change the prefix. | Almost always. It keeps your root MX free. |
| **Root domain** | `your-domain` | Only when the domain has no mail today. |

Over the API, set `host` on create, or leave it blank to use `inbound.{sending_domain}`. The host must be the sending domain or a subdomain of it, and cannot be `rp.{sending_domain}`.

## Publish MX

1. [Issue the inbox](/docs/dashboard/receiving/introduction) on the sending domain and host you picked.
2. On the inbox page, select the **MX** pill. It shows the record name, type, value, and status.
3. Publish that MX record at your DNS host. You can also select **Download BIND file** and import it.
4. Select **Check MX**. The check runs in the background. The API route is `POST /api/v1/inboxes/:inbox_id/verify`.

Mail reaches the inbox once the MX record resolves. Hosted inboxes skip all of this. See [Receiving emails](/docs/dashboard/receiving/introduction).

## Next steps

- [Receiving emails](/docs/dashboard/receiving/introduction)
- [Managing received emails](/docs/dashboard/receiving/manage-emails)
- [How do I avoid MX conflicts?](/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records)
- [Inboxes API](/docs/api-reference/inboxes)
