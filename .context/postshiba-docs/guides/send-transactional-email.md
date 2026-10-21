# Send basic transactional emails with PostShiba

> Verify a domain and send your first production message.

This guide creates a shared cluster, verifies `mail.example.com`, and queues one receipt. You will see `sending_ready`, `sending_allowed`, and `queued` along the way.

## Before you start

- A Full access key from [API keys](/docs/create-an-api-key).
- A domain whose DNS you can edit. A subdomain keeps root MX free. See [Subdomain or root domain?](/docs/knowledge-base/is-it-better-to-send-emails-from-a-subdomain).
- A payment method on the team. Cluster create returns `403` `{error: payment_required}` when billing is on and there is no card.

## 1. Set the shell

```bash setup.sh
export CAPSULE_URL="https://app.postshiba.com"
export CAPSULE_API_KEY="YOUR_API_KEY"
export TEAM_ID="KjkAJW"
```

Run those exports in the current shell. If you saved the block as `setup.sh`, load it with `source setup.sh` so later commands inherit the variables.

## 2. Create a cluster

A cluster is a named sending environment. Customer clusters are shared-IP. `size` is the node size. `plan` is the monthly capacity. Omit `plan` and create sets `nano`.

```bash create-cluster.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/clusters" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "cluster": {
      "name": "production",
      "size": "small",
      "region": "manual",
      "plan": "nano",
      "classification": "transactional"
    }
  }'
```

A pending team can create one cluster. A second cluster returns `403` `{error: kyc_required}` until the team is approved. Create also issues a default SMTP credential. The password is not in this response.

```json cluster-response.json
{
  "id": "NmQpXr",
  "name": "production",
  "region": "manual",
  "size": "small",
  "plan": "nano",
  "ip_assignment": "shared",
  "desired_status": "active",
  "status": "active",
  "sending_ready": true
}
```

Save the cluster id. The full object also includes `emails_per_hour`, `emails_per_day`, `smtp_endpoint`, `http_endpoint`, `classification`, and `sending_ips`. If `sending_ready` is still `false`, GET the cluster again.

```bash get-cluster.sh
curl -sS \
  --url "$CAPSULE_URL/api/v1/clusters/NmQpXr" \
  --header "Authorization: Bearer $CAPSULE_API_KEY"
```

If the response is `403` `kyc_required`, the team is still pending. While the team is pending, you send only to member emails, live inbox addresses, and inbox forward-to addresses, and anything else returns `403` `kyc_required`. See [Does PostShiba require production approval?](/docs/knowledge-base/does-capsule-require-production-approval). If a later send returns `403` `cluster_not_ready`, the cluster is not ready yet. See [Errors](/docs/api-reference/errors).

## 3. Add a sending domain

```bash create-domain.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/sending_domains" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "sending_domain": {
      "name": "mail.example.com"
    }
  }'
```

Create queues a DNS check. `sending_allowed` stays `false` until DKIM is verified and return-path is verified (or you imported a key with `dkim_manual`).

```json domain-response.json
{
  "id": "HsVtYk",
  "name": "mail.example.com",
  "tenant_id": "WbLcFd",
  "tenant": "default",
  "dkim_status": "pending",
  "return_path_status": "pending",
  "dmarc_status": "pending",
  "sending_allowed": false,
  "dkim_selector": "ps1",
  "dkim_manual": false,
  "dkim_txt": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA",
  "dkim_cname_host": "ps1._domainkey.mail.example.com",
  "dkim_cname_target": "HsVtYk.customers.postshiba.com",
  "dmarc_host": "_dmarc.mail.example.com",
  "dmarc_record": "v=DMARC1; p=none;",
  "return_path_host": "rp.mail.example.com",
  "return_path_target": "rp.postshiba.com",
  "last_verification_error": null,
  "suspended": false,
  "primary": false
}
```

Publish the DKIM CNAME and return-path CNAME exactly as returned. Then ask PostShiba to check DNS.

```bash verify-domain.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/sending_domains/HsVtYk/verify" \
  --header "Authorization: Bearer $CAPSULE_API_KEY"
```

Read the domain again. Do not sleep for a fixed time.

```bash get-domain.sh
curl -sS \
  --url "$CAPSULE_URL/api/v1/sending_domains/HsVtYk" \
  --header "Authorization: Bearer $CAPSULE_API_KEY"
```

Wait until `sending_allowed` is `true`. See [Add and verify a domain](/docs/add-a-domain) for the records and [Verified domains](/docs/dashboard/domains/introduction) for the statuses. If `sending_allowed` stays `false`, check `last_verification_error`.

## 4. Send a receipt

Install the Node client with `npm install github:postshiba/postshiba-node`. `emails.send` maps to `POST /api/v1/emails`. `POST /api/v1/emails` does not accept `Idempotency-Key`. We call `POST /api/v1/teams/:team_id/clusters/:cluster_id/sends` with `Idempotency-Key` when we want the first `201` replayed for 24 hours. A reused key with a different body returns 409 `idempotency_conflict`.

`from` is optional. A blank From is replaced with `hello@` the first sending-ready domain.

```javascript send.js
import { PostShiba } from "postshiba"

const postshiba = new PostShiba("YOUR_API_KEY", { teamId: "KjkAJW" })

await postshiba.emails.send({
  from: "Acme Receipts <receipts@mail.example.com>",
  to: ["you@example.com"],
  reply_to: "support@example.com",
  subject: "We received your order",
  text: "Thanks for your order. We will send tracking details soon.",
  html: "<p>Thanks for your order. We will send tracking details soon.</p>",
  unique_args: {
    order_id: "ord_123",
    kind: "receipt",
  },
})
```

A successful request returns `201` with `"queued": true`.

```json send-response.json
{
  "queued": true,
  "message_id": "abc@postshiba.com",
  "from": "Acme Receipts <receipts@mail.example.com>",
  "to": ["you@example.com"],
  "subject": "We received your order",
  "unique_args": {
    "order_id": "ord_123",
    "kind": "receipt"
  }
}
```

If inject queued nobody, the response is `502` `{error: inject_failed}`. Other send errors are on [Errors](/docs/api-reference/errors) and [Sending](/docs/api-reference/sending).

REST does not need the SMTP password in application code. Create another credential only when you send over [SMTP](/docs/send-with-smtp). See [SMTP credentials](/docs/api-reference/smtp-credentials).

## 5. Watch delivery

Create one webhook endpoint for delivery events. Omit `cluster_id` and `tenant_id` to receive the whole team.

```bash create-webhook.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/webhook_endpoints" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "webhook_endpoint": {
      "url": "https://app.example.com/webhooks/capsule",
      "event_types": [
        "processed",
        "delivered",
        "deferred",
        "bounce",
        "dropped",
        "spamreport",
        "unsubscribe"
      ]
    }
  }'
```

Store `secret` now. Lists omit it.

```json webhook-response.json
{
  "id": "CdFgHj",
  "url": "https://app.example.com/webhooks/capsule",
  "enabled": true,
  "cluster_id": null,
  "tenant_id": null,
  "event_types": [
    "processed",
    "delivered",
    "deferred",
    "bounce",
    "dropped",
    "spamreport",
    "unsubscribe"
  ],
  "secret": "hex-secret"
}
```

The POST is a SendGrid Event Webhook array. Unique args you set at send time are flattened onto each event and also appear as `unique_args`. Verify `X-Capsule-Signature` before you trust a body. See [Verify webhook requests](/docs/webhooks/verify-webhooks-requests) and [Event types](/docs/webhooks/event-types).

You now have a shared cluster, a verified `mail.example.com`, a queued receipt, and a signed delivery webhook.

## Next steps

- [SDKs](/docs/sdks)
- [Send emails with SMTP](/docs/send-with-smtp)
- [Attachments](/docs/dashboard/emails/attachments)
- [Unique args](/docs/dashboard/emails/unique-args)
- [Sending](/docs/api-reference/sending)
- [Errors](/docs/api-reference/errors)
