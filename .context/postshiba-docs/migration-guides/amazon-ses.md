# Switching from Amazon SES

> Keep your From domains and message content. Replace SES authentication, regional endpoints, event destinations, and receipt rules without sending anything twice.

Move from Amazon SES to PostShiba one slice of traffic at a time, with SES ready as a fallback until you are sure. Your From domains, message content, and choice of HTTP or SMTP stay the same. IAM and SigV4 signing, regional endpoints, configuration sets, event destinations, and receipt rules are replaced.

## Before you start

- A PostShiba team with a payment method. Request [production approval](/docs/knowledge-base/does-capsule-require-production-approval) early. It works like the SES sandbox. Until it is approved, you can only send to your own team.
- Access to DNS for each sending domain.
- An HTTPS endpoint that can receive webhooks. If your event consumers live in AWS, you can forward them on. See [Forward webhooks to Amazon EventBridge](/docs/webhooks/eventbridge).

## Take an inventory

Write these down for each AWS Region you use, before you change anything.

- Verified identities, whether each is a domain or a single address, and whether the Region is in the SES sandbox.
- Every caller of `SendEmail`, `SendRawEmail`, SESv2 `SendEmail`, and SMTP, with its IAM principal and From domain.
- Configuration sets, message tags, and where their events go: SNS, EventBridge, Firehose, or CloudWatch.
- The account-level suppression list and any list you keep yourself.
- Receipt rule sets, their conditions and actions, and the MX records they rely on.

## How SES concepts map to PostShiba

| Amazon SES | PostShiba |
| --- | --- |
| AWS account and IAM principal | Team and API key |
| Region and regional endpoint | Cluster, sent through one PostShiba API |
| Domain identity | Verified sending domain for that exact host. Any address on it can send. |
| Email address identity | No equivalent. Verify the domain instead. |
| SMTP credentials per Region | SMTP credential for one tenant on a cluster |
| Separate IAM principals per customer | [Tenants](/docs/dashboard/tenants/introduction) |
| Message tags and `X-SES-MESSAGE-TAGS` | `unique_args`, or the `X-Capsule-Unique-Args` header |
| Configuration set event destination | [Delivery webhook](/docs/webhooks/introduction) scoped to the team, a cluster, or a tenant |
| Account-level suppression list | [Suppressions](/docs/dashboard/emails/email-suppressions), per tenant |
| Sandbox | Production approval |
| Receipt rules | [Inbox](/docs/dashboard/receiving/introduction) with a signed webhook, or received mail you fetch later |

## Set up PostShiba

1. Create a [cluster](/docs/dashboard/clusters/introduction). Choose transactional or bulk to match the mail you are moving, and size the plan for your busiest hour at full volume.
2. Create an [API key](/docs/create-an-api-key) and store it as a new secret. It replaces IAM credentials and SigV4 signing.
3. If separate IAM principals keep customers apart, create a [tenant](/docs/dashboard/tenants/introduction) for each. Otherwise use the default tenant. See [Setting up PostShiba for multi-tenant apps](/docs/knowledge-base/setting-up-capsule-for-multi-tenants).
4. [Add each sending domain](/docs/add-a-domain) under its tenant. Add each exact host you send from. Unlike an SES domain identity, verifying `example.com` does not cover `mail.example.com`.
5. Issue an SMTP credential on the cluster for each extra tenant. The default tenant gets one when you create the cluster. REST sends need a live credential for the tenant too.
6. Wait until the cluster is `sending_ready` and approval is complete before sending real traffic.

## Publish DNS records

PostShiba uses its own DKIM selector and return-path host, so its records sit next to the SES Easy DKIM records and any custom MAIL FROM domain.

1. Open the domain in PostShiba and copy the records it shows.
2. Publish them at your DNS provider, or in Route 53.

   | Record | Host | Type |
   | --- | --- | --- |
   | DKIM | `ps1._domainkey.mail.example.com` | CNAME |
   | Return-path | `rp.mail.example.com` | CNAME |

3. Click **Check DNS** and wait for the domain to verify.
4. Leave the SES DKIM CNAMEs, custom MAIL FROM records, and SPF in place. You need them if you roll back.

If your SES custom MAIL FROM domain is already `rp.` on that domain, the records collide. Send from a new subdomain on PostShiba instead. If a record will not verify, see [What if my domain is not verifying?](/docs/knowledge-base/what-if-my-domain-is-not-verifying).

## Bring your suppressions

Import your SES suppressions before the first real send. Every address you miss is a bounce or complaint on your new cluster.

1. Export the account-level suppression list for each Region with `ListSuppressedDestinations`, or from the SES console. Add any list you keep in your own database.
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

Replace the SES `SendEmail` call with a JSON request and a Bearer token. Turn message tags such as `order_id=ord_123, source=checkout` into `unique_args`.

```bash send-test.sh
curl --fail-with-body -sS -X POST \
  "https://app.postshiba.com/api/v1/emails" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "receipts@mail.example.com",
    "to": ["you@example.com"],
    "subject": "PostShiba cutover test",
    "text": "Controlled migration test",
    "unique_args": {"order_id": "ord_123", "source": "checkout"}
  }'
```

A `201` response has `queued: true` and a `message_id`. Store the `message_id` with the provider name, so you never resend a message PostShiba already accepted. To match delivery events to your own records, put your own id in `unique_args`. It comes back on every event.

A few more changes:

- **Raw MIME.** For `SendRawEmail` or SESv2 raw content, keep your MIME builder and send over SMTP or HTTP inject. See [Choose a send path](/docs/sending-emails).
- **Configuration sets.** Remove `X-SES-CONFIGURATION-SET` and configuration set parameters. Use webhook scopes to route events instead.
- **Retries.** If your retries need to be safe, send on the cluster's `POST /sends` with an `Idempotency-Key` header. See [Sending](/docs/api-reference/sending).
- **Volume.** The REST send API allows 300 requests a minute per API key. For more than that, use SMTP or HTTP inject.
- **Metadata limits.** `unique_args` takes up to 32 keys of plain values. See [Unique args](/docs/dashboard/emails/unique-args).

**SMTP.** Replace the regional SES SMTP credential with your PostShiba SMTP credential, on port 587 with STARTTLS and `AUTH PLAIN`. Put tracking fields in the `X-Capsule-Unique-Args` header as a JSON object. See [Send emails with SMTP](/docs/send-with-smtp).

## Replace delivery webhooks

1. Create a [delivery webhook](/docs/webhooks/introduction) scoped to the team, a cluster, or a tenant, and store its secret.
2. Replace each SES event destination with it. If you still need events in AWS, forward them with [Amazon EventBridge](/docs/webhooks/eventbridge).
3. Verify the raw body before you parse it. See [Verify webhook requests](/docs/webhooks/verify-webhooks-requests).
4. Remove anything that waits for `Open` or `Click`.
5. Send a test message and confirm your handler receives `order_id` and `source`.

| SES event | PostShiba event |
| --- | --- |
| `Send` | `processed` |
| `Delivery` | `delivered` |
| `DeliveryDelay` | `deferred` |
| `Bounce` | `bounce` |
| `Complaint` | `spamreport` |
| `Reject` | The send request fails instead. See [Errors](/docs/api-reference/errors). |
| `Rendering Failure` | No equivalent. Test your templates before you send. |
| `Open`, `Click` | Not sent |
| No SES equivalent | `dropped` and `unsubscribe`. Add handlers for both. |

The full field list is on [Event types](/docs/webhooks/event-types).

## Run both providers in parallel

Route each new message to exactly one provider. Pick a stable slice, such as a set of tenants or one message type, and record which provider sent each message. Retries and rollback then stay on the same provider. Never send the same message through both.

| Stage | Days | Share on PostShiba | Move on when |
| --- | --- | --- | --- |
| 1 | 1 to 3 | Test sends only | Content, DKIM, return-path, and webhooks check out |
| 2 | 4 to 10 | About 10% | Bounce, deferral, and complaint rates look like SES |
| 3 | 11 to 17 | About 25% | The same checks still hold |
| 4 | 18 to 24 | About 50% | The same checks still hold |
| 5 | 25 to 30 | 100% | Stay here through your rollback window |

Adjust the schedule for your volume and risk. PostShiba clusters use shared IPs, so this ramp tests your integration. It is not IP warming. While approval is pending, stage 1 can only send to your own team.

## Move inbound mail

Skip this section if you have no active SES receipt rule set. Move receiving separately, after outbound is stable. MX records cannot split mail by percentage.

1. Create a hosted or domain-bound [inbox](/docs/dashboard/receiving/introduction).
2. Replace the S3, SNS, and Lambda actions in your receipt rules with a signed [receiving webhook](/docs/dashboard/receiving/create-receiving-webhook), or [fetch stored messages](/docs/dashboard/receiving/manage-emails) instead.
3. Test on a hosted inbox or a new subdomain first.
4. Lower the TTL on the current MX record, and wait for the old TTL to pass.
5. Point the MX record at the PostShiba inbound host shown on the inbox. Or keep SES receiving and point your Reply-To addresses at the new PostShiba address.

Receive on a subdomain, not on a host that already has mailboxes. See [How do I avoid MX conflicts?](/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records).

## Roll back

- **Outbound.** Point your router back at SES for new messages only. Do not resend anything that already has a PostShiba `message_id`, because it was accepted and may still be delivered. Keep the PostShiba webhook running so late events still arrive.
- **Inbound.** Restore the SES MX record. Keep both inbound handlers running until the old TTL has passed, because some senders cache MX records.

Keep SES identities, IAM credentials, event destinations, receipt rules, and DNS records until your rollback window closes.

## Finish the cutover

After you have run at 100% for your whole rollback window with healthy checks:

1. Remove the IAM permissions and SMTP credentials your apps used for SES.
2. Remove configuration set event destinations and receipt rules you no longer need.
3. Delete the SES DNS records. Keep the PostShiba DKIM, return-path, and MX records.

## Final checklist

- [ ] The inventory covers every Region, identity, caller, configuration set, and receipt rule.
- [ ] The cluster is `sending_ready` and production approval is complete.
- [ ] Every exact From host is a verified domain, with a live credential for its tenant.
- [ ] The SES suppression list is imported into the right tenants.
- [ ] A real send produced delivery events with the right `unique_args`.
- [ ] Nothing waits for opens or clicks.
- [ ] Inbound mail reached the new handler before the MX change.
- [ ] Your router sends each message through exactly one provider.
- [ ] SES stays ready until the rollback window closes.

## Next steps

- [Send emails with HTTP](/docs/send-with-http)
- [Send emails with SMTP](/docs/send-with-smtp)
- [Forward webhooks to Amazon EventBridge](/docs/webhooks/eventbridge)
- [Receiving emails](/docs/dashboard/receiving/introduction)
