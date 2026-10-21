# Switching from SendGrid

> Keep the Event Webhook array and optional Inbound Parse fields. Replace send credentials and webhook verification.

Move from SendGrid to PostShiba one slice of traffic at a time, with SendGrid ready as a fallback until you are sure. Much of the SendGrid shape carries over. Delivery webhooks are still a JSON array of SendGrid-style events, SMTP still reads `unique_args` inside `X-SMTPAPI`, and inboxes can post Inbound Parse fields. The send API, keys, and webhook signatures change.

## Before you start

- A PostShiba team with a payment method. Request [production approval](/docs/knowledge-base/does-capsule-require-production-approval) early, because you can only send to your own team until it is approved.
- Access to DNS for each sending domain.
- An HTTPS endpoint that can receive webhooks.
- A list of everything that uses SendGrid today. See the inventory below.

## Take an inventory

Write these down before you change anything.

- Every caller of `/v3/mail/send` and every SMTP client, with the key and sending domain each uses.
- Subusers, with their domains, credentials, suppressions, and inbound routes.
- The `custom_args` and `X-SMTPAPI` `unique_args` fields your event handlers read.
- Event Webhook URLs, the event types you subscribe to, and how you verify them.
- Inbound Parse hostnames, MX records, destination URLs, and how you handle attachments.
- Anything that uses Dynamic Templates, `send_at`, ASM groups, or `ip_pool_name`. These need a replacement.

## How SendGrid concepts map to PostShiba

| SendGrid | PostShiba |
| --- | --- |
| Account and `SG.` API key | Team and API key |
| Subuser | [Tenant](/docs/dashboard/tenants/introduction) |
| Authenticated domain | Verified sending domain, with DKIM and return-path records |
| `POST /v3/mail/send` | `POST /api/v1/emails` with flat JSON |
| `smtp.sendgrid.net` with username `apikey` | Your cluster's SMTP host, with an issued `smtp_` username |
| `custom_args` and `X-SMTPAPI` `unique_args` | `unique_args`, or the `X-Capsule-Unique-Args` header |
| Dynamic Templates | [Hosted Liquid templates](/docs/dashboard/templates/introduction), or HTML you render yourself |
| Suppressions and ASM groups | [Suppressions](/docs/dashboard/emails/email-suppressions). Group preferences stay in your app. |
| IP pools | Clusters on shared IPs. You cannot choose an IP pool per message. |
| `send_at` | Your own job queue |
| Event Webhook | [Delivery webhook](/docs/webhooks/introduction) with the same array shape and PostShiba signatures |
| Inbound Parse | [Inbox](/docs/dashboard/receiving/introduction) with the `sendgrid_parse` webhook format |

## Set up PostShiba

1. Create a [cluster](/docs/dashboard/clusters/introduction). Choose transactional or bulk to match the mail you are moving, and size the plan for your busiest hour at full volume.
2. Create an [API key](/docs/create-an-api-key) and store it on your server.
3. If you use subusers to separate customers, create a [tenant](/docs/dashboard/tenants/introduction) for each. Otherwise use the default tenant. See [Setting up PostShiba for multi-tenant apps](/docs/knowledge-base/setting-up-capsule-for-multi-tenants).
4. [Add each sending domain](/docs/add-a-domain) under its tenant.
5. Issue an SMTP credential on the cluster for each extra tenant. The default tenant gets one when you create the cluster. REST sends need a live credential for the tenant too.
6. Wait until the cluster is `sending_ready` and approval is complete before sending real traffic.

## Publish DNS records

PostShiba uses its own DKIM selector and return-path host, so its records sit next to SendGrid's.

1. Open the domain in PostShiba and copy the records it shows.
2. Publish them at your DNS provider.

   | Record | Host | Type |
   | --- | --- | --- |
   | DKIM | `ps1._domainkey.mail.example.com` | CNAME |
   | Return-path | `rp.mail.example.com` | CNAME |

3. Click **Check DNS** and wait for the domain to verify.
4. Leave SendGrid's DKIM, link branding, and SPF records in place. You need them if you roll back.

If SendGrid already uses `ps1._domainkey` or `rp.` on that domain, the records collide. Send from a new subdomain on PostShiba instead. If a record will not verify, see [What if my domain is not verifying?](/docs/knowledge-base/what-if-my-domain-is-not-verifying).

## Bring your suppressions

Import your SendGrid suppressions before the first real send. Every address you miss is a bounce or complaint on your new cluster.

1. Export bounces, spam reports, unsubscribes, global unsubscribes, and invalid emails from SendGrid, as CSV or through the Suppressions API.
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

Do not import SendGrid Blocks. Those are usually temporary. Keep ASM group preferences in your app. While both providers run, write new unsubscribes and complaints to a store that both send paths check.

## Switch one send path

Change one caller at a time. SendGrid's nested `personalizations` become a flat request.

- Combine `from.email` and `from.name` into one `from` string.
- Turn recipient objects into address strings in `to`, `cc`, and `bcc`.
- Move `content` into `text` and `html`.
- Move `custom_args` into `unique_args`.
- Send one request for each different message. There is no `personalizations` array.

```bash send-receipt.sh
curl --fail-with-body -sS -X POST \
  "https://app.postshiba.com/api/v1/emails" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Acme Receipts <receipts@mail.example.com>",
    "to": ["you@example.com"],
    "subject": "Receipt ord_123",
    "text": "Thanks for your order.",
    "html": "<p>Thanks for your order.</p>",
    "tenant": "acme",
    "unique_args": {"order_id": "ord_123", "source": "checkout"}
  }'
```

A `201` response has `queued: true` and a `message_id`. Store the `message_id` with the provider name, so you never resend a message PostShiba already accepted. To match delivery events to your own records, put your own id in `unique_args`, as `order_id` is here. It comes back on every event.

A few more changes:

- **Templates.** Render Dynamic Templates in your app, or port them to [PostShiba templates](/docs/dashboard/templates/send-with-a-template).
- **Retries.** If your retries need to be safe, send on the cluster's `POST /sends` with an `Idempotency-Key` header. See [Sending](/docs/api-reference/sending).
- **Volume.** The REST send API allows 300 requests a minute per API key. For more than that, use SMTP or HTTP inject.
- **Tenants.** Use a tenant slug or id you have confirmed. An unknown `tenant` is rejected. See [Errors](/docs/api-reference/errors).
- **Metadata limits.** `unique_args` takes up to 32 keys of plain values. See [Unique args](/docs/dashboard/emails/unique-args).

**SMTP.** Replace username `apikey` and the `SG.` password with your PostShiba SMTP credential, on port 587 with STARTTLS and `AUTH PLAIN`. You can keep the `X-SMTPAPI` header for its `unique_args`, or switch to `X-Capsule-Unique-Args`. See [Send emails with SMTP](/docs/send-with-smtp).

## Replace delivery webhooks

1. Create a [delivery webhook](/docs/webhooks/introduction) and store its secret.
2. Keep your array parser. The event objects use SendGrid field names such as `event`, `email`, `sg_event_id`, and `sg_message_id`.
3. Replace SendGrid's signature check with PostShiba's. See [Verify webhook requests](/docs/webhooks/verify-webhooks-requests).
4. Remove anything that waits for `open` or `click`. PostShiba does not send them.
5. Send a test message and confirm your handler receives `order_id` and `source`.

| SendGrid event | PostShiba event |
| --- | --- |
| `processed` | `processed` |
| `delivered` | `delivered` |
| `deferred` | `deferred` |
| `bounce` | `bounce` |
| `dropped` | `dropped` |
| `spamreport` | `spamreport` |
| `unsubscribe` | `unsubscribe` |
| `open`, `click`, `group_unsubscribe`, `group_resubscribe` | Not sent |

The full field list is on [Event types](/docs/webhooks/event-types).

## Run both providers in parallel

Route each new message to exactly one provider. Pick a stable slice, such as a set of tenants or one message type, and record which provider sent each message. Retries and rollback then stay on the same provider. Never send the same message through both.

| Stage | Days | Share on PostShiba | Move on when |
| --- | --- | --- | --- |
| 1 | 1 to 3 | Test sends only | Content, DKIM, return-path, and webhooks check out |
| 2 | 4 to 10 | About 10% | Bounce, deferral, and complaint rates look like SendGrid's |
| 3 | 11 to 17 | About 25% | The same checks still hold |
| 4 | 18 to 24 | About 50% | The same checks still hold |
| 5 | 25 to 30 | 100% | Stay here through your rollback window |

Adjust the schedule for your volume and risk. PostShiba clusters use shared IPs, so this ramp tests your integration. It is not IP warming. While approval is pending, stage 1 can only send to your own team.

## Move inbound mail

Move receiving separately, after outbound is stable. MX records cannot split mail by percentage.

1. Create a domain-bound [inbox](/docs/dashboard/receiving/introduction) and choose the `sendgrid_parse` webhook format.
2. Update your handler. PostShiba posts the Inbound Parse fields as URL-encoded form data, not multipart uploads, so test attachments. See [Receiving webhooks](/docs/dashboard/receiving/create-receiving-webhook).
3. Test on a hosted inbox or a new subdomain first.
4. Lower the TTL on the current MX record, and wait for the old TTL to pass.
5. Point the MX record at the PostShiba inbound host shown on the inbox. Never leave SendGrid and PostShiba MX records at the same priority.

Receive on a subdomain, not on a host that already has mailboxes. See [How do I avoid MX conflicts?](/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records).

## Roll back

- **Outbound.** Point your router back at SendGrid for new messages only. Do not resend anything that already has a PostShiba `message_id`, because it was accepted and may still be delivered. Keep the PostShiba webhook running so late events still arrive.
- **Inbound.** Restore the SendGrid MX record. Keep both inbound handlers running until the old TTL has passed, because some senders cache MX records.

Keep SendGrid keys, webhooks, Inbound Parse settings, and DNS records until your rollback window closes.

## Finish the cutover

After you have run at 100% for your whole rollback window with healthy checks:

1. Revoke your SendGrid API keys and SMTP credentials.
2. Remove the SendGrid Event Webhook and Inbound Parse settings.
3. Delete SendGrid's DNS records. Keep the PostShiba DKIM, return-path, and MX records.

## Final checklist

- [ ] The cluster is `sending_ready` and production approval is complete.
- [ ] Every subuser has a tenant with a verified domain and a live credential.
- [ ] Suppressions are imported into the right tenants.
- [ ] A real send produced delivery events with the right `unique_args`.
- [ ] Webhook verification uses the raw body and PostShiba's signature.
- [ ] Nothing waits for `open` or `click`.
- [ ] Inbound Parse fields and attachments work on the new inbox.
- [ ] Your router sends each message through exactly one provider.
- [ ] SendGrid stays ready until the rollback window closes.

## Next steps

- [Send emails with HTTP](/docs/send-with-http)
- [Send emails with SMTP](/docs/send-with-smtp)
- [Managing webhooks](/docs/webhooks/introduction)
- [How to manage suppressions](/docs/dashboard/emails/email-suppressions)
