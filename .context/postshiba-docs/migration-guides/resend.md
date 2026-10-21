# Switching from Resend

> Keep the same core send fields while moving authentication, delivery events, and inbound mail to PostShiba.

Move from Resend to PostShiba one slice of traffic at a time, with Resend ready as a fallback until you are sure. The core send fields, `from`, `to`, `subject`, and `html`, stay the same. The endpoint, the `re_` API key, webhooks, and receiving change.

## Before you start

- A PostShiba team with a payment method. Request [production approval](/docs/knowledge-base/does-capsule-require-production-approval) early, because you can only send to your own team until it is approved.
- Access to DNS for each sending and receiving domain.
- An HTTPS endpoint that can receive webhooks.

## Take an inventory

Write these down before you change anything.

- Your Resend API keys, verified domains, and sending subdomains.
- Every HTTP and SMTP caller, including how it uses idempotency keys, tags, attachments, and templates.
- Webhook URLs, their secrets, the events your code handles, and anything that depends on opens or clicks.
- Receiving domains, MX records, and attachment handling.
- Any audience or broadcast workflow. PostShiba does not replace these.

## How Resend concepts map to PostShiba

| Resend | PostShiba |
| --- | --- |
| Team and `re_` API key | Team and API key |
| `POST /emails` | `POST /api/v1/emails`, or `POST /sends` on a cluster when you need idempotency |
| Verified domain | Verified sending domain |
| Separate teams or keys per customer | [Tenants](/docs/dashboard/tenants/introduction) |
| Tags | `unique_args` |
| `Idempotency-Key` header | `Idempotency-Key` header on the cluster's `POST /sends` |
| Templates | [Hosted Liquid templates](/docs/dashboard/templates/introduction). Variables such as `{{{FIRST_NAME}}}` become Liquid, such as `{{ name }}`. |
| SMTP login | SMTP credential for one tenant on a cluster |
| Webhooks with `email.*` events | [Delivery webhook](/docs/webhooks/introduction) with a SendGrid-style event array |
| Receiving | [Inbox](/docs/dashboard/receiving/introduction) with a signed webhook, or received mail you fetch later |
| Audiences and broadcasts | Your own contact list, campaigns, and scheduling |

## Set up PostShiba

1. Create a [cluster](/docs/dashboard/clusters/introduction). Choose transactional or bulk to match the mail you are moving, and size the plan for your busiest hour at full volume.
2. Create an [API key](/docs/create-an-api-key) and store it on your server.
3. If separate teams or keys keep customers apart, create a [tenant](/docs/dashboard/tenants/introduction) for each. Otherwise use the default tenant. See [Setting up PostShiba for multi-tenant apps](/docs/knowledge-base/setting-up-capsule-for-multi-tenants).
4. [Add each sending domain](/docs/add-a-domain) under its tenant.
5. Issue an SMTP credential on the cluster for each extra tenant. The default tenant gets one when you create the cluster. REST sends need a live credential for the tenant too.
6. Wait until the cluster is `sending_ready` and approval is complete before sending real traffic.

## Publish DNS records

PostShiba uses its own DKIM selector and return-path host, so its records sit next to Resend's.

1. Open the domain in PostShiba and copy the records it shows.
2. Publish them at your DNS provider.

   | Record | Host | Type |
   | --- | --- | --- |
   | DKIM | `ps1._domainkey.mail.example.com` | CNAME |
   | Return-path | `rp.mail.example.com` | CNAME |

3. Click **Check DNS** and wait for the domain to verify.
4. Leave Resend's DKIM, SPF, and bounce records in place. You need them if you roll back.

If Resend already uses `ps1._domainkey` or `rp.` on that domain, the records collide. Send from a new subdomain on PostShiba instead. If a record will not verify, see [What if my domain is not verifying?](/docs/knowledge-base/what-if-my-domain-is-not-verifying).

## Bring your suppressions

Import your bounced, complained, and unsubscribed addresses before the first real send. Every address you miss is a bounce or complaint on your new cluster.

1. Export those addresses from Resend or from your own database.
2. Import each list into the matching tenant. Upload the CSV on the **Suppressions** page, or call the import API.

```bash import-suppressions.sh
curl --fail-with-body -sS -X POST \
  "https://app.postshiba.com/api/v1/teams/KjkAJW/suppressions/import" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": ["unsubscribed@example.com", "bounced@example.com"]
  }'
```

```json import-response.json
{"imported": 2, "existing": 0, "invalid": 0}
```

Each request takes up to 10,000 addresses, and a CSV upload can be up to 2 MB. Imported rows have the reason **Manual**. This example leaves `tenant_id` out, so the rows go into the default tenant. Add `tenant_id` to import into another tenant.

While both providers run, write new unsubscribes and complaints to a store that both send paths check.

## Switch one send path

The four core fields keep their names. If your Resend calls use idempotency keys, send on the cluster's `POST /sends`, which accepts the same `Idempotency-Key` header and replays the first response for 24 hours.

```bash send-password-reset.sh
curl --fail-with-body -sS -X POST \
  "https://app.postshiba.com/api/v1/teams/KjkAJW/clusters/NmQpXr/sends" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: password-reset/user-123" \
  -d '{
    "from": "Acme <hello@mail.example.com>",
    "to": ["you@example.com"],
    "subject": "Reset your password",
    "html": "<p>Use your one-time reset link.</p>",
    "unique_args": {"workflow": "password-reset", "user_id": "user-123"}
  }'
```

A `201` response has `queued: true` and a `message_id`. Store the `message_id` with the provider name, so you never resend a message PostShiba already accepted. To match delivery events to your own records, put your own id in `unique_args`. It comes back on every event.

A few more changes:

- **Tags.** Move tags into `unique_args`, up to 32 keys of plain values. See [Unique args](/docs/dashboard/emails/unique-args).
- **Attachments.** Fetch remote files yourself. Resend's `path` and `content_id` have no equivalent. Send `filename`, base64 `content`, and an optional `content_type`. See [Attachments](/docs/dashboard/emails/attachments).
- **Templates.** Port Resend templates to [PostShiba templates](/docs/dashboard/templates/send-with-a-template), or render HTML in your app.
- **Volume.** The REST send API allows 300 requests a minute per API key. For more than that, use SMTP or HTTP inject.

**SMTP.** Replace the Resend SMTP login with your PostShiba SMTP credential, on port 587 with STARTTLS and `AUTH PLAIN`. Put tracking fields in the `X-Capsule-Unique-Args` header as a JSON object. See [Send emails with SMTP](/docs/send-with-smtp).

## Replace delivery webhooks

1. Create a [delivery webhook](/docs/webhooks/introduction) and store its secret.
2. Parse a JSON array and handle each object by its `event` field. Deduplicate on `sg_event_id`.
3. Replace the Svix signature check with PostShiba's. See [Verify webhook requests](/docs/webhooks/verify-webhooks-requests).
4. Remove anything that waits for opens or clicks.
5. Read send errors such as `suppressed` from the send response, not from a webhook. See [Errors](/docs/api-reference/errors).

| Resend event | PostShiba event |
| --- | --- |
| `email.sent` | `processed` |
| `email.delivered` | `delivered` |
| `email.delivery_delayed` | `deferred` |
| `email.bounced` | `bounce` |
| `email.complained` | `spamreport` |
| `email.opened`, `email.clicked` | Not sent |
| No Resend equivalent | `dropped` and `unsubscribe`. Add handlers for both. |

The full field list is on [Event types](/docs/webhooks/event-types).

## Run both providers in parallel

Route each new message to exactly one provider. Pick a stable slice, such as a set of tenants or one message type, and record which provider sent each message. Retries and rollback then stay on the same provider. Never send the same message through both.

| Stage | Days | Share on PostShiba | Move on when |
| --- | --- | --- | --- |
| 1 | 1 to 3 | Test sends only | Content, DKIM, return-path, attachments, and webhooks check out |
| 2 | 4 to 10 | About 10% | Bounce, deferral, and complaint rates look like Resend's |
| 3 | 11 to 17 | About 25% | The same checks still hold |
| 4 | 18 to 24 | About 50% | The same checks still hold |
| 5 | 25 to 30 | 100% | Stay here through your rollback window |

Adjust the schedule for your volume and risk. PostShiba clusters use shared IPs, so this ramp tests your integration. It is not IP warming. For stage 1, you can add `"sandbox": true` to a `POST /sends` body. It runs every check without sending. See [Sending](/docs/api-reference/sending).

## Move inbound mail

Move receiving separately, after outbound is stable. MX records cannot split mail by percentage.

1. Create an [inbox](/docs/dashboard/receiving/introduction) for each address. For catch-all receiving, create a domain-bound inbox with the local part `*`.
2. Use the [receiving webhook](/docs/dashboard/receiving/create-receiving-webhook). It carries the message content, so you do not need follow-up calls to fetch it. To poll instead, see [Managing received emails](/docs/dashboard/receiving/manage-emails).
3. Test on a hosted inbox or a new subdomain first.
4. Record the current MX record, lower its TTL, and wait for the old TTL to pass.
5. Point the MX record at the PostShiba inbound host shown on the inbox. Never leave both providers' MX records at the same priority. Replace any `resend.app` address in Reply-To.

Receive on a subdomain, not on a host that already has mailboxes. See [How do I avoid MX conflicts?](/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records).

## Roll back

- **Outbound.** Point your router back at Resend for new messages only. Do not resend anything that already has a PostShiba `message_id`, because it was accepted and may still be delivered. Keep the PostShiba webhook running so late events still arrive.
- **Inbound.** Restore the MX record you recorded. Keep both inbound handlers running until the old TTL has passed, because some senders cache MX records.

Keep Resend keys, webhooks, and DNS records until your rollback window closes.

## Finish the cutover

After you have run at 100% for your whole rollback window with healthy checks:

1. Revoke your Resend API keys.
2. Remove Resend webhooks.
3. Delete Resend's DNS records. Keep the PostShiba DKIM, return-path, and MX records.

## Final checklist

- [ ] The cluster is `sending_ready` and production approval is complete.
- [ ] Your API key, verified domains, and any tenants are in place.
- [ ] Suppressions are imported.
- [ ] Callers that retry use `POST /sends` with an `Idempotency-Key`.
- [ ] Tags, attachments, and templates have replacements.
- [ ] Both delivery and receiving webhooks verify PostShiba signatures over the raw body.
- [ ] SMTP callers use the [PostShiba SMTP settings](/docs/send-with-smtp).
- [ ] Your router sends each message through exactly one provider.
- [ ] Resend stays ready until the rollback window closes.

## Next steps

- [Sending](/docs/api-reference/sending)
- [Attachments](/docs/dashboard/emails/attachments)
- [Managing webhooks](/docs/webhooks/introduction)
- [Receiving emails](/docs/dashboard/receiving/introduction)
