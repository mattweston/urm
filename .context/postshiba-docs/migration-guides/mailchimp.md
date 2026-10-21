# Switching from Mailchimp Transactional

> Keep your transactional application flow while you replace Mandrill auth, templates, webhooks, and inbound routes with PostShiba.

Move from Mailchimp Transactional, formerly Mandrill, to PostShiba one slice of traffic at a time, with Mandrill ready as a fallback until you are sure. Your app's flow stays the same. The API key, request shape, templates, webhooks, and inbound routes change. This guide covers the Transactional API and SMTP service, not Mailchimp Marketing audiences or campaigns.

## Before you start

- A PostShiba team with a payment method. Request [production approval](/docs/knowledge-base/does-capsule-require-production-approval) early, because you can only send to your own team until it is approved.
- Access to DNS for each sending and receiving domain.
- An HTTPS endpoint that can receive webhooks.

## Take an inventory

Write these down before you change anything.

- Every caller of `/messages/send`, `/messages/send-template`, and SMTP, with where its key is stored and any `X-MC-*` headers it sets.
- Subaccounts, with their domains and traffic.
- Stored templates, their merge language, and the merge vars they use.
- Metadata, `recipient_metadata`, and tags, and the code that reads them later.
- Webhook URLs, the events they subscribe to, their keys, and your `mandrill_events` parser.
- Inbound domains, routes, MX records, and TTLs.

Keep a recent sample of messages and events so you can compare results during the move.

## How Mandrill concepts map to PostShiba

| Mailchimp Transactional | PostShiba |
| --- | --- |
| Transactional API key | Team and API key |
| `POST /messages/send` with `key` in the body | `POST /api/v1/emails` with a Bearer token |
| Subaccount or `X-MC-Subaccount` | [Tenant](/docs/dashboard/tenants/introduction) with its own SMTP credential |
| Metadata, `recipient_metadata`, and tags | `unique_args` on each message |
| `X-MC-Metadata` and `X-MC-Tags` | The `X-Capsule-Unique-Args` header |
| Stored templates and merge vars | [Hosted Liquid templates](/docs/dashboard/templates/introduction), or HTML you render yourself |
| `smtp.mandrillapp.com` with an API key as the password | Your cluster's SMTP host on port 587, with an issued `smtp_` username |
| Rejection denylist | [Suppressions](/docs/dashboard/emails/email-suppressions), per tenant |
| `mandrill_events` and `X-Mandrill-Signature` | JSON event array with `X-Capsule-Timestamp` and `X-Capsule-Signature` |
| Inbound domain and route | Domain-bound [inbox](/docs/dashboard/receiving/introduction) and receiving webhook |

## Set up PostShiba

1. Create a [cluster](/docs/dashboard/clusters/introduction). Choose transactional or bulk to match the mail you are moving, and size the plan for your busiest hour at full volume.
2. Create an [API key](/docs/create-an-api-key) and store it on your server.
3. If you use subaccounts, create a [tenant](/docs/dashboard/tenants/introduction) for each before adding its domains. Otherwise use the default tenant. See [Setting up PostShiba for multi-tenant apps](/docs/knowledge-base/setting-up-capsule-for-multi-tenants).
4. [Add each sending domain](/docs/add-a-domain) under its tenant.
5. Issue an SMTP credential on the cluster for each extra tenant. The default tenant gets one when you create the cluster. REST sends need a live credential for the tenant too.
6. Wait until the cluster is `sending_ready` and approval is complete before sending real traffic.

## Publish DNS records

PostShiba uses its own DKIM selector and return-path host, so its records sit next to Mandrill's.

1. Open the domain in PostShiba and copy the records it shows.
2. Publish them at your DNS provider.

   | Record | Host | Type |
   | --- | --- | --- |
   | DKIM | `ps1._domainkey.mail.example.com` | CNAME |
   | Return-path | `rp.mail.example.com` | CNAME |

3. Click **Check DNS** and wait for the domain to verify.
4. Leave Mandrill's DKIM, SPF, and return-path records in place. You need them if you roll back.

If Mandrill already uses `ps1._domainkey` or `rp.` on that domain, the records collide. Send from a new subdomain on PostShiba instead. If a record will not verify, see [What if my domain is not verifying?](/docs/knowledge-base/what-if-my-domain-is-not-verifying).

## Bring your suppressions

Import your Mandrill rejects and unsubscribes before the first real send. Every address you miss is a bounce or complaint on your new cluster.

1. Export the rejection denylist with `/rejects/list`, for each subaccount. Add any unsubscribe list you keep in your app.
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

While both providers run, write new unsubscribes and complaints to a store that both send paths check.

## Switch one send path

Change one caller at a time.

- Remove `key` from the body and send it as a Bearer token.
- Combine `message.from_name` and `message.from_email` into one `from` string.
- Split `message.to` by its `type` into `to`, `cc`, and `bcc`, keeping display names.
- Move `headers["Reply-To"]` into `reply_to`.
- Move metadata and tags into `unique_args`.
- Send one request per recipient when the content differs per person.

```bash send-order-confirmation.sh
curl --fail-with-body -sS -X POST \
  "https://app.postshiba.com/api/v1/emails" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Orders <orders@mail.example.com>",
    "to": ["you@example.com"],
    "subject": "Order ord_123 is confirmed",
    "text": "Thanks, Sam. We received order ord_123.",
    "html": "<p>Thanks, Sam. We received order <strong>ord_123</strong>.</p>",
    "tenant": "acme",
    "unique_args": {"order_id": "ord_123", "message_type": "order-confirmation"}
  }'
```

A `201` response has `queued: true` and a `message_id`. Store the `message_id` with the provider name, so you never resend a message PostShiba already accepted. To match delivery events to your own records, put your own id in `unique_args`. It comes back on every event.

**Templates.** PostShiba templates use [Liquid](/docs/dashboard/templates/liquid), not Mandrill merge tags. Rewrite `*|FNAME|*` as `{{ name }}`, publish the template, and send with `template.id` and `variables`. See [Send with a template](/docs/dashboard/templates/send-with-a-template). You can also keep rendering `text` and `html` in your app.

A few more changes:

- **Tags.** Turn each tag into a plain field, such as `message_type`. `unique_args` takes up to 32 keys. Never put secrets or message content in it. See [Unique args](/docs/dashboard/emails/unique-args).
- **Tenants.** Use a tenant slug or id you have confirmed. An unknown `tenant` is rejected. See [Errors](/docs/api-reference/errors).
- **Retries.** If your retries need to be safe, send on the cluster's `POST /sends` with an `Idempotency-Key` header. See [Sending](/docs/api-reference/sending).
- **Volume.** The REST send API allows 300 requests a minute per API key. For more than that, use SMTP or HTTP inject.

**SMTP.** Replace `smtp.mandrillapp.com` and the API key password with your PostShiba SMTP credential, on port 587 with STARTTLS and `AUTH PLAIN`. Replace `X-MC-Metadata` and `X-MC-Tags` with the `X-Capsule-Unique-Args` header. The credential decides the tenant, so drop `X-MC-Subaccount`. See [Send emails with SMTP](/docs/send-with-smtp).

## Replace delivery webhooks

1. Create a [delivery webhook](/docs/webhooks/introduction) and store its secret. Update your receiver before you move any traffic.
2. Parse a JSON array of events. The body is raw JSON, not a form field named `mandrill_events`.
3. Verify the raw body before you parse it. See [Verify webhook requests](/docs/webhooks/verify-webhooks-requests).
4. Deduplicate on `sg_event_id`.
5. Remove anything that waits for opens or clicks.

| Mandrill event | PostShiba event |
| --- | --- |
| `send` | `processed`. Close, but not the same. Mandrill `send` means sent. PostShiba `processed` means accepted. |
| `deferral` | `deferred` |
| `hard_bounce`, `soft_bounce` after retries end | `bounce` |
| `reject` | `dropped` |
| `spam` | `spamreport` |
| `unsub` | `unsubscribe` |
| `open`, `click` | Not sent |

The full field list is on [Event types](/docs/webhooks/event-types).

## Run both providers in parallel

Route each new message to exactly one provider. Pick a stable slice, such as a set of recipients or one message type, and record which provider sent each message. Retries and rollback then stay on the same provider. Never send the same message through both.

| Stage | Days | Share on PostShiba | Move on when |
| --- | --- | --- | --- |
| 1 | 1 to 3 | Test sends to your team and inboxes | Content, DKIM, return-path, and webhooks check out |
| 2 | 4 to 10 | About 10% | Bounce, deferral, complaint, and unsubscribe rates look like Mandrill's |
| 3 | 11 to 17 | About 25% | The same checks still hold |
| 4 | 18 to 24 | About 50% | The same checks still hold |
| 5 | 25 to 30 | 100% | Stay here through your rollback window |

Adjust the schedule for your volume and risk. PostShiba clusters use shared IPs, so this ramp tests your integration. It is not IP warming.

## Move inbound mail

Move receiving separately, after outbound is stable. MX records cannot split mail by percentage.

1. Replace each Mandrill route with a domain-bound [inbox](/docs/dashboard/receiving/introduction) for that address, or one domain-bound catch-all inbox with the local part `*`. Move any other matching into your app.
2. Pick the `json` or `sendgrid_parse` webhook format. Neither posts `mandrill_events`, so update your handler. See [Receiving webhooks](/docs/dashboard/receiving/create-receiving-webhook).
3. Test on a hosted inbox or a new subdomain first.
4. Lower the TTL on the current MX record, and wait for the old TTL to pass.
5. If Mandrill receives on the same host you want PostShiba to use, replace its MX record with the one shown on the inbox. Otherwise point your Reply-To addresses at the new PostShiba address.

Receive on a subdomain, not on a host that already has mailboxes. See [How do I avoid MX conflicts?](/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records).

## Roll back

- **Outbound.** Point your router back at Mandrill for new messages only. Do not resend anything that already has a PostShiba `message_id`, because it was accepted and may still be delivered. Keep both webhook handlers running so late events still arrive. Match any unclear sends by your ids in `unique_args`.
- **Inbound.** Restore Mandrill's MX record. Keep both inbound handlers running until the old TTL has passed, because some senders cache MX records.

Keep Mandrill keys, webhooks, inbound routes, and DNS records until your rollback window closes.

## Finish the cutover

After you have run at 100% for your whole rollback window with healthy checks:

1. Delete your Mandrill API keys.
2. Remove Mandrill webhooks and inbound routes.
3. Delete Mandrill's DNS records. Keep the PostShiba DKIM, return-path, and MX records.

## Final checklist

- [ ] The cluster is `sending_ready` and production approval is complete.
- [ ] Every tenant that sends has a verified domain and a live credential.
- [ ] Rejects and unsubscribes are imported into the right tenants.
- [ ] Templates are ported to [Liquid](/docs/dashboard/templates/liquid) or rendered in your app.
- [ ] API callers use a Bearer token, and SMTP callers use the [PostShiba SMTP settings](/docs/send-with-smtp).
- [ ] Metadata and tags arrive as plain `unique_args`.
- [ ] Delivery events verify and update the right records.
- [ ] Inbound mail and its webhook work before the MX change.
- [ ] Your router sends each message through exactly one provider.
- [ ] Mandrill stays ready until the rollback window closes.

## Next steps

- [Send emails with HTTP](/docs/send-with-http)
- [Send with a template](/docs/dashboard/templates/send-with-a-template)
- [Managing webhooks](/docs/webhooks/introduction)
- [Receiving emails](/docs/dashboard/receiving/introduction)
