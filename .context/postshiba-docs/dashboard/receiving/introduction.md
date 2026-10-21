# Receiving emails

> Hosted inboxes or MX on a host you choose.

An inbox gives you an address that receives mail. PostShiba stores each message, and can POST it to a webhook or forward it.

## Choose an inbox type

| Type | Address | DNS | Where you create it |
| --- | --- | --- | --- |
| Domain-bound | A host under one of your sending domains, such as `support@inbound.example.com` | MX on that host | Dashboard or API |
| Hosted | A generated address on the PostShiba inbound zone | None | API only |

Use a domain-bound inbox when people should see your domain on the mailbox. Use a hosted inbox, created over the [Inboxes](/docs/api-reference/inboxes) API, when you need an address before DNS is ready. The dashboard form only offers domain-bound inboxes.

## Issue an inbox in the dashboard

1. In the sidebar, open **Inbound** → **Inboxes**, then select **Issue inbox**.
2. Enter a **Name**.
3. Choose the **Sending domain**. It can still be waiting on DNS. The inbox starts receiving once the domain verifies.
4. Under **Where should mail land?**, choose **A subdomain** (default `inbound.your-domain`) or **Root domain**. Do not pick the root if the domain already receives mail.
5. Type the mailbox in **Address**, such as `support`. Use `*` for a catch-all.
6. Optionally set **Forward to**, **Webhook URL**, and **Webhook format**. **Tenant** appears when your team has extra tenants.
7. Select **Issue inbox**, then publish the MX record. See [Custom receiving domains](/docs/dashboard/receiving/custom-domains).

You can issue inboxes while your team waits for [production approval](/docs/knowledge-base/does-capsule-require-production-approval). You need the Team Administrator role.

## Limits

- Inbound mail has one hourly allowance for the whole team, shared across every inbox. It equals the sum of your clusters' hourly send caps. The inbox page shows how much is used this hour.
- Over the allowance, inbound SMTP returns `451 hourly inbound limit reached`, and the sender retries later.
- Stored mail expires after the retention window shown on the inbox page (`retention_hours` in the API).

## Retention and storage

Message retention is one setting for sent and received mail, under Events > Retention.

- **Off (the default).** On an inbox with a webhook, the message body and attachments are removed once the webhook succeeds (and forwarding, if the inbox forwards). Otherwise mail is kept for 7 days.
- **7 to 365 days.** Each message and its attachments are kept for that many days from when it arrived, or 7 days if that is longer, even after the webhook delivers. The message page shows the date under Kept until. Changing the setting applies to mail received from then on.

Retained received mail costs the same as retained sent mail, from $0.065 per 1,000 messages. Receiving is free. Inbox storage is $0.50 per GB-month for the mail your inboxes hold. The inbox page shows how much each inbox holds (`stored_bytes` in the API), and Billing shows this period's storage.

## Next steps

- [Custom receiving domains](/docs/dashboard/receiving/custom-domains)
- [Managing received emails](/docs/dashboard/receiving/manage-emails)
- [Receiving webhooks](/docs/dashboard/receiving/create-receiving-webhook)
- [Inbox forwarding](/docs/dashboard/receiving/forwarding)
- [Inboxes API](/docs/api-reference/inboxes)
