# Switching from SparkPost

> Move each SparkPost transmission to one PostShiba request per message, then validate delivery and inbound webhooks before cutover.

Move from SparkPost to PostShiba one slice of traffic at a time, with SparkPost ready as a fallback until you are sure. The biggest change is shape. A SparkPost transmission can hold many recipients, stored templates, and a schedule. A PostShiba send is one finished message, so recipient lists, scheduling, and most template work move into your app.

## Before you start

- A PostShiba team with a payment method. Request [production approval](/docs/knowledge-base/does-capsule-require-production-approval) early, because you can only send to your own team until it is approved.
- Access to DNS for each sending and receiving domain.
- An HTTPS endpoint that can receive webhooks.

## Take an inventory

Write these down before you change anything.

- Every caller of the Transmissions API and every SMTP client, with its retries and peak send rate.
- Stored recipient lists, substitution data, stored templates, and scheduled sends.
- Subaccounts, with their domains, credentials, suppressions, and `ip_pool` choices.
- The metadata you attach, and any of it that is nested, secret, or long.
- Event webhook and relay webhook handlers, the keys you deduplicate on, inbound domains, reply addresses, and MX TTLs.

## How SparkPost concepts map to PostShiba

| SparkPost | PostShiba |
| --- | --- |
| Account and API key | Team and API key |
| Subaccount | [Tenant](/docs/dashboard/tenants/introduction). Keep a map of subaccount ids to tenant slugs. |
| Sending domain | Verified sending domain under a tenant, with its own DKIM and return-path records |
| Transmission with many recipients | One `POST /api/v1/emails` request per finished message |
| Transmission and recipient metadata | `unique_args` with plain values. Keep the full record in your app. |
| Stored recipient list | Your own recipient list, expanded into send jobs |
| Stored template and substitution data | [Hosted Liquid templates](/docs/dashboard/templates/introduction), or HTML you render yourself |
| `options.start_time` | Your own scheduler |
| `options.ip_pool` | Clusters on shared IPs. You cannot choose an IP pool per message. |
| SMTP with `AUTH LOGIN` | SMTP credential for one tenant, with `AUTH PLAIN` |
| Event webhook with `msys` objects | [Delivery webhook](/docs/webhooks/introduction) with a SendGrid-style event array |
| Inbound domain and relay webhook | [Inbox](/docs/dashboard/receiving/introduction) and receiving webhook |

If a stream must go out on its own dedicated IP pool, keep it on SparkPost. PostShiba clusters are created on shared IPs.

## Set up PostShiba

1. Create a [cluster](/docs/dashboard/clusters/introduction). Choose transactional or bulk to match the mail you are moving, and size the plan for your busiest hour at full volume.
2. Create an [API key](/docs/create-an-api-key) and store it on your server.
3. For each subaccount, create a [tenant](/docs/dashboard/tenants/introduction) and save its id and slug. With one account, use the default tenant. See [Setting up PostShiba for multi-tenant apps](/docs/knowledge-base/setting-up-capsule-for-multi-tenants).
4. [Add each sending domain](/docs/add-a-domain) under the right tenant.
5. Issue an SMTP credential on the cluster for each extra tenant. The default tenant gets one when you create the cluster. REST sends need a live credential for the tenant too.
6. Wait until the cluster is `sending_ready` and approval is complete before sending real traffic.

## Publish DNS records

PostShiba uses its own DKIM selector and return-path host, so its records sit next to SparkPost's.

1. Open the domain in PostShiba and copy the records it shows.
2. Publish them at your DNS provider.

   | Record | Host | Type |
   | --- | --- | --- |
   | DKIM | `ps1._domainkey.mail.example.com` | CNAME |
   | Return-path | `rp.mail.example.com` | CNAME |

3. Click **Check DNS** and wait for the domain to verify.
4. Leave SparkPost's DKIM, bounce domain, and tracking records in place. You need them if you roll back.

If SparkPost already uses `ps1._domainkey` or `rp.` on that domain, the records collide. Send from a new subdomain on PostShiba instead. If a record will not verify, see [What if my domain is not verifying?](/docs/knowledge-base/what-if-my-domain-is-not-verifying).

## Bring your suppressions

Import your SparkPost suppression list before the first real send. Every address you miss is a bounce or complaint on your new cluster.

1. Export the suppression list from SparkPost, or pull it from its suppression list API. Export each subaccount's list separately.
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

Turn each transmission into jobs your app controls.

1. Expand recipient lists into one job per message.
2. Give each job your own id, such as `message_job_id`, before calling either provider. A SparkPost transmission id arrives after submission and can cover many recipients, so it cannot identify one message across providers.
3. Render the content, or send with a [PostShiba template](/docs/dashboard/templates/send-with-a-template).
4. Release scheduled jobs from your own scheduler when they are due.
5. Send one request per job.

```bash send-receipt.sh
curl --fail-with-body -sS -X POST \
  "https://app.postshiba.com/api/v1/emails" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "receipts@mail.example.com",
    "to": ["you@example.com"],
    "subject": "Receipt 1042",
    "text": "Thanks for order 1042.",
    "html": "<p>Thanks for order 1042.</p>",
    "tenant": "merchant-42",
    "unique_args": {"message_job_id": "job_1042", "campaign_id": "receipts"}
  }'
```

A `201` response has `queued: true` and a `message_id`. Store it on the job, so you never resend a message PostShiba already accepted. `message_job_id` comes back on every delivery event.

A few more changes:

- **Metadata.** Put only short, plain, non-secret values in `unique_args`, up to 32 keys. Keep the rest in your app under `message_job_id`. See [Unique args](/docs/dashboard/emails/unique-args).
- **Retries.** If your retries need to be safe, send on the cluster's `POST /sends` with an `Idempotency-Key` header, such as the job id. See [Sending](/docs/api-reference/sending).
- **Volume.** The REST send API allows 300 requests a minute per API key. For more than that, use SMTP or HTTP inject.
- **Tenants.** An unknown `tenant` is rejected. See [Errors](/docs/api-reference/errors).

**SMTP.** Replace the `SMTP_Injection` username and API key password with your PostShiba SMTP credential, on port 587 with STARTTLS and `AUTH PLAIN`. `AUTH LOGIN` does not work. Put tracking fields in the `X-Capsule-Unique-Args` header as a JSON object. See [Send emails with SMTP](/docs/send-with-smtp).

## Replace delivery webhooks

1. Create a [delivery webhook](/docs/webhooks/introduction) and store its secret.
2. Stop reading `msys.message_event`. Parse a JSON array of SendGrid-style event objects instead.
3. Verify the raw body before you parse it. See [Verify webhook requests](/docs/webhooks/verify-webhooks-requests).
4. Deduplicate on `sg_event_id`, and return a `2xx` status once you have stored the event.
5. Remove anything that waits for opens or clicks.

| SparkPost event | PostShiba event |
| --- | --- |
| `injection` | `processed` |
| `delivery` | `delivered` |
| `delay` | `deferred` |
| `bounce`, `out_of_band` | `bounce` |
| `policy_rejection` | `dropped` |
| `spam_complaint` | `spamreport` |
| `list_unsubscribe`, `link_unsubscribe` | `unsubscribe` |
| `generation_failure`, `generation_rejection` | No equivalent. Handle rendering errors in your app. |
| `open`, `initial_open`, `click` | Not sent |

The full field list is on [Event types](/docs/webhooks/event-types).

## Run both providers in parallel

Route each new message to exactly one provider. Pick a stable slice, such as a set of subaccounts or one message type, and record which provider sent each job. Retries and rollback then stay on the same provider. Never send the same message through both.

| Stage | Days | Share on PostShiba | Move on when |
| --- | --- | --- | --- |
| 1 | 1 to 3 | Test sends only | Content, DKIM, return-path, and webhooks check out |
| 2 | 4 to 10 | About 10% | Bounce, deferral, and complaint rates look like SparkPost's |
| 3 | 11 to 17 | About 25% | The same checks still hold |
| 4 | 18 to 24 | About 50% | The same checks still hold |
| 5 | 25 to 30 | 100% | Stay here through your rollback window |

Adjust the schedule for your volume and risk. PostShiba clusters use shared IPs, so this ramp tests your integration. It is not IP warming. While approval is pending, stage 1 can only send to your own team.

## Move inbound mail

Move receiving separately, after outbound is stable. MX records cannot split mail by percentage.

1. Create an [inbox](/docs/dashboard/receiving/introduction).
2. Pick the webhook format. The default posts one JSON object per message. Choose `sendgrid_parse` if you want the raw message in an `email` field. See [Receiving webhooks](/docs/dashboard/receiving/create-receiving-webhook).
3. Test on a hosted inbox or a new subdomain first, including signatures and attachments.
4. Lower the TTL on the current MX record, and wait for the old TTL to pass.
5. Point the MX record at the PostShiba inbound host shown on the inbox, and update Reply-To addresses if they change.

Receive on a subdomain, not on a host that already has mailboxes. See [How do I avoid MX conflicts?](/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records).

## Roll back

- **Outbound.** Stop new PostShiba submissions and move only jobs that were never sent back to SparkPost. Never resend a job that already has a PostShiba `message_id`, because it was accepted and may still be delivered. Keep the PostShiba webhook running so late events still arrive.
- **Inbound.** Restore SparkPost's MX record and the old Reply-To addresses. Keep both inbound handlers running until the old TTL has passed, because some senders cache MX records.

Keep SparkPost keys, webhooks, relay webhooks, and DNS records until your rollback window closes.

## Finish the cutover

After you have run at 100% for your whole rollback window with healthy checks:

1. Revoke your SparkPost API keys.
2. Remove SparkPost event and relay webhooks.
3. Delete SparkPost's DNS records. Keep the PostShiba DKIM, return-path, and MX records.

## Final checklist

- [ ] The cluster is `sending_ready` and production approval is complete.
- [ ] Every subaccount maps to a tenant with a verified domain and a live credential.
- [ ] Suppressions are imported into the right tenants.
- [ ] Recipient expansion, rendering, scheduling, and retries run in your app.
- [ ] `unique_args` hold only short, non-secret values.
- [ ] Delivery events pass verification and are deduplicated on `sg_event_id`.
- [ ] The new inbox receives mail and its webhook verifies.
- [ ] Each job stays on one provider through retries and rollback.
- [ ] SparkPost stays ready until the rollback window closes.

## Next steps

- [Send emails with HTTP](/docs/send-with-http)
- [Send emails with SMTP](/docs/send-with-smtp)
- [Managing webhooks](/docs/webhooks/introduction)
- [Using templates](/docs/dashboard/templates/introduction)
