# Switching from Mailgun

> Migrate Mailgun sending, metadata, delivery webhooks, and inbound Routes to PostShiba with a tested rollback path.

Move from Mailgun to PostShiba one slice of traffic at a time, with Mailgun ready as a fallback until you are sure. Your sender addresses, message content, and choice of HTTP or SMTP stay the same. Authentication, the send request, webhook signatures, and inbound routing change.

## Before you start

- A PostShiba team with a payment method. Request [production approval](/docs/knowledge-base/does-capsule-require-production-approval) early, because you can only send to your own team until it is approved.
- Access to DNS for each sending and receiving domain.
- An HTTPS endpoint that can receive webhooks.

## Take an inventory

Write these down before you change anything.

- Each Mailgun domain, its region (US or EU base URL), and every caller of `POST /v3/{domain}/messages`.
- API keys, domain sending keys, and per-domain SMTP credentials.
- Every `v:` variable, `X-Mailgun-Variables` header, and tag your code reads later.
- Webhook URLs, the events you rely on, and your signing key check.
- Inbound Routes, with their filters, priorities, and actions, plus the MX records and TTLs they depend on.
- Anything that uses mailing lists, stored templates, or IP pools. These need a replacement.

## How Mailgun concepts map to PostShiba

| Mailgun | PostShiba |
| --- | --- |
| Account and API key | Team and API key |
| Domain in the API path | The domain in `from`. It must be a verified sending domain. |
| Subaccount | [Tenant](/docs/dashboard/tenants/introduction) |
| Per-domain SMTP credential | SMTP credential for one tenant on a cluster |
| `v:` variables and `X-Mailgun-Variables` | `unique_args`, or the `X-Capsule-Unique-Args` header |
| Tags | A field in `unique_args`, such as `mail_type` |
| Stored templates | [Hosted Liquid templates](/docs/dashboard/templates/introduction), or HTML you render yourself |
| Mailing lists | Your own recipient list |
| IP pools | Clusters on shared IPs. You cannot choose an IP pool per message. |
| Webhooks and signing key | [Delivery webhook](/docs/webhooks/introduction) and its secret |
| Route `forward()` | [Inbox](/docs/dashboard/receiving/introduction) with a signed webhook, or [inbox forwarding](/docs/dashboard/receiving/forwarding) |
| Route `store()` | Received mail you [fetch later](/docs/dashboard/receiving/manage-emails) |

If a stream must go out on its own dedicated IP pool, keep it on Mailgun. PostShiba clusters are created on shared IPs. See [How do dedicated IPs work?](/docs/knowledge-base/how-do-dedicated-ips-work).

## Set up PostShiba

1. Create a [cluster](/docs/dashboard/clusters/introduction). Choose transactional or bulk to match the mail you are moving, and size the plan for your busiest hour at full volume.
2. Create an [API key](/docs/create-an-api-key) and store it on your server.
3. If you use subaccounts, create a [tenant](/docs/dashboard/tenants/introduction) for each before adding its domains. Otherwise use the default tenant. See [Setting up PostShiba for multi-tenant apps](/docs/knowledge-base/setting-up-capsule-for-multi-tenants).
4. [Add each sending domain](/docs/add-a-domain) under its tenant.
5. Issue an SMTP credential on the cluster for each extra tenant. The default tenant gets one when you create the cluster. REST sends need a live credential for the tenant too.
6. Wait until the cluster is `sending_ready` and approval is complete before sending real traffic.

## Publish DNS records

PostShiba uses its own DKIM selector and return-path host, so its records sit next to Mailgun's.

1. Open the domain in PostShiba and copy the records it shows.
2. Publish them at your DNS provider.

   | Record | Host | Type |
   | --- | --- | --- |
   | DKIM | `ps1._domainkey.mail.example.com` | CNAME |
   | Return-path | `rp.mail.example.com` | CNAME |

3. Click **Check DNS** and wait for the domain to verify.
4. Leave Mailgun's DKIM, SPF, and tracking records in place. You need them if you roll back.

If Mailgun already uses `ps1._domainkey` or `rp.` on that domain, the records collide. Send from a new subdomain on PostShiba instead. If a record will not verify, see [What if my domain is not verifying?](/docs/knowledge-base/what-if-my-domain-is-not-verifying).

## Bring your suppressions

Import your Mailgun suppressions before the first real send. Every address you miss is a bounce or complaint on your new cluster.

1. Export bounces, unsubscribes, and complaints for each domain from Mailgun, or pull them from its suppressions API.
2. Import each list into the matching tenant. Upload the CSV on the **Suppressions** page, or call the import API.

```bash import-suppressions.sh
curl --fail-with-body -sS -X POST \
  "https://app.postshiba.com/api/v1/teams/KjkAJW/suppressions/import" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": ["unsubscribed@example.com", "bounced@example.com"],
    "tenant_id": "WbLcFd"
  }'
```

```json import-response.json
{"imported": 2, "existing": 0, "invalid": 0}
```

Each request takes up to 10,000 addresses, and a CSV upload can be up to 2 MB. Imported rows have the reason **Manual**. Leave `tenant_id` out to import into the default tenant.

Do not import temporary failures. Mailgun unsubscribes can be per tag. PostShiba suppressions cover the whole tenant, so keep tag-level preferences in your app. While both providers run, write new unsubscribes and complaints to a store that both send paths check.

## Switch one send path

Mailgun takes form data at a URL that includes the domain, with HTTP Basic auth. PostShiba takes JSON at one URL with a Bearer token. The `from` domain and the optional `tenant` choose the sending identity.

- Move `v:name` values into `unique_args.name`.
- Move tags into a `unique_args` field.
- Render stored templates in your app, or port them to [PostShiba templates](/docs/dashboard/templates/send-with-a-template).

```bash send-canary.sh
curl --fail-with-body -sS -X POST \
  "https://app.postshiba.com/api/v1/emails" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Acme Receipts <receipts@mail.example.com>",
    "to": ["you@example.com"],
    "subject": "Order ord_123 confirmed",
    "text": "Thanks for your order.",
    "html": "<p>Thanks for your order.</p>",
    "tenant": "store-42",
    "unique_args": {"order_id": "ord_123", "mail_type": "receipt"}
  }'
```

A `201` response has `queued: true` and a `message_id`. Store the `message_id` with the provider name, so you never resend a message PostShiba already accepted. To match delivery events to your own records, put your own id in `unique_args`. It comes back on every event.

A few more changes:

- **Tenants.** Leave out `tenant` to use the default tenant. The tenant must own the `from` domain.
- **Retries.** If your retries need to be safe, send on the cluster's `POST /sends` with an `Idempotency-Key` header. See [Sending](/docs/api-reference/sending).
- **Volume.** The REST send API allows 300 requests a minute per API key. For more than that, use SMTP or HTTP inject.
- **Metadata limits.** `unique_args` takes up to 32 keys of plain values. Never put secrets in it. See [Unique args](/docs/dashboard/emails/unique-args).

**SMTP.** Replace the per-domain Mailgun credential with your PostShiba SMTP credential, on port 587 with STARTTLS and `AUTH PLAIN`. Put tracking fields in the `X-Capsule-Unique-Args` header as a JSON object. See [Send emails with SMTP](/docs/send-with-smtp).

## Replace delivery webhooks

1. Create a [delivery webhook](/docs/webhooks/introduction) and store its secret.
2. Parse the body as a JSON array. Each request holds one event, wrapped in an array in the SendGrid Event Webhook format.
3. Replace Mailgun's signature check. Mailgun signs a timestamp and token. PostShiba signs the raw body. See [Verify webhook requests](/docs/webhooks/verify-webhooks-requests).
4. Remove anything that waits for `opened`, `clicked`, or `stored`.
5. Send a test message and confirm your handler receives `order_id` and `mail_type`.

| Mailgun event | PostShiba event |
| --- | --- |
| `accepted` | `processed` |
| `delivered` | `delivered` |
| `failed` (temporary) | `deferred` |
| `failed` (permanent) | `bounce` |
| `rejected` | `dropped` |
| `complained` | `spamreport` |
| `unsubscribed` | `unsubscribe` |
| `opened`, `clicked`, `stored` | Not sent |

The full field list is on [Event types](/docs/webhooks/event-types).

## Run both providers in parallel

Route each new message to exactly one provider. Pick a stable slice, such as a set of tenants or one message type, and record which provider sent each message. Retries and rollback then stay on the same provider. Never send the same message through both.

| Stage | Days | Share on PostShiba | Move on when |
| --- | --- | --- | --- |
| 1 | 1 to 3 | Test sends only | Content, DKIM, return-path, and webhooks check out |
| 2 | 4 to 10 | About 10% | Bounce, deferral, and complaint rates look like Mailgun's |
| 3 | 11 to 17 | About 25% | The same checks still hold |
| 4 | 18 to 24 | About 50% | The same checks still hold |
| 5 | 25 to 30 | 100% | Stay here through your rollback window |

Adjust the schedule for your volume and risk. PostShiba clusters use shared IPs, so this ramp tests your integration. It is not IP warming. While approval is pending, stage 1 can only send to your own team.

## Move inbound mail

Move receiving separately, after outbound is stable. MX records cannot split mail by percentage, and records at the same priority do not copy mail to both.

1. Create an [inbox](/docs/dashboard/receiving/introduction) for each address a Route handles, or one catch-all inbox with the local part `*` on a domain-bound host.
2. Move the Route's filter logic into your webhook handler.
3. Choose a signed [receiving webhook](/docs/dashboard/receiving/create-receiving-webhook), or [fetch stored messages](/docs/dashboard/receiving/manage-emails) instead.
4. Test on a hosted inbox or a new subdomain first.
5. Lower the TTL on the current MX record, and wait for the old TTL to pass.
6. If Mailgun receives on the same host you want PostShiba to use, replace its MX record with the one shown on the inbox. Otherwise point your Reply-To addresses or aliases at the new PostShiba address and leave Mailgun's MX alone.

Receive on a subdomain, not on a host that already has mailboxes. See [How do I avoid MX conflicts?](/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records).

## Roll back

- **Outbound.** Point your router back at Mailgun for new messages only. Do not resend anything that already has a PostShiba `message_id`, because it was accepted and may still be delivered. Keep the PostShiba webhook running so late events still arrive.
- **Inbound.** Restore Mailgun's MX record, or point Reply-To back at the old address. Keep both inbound handlers running until the old TTL has passed, because some senders cache MX records.

Keep Mailgun keys, webhooks, Routes, and DNS records until your rollback window closes.

## Finish the cutover

After you have run at 100% for your whole rollback window with healthy checks:

1. Revoke your Mailgun API keys and SMTP credentials.
2. Remove Mailgun webhooks and Routes.
3. Delete Mailgun's DNS records. Keep the PostShiba DKIM, return-path, and MX records.

## Final checklist

- [ ] The cluster is `sending_ready` and production approval is complete.
- [ ] Every subaccount has a tenant with a verified domain and a live credential.
- [ ] Suppressions are imported into the right tenants.
- [ ] A real send produced delivery events with the right `unique_args`.
- [ ] Webhook verification uses the raw body and PostShiba's signature.
- [ ] Nothing waits for `opened`, `clicked`, or `stored`.
- [ ] Templates, lists, and IP pool dependencies have replacements.
- [ ] Inbound webhooks or polling work before the MX change.
- [ ] Your router sends each message through exactly one provider.
- [ ] Mailgun stays ready until the rollback window closes.

## Next steps

- [Send emails with HTTP](/docs/send-with-http)
- [Send emails with SMTP](/docs/send-with-smtp)
- [Managing webhooks](/docs/webhooks/introduction)
- [Receiving emails](/docs/dashboard/receiving/introduction)
