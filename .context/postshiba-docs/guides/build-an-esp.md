# Build an ESP on PostShiba

> Give each customer their own domains, credentials, sending data, and controls.

This guide provisions one customer with a tenant, a domain, a credential, a queued send, and a signed webhook. You use one team, one shared cluster, and one tenant per customer. See [Setting up PostShiba for multi-tenant apps](/docs/knowledge-base/setting-up-capsule-for-multi-tenants).

## Before you start

- A Full access key from [API keys](/docs/create-an-api-key). Copy the team id from the same page.
- A payment method on the team. Cluster create returns `403` `{error: payment_required}` when billing is on and there is no card.
- Production approval if you will send to addresses that are not team members, live inboxes, or inbox forward-to addresses. See [Does PostShiba require production approval?](/docs/knowledge-base/does-capsule-require-production-approval).

## 1. Create the cluster

```bash create-cluster.sh
export CAPSULE_URL="https://app.postshiba.com"
export CAPSULE_API_KEY="YOUR_API_KEY"
export TEAM_ID="KjkAJW"

curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/clusters" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "cluster": {
      "name": "customer-mail",
      "size": "small",
      "region": "manual",
      "plan": "nano",
      "classification": "transactional"
    }
  }'
```

A pending team can create one cluster. A second cluster returns `403` `{error: kyc_required}` until the team is approved.

```json cluster-response.json
{
  "id": "NmQpXr",
  "name": "customer-mail",
  "region": "manual",
  "size": "small",
  "plan": "nano",
  "ip_assignment": "shared",
  "desired_status": "active",
  "status": "active",
  "sending_ready": true
}
```

Save the cluster id. If `sending_ready` is still `false`, GET `/api/v1/clusters/NmQpXr` again.

## 2. Create the delivery webhook

Omit `cluster_id` and `tenant_id` so the endpoint receives every tenant on the team.

```bash create-webhook.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/webhook_endpoints" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "webhook_endpoint": {
      "url": "https://esp.example.com/webhooks/capsule",
      "event_types": [
        "processed",
        "delivered",
        "deferred",
        "bounce",
        "dropped",
        "spamreport"
      ]
    }
  }'
```

Store `secret` now. Lists omit it.

```json webhook-response.json
{
  "id": "CdFgHj",
  "url": "https://esp.example.com/webhooks/capsule",
  "enabled": true,
  "cluster_id": null,
  "tenant_id": null,
  "event_types": [
    "processed",
    "delivered",
    "deferred",
    "bounce",
    "dropped",
    "spamreport"
  ],
  "secret": "hex-secret"
}
```

See [Managing webhooks](/docs/webhooks/introduction) for the event array and [Verify webhook requests](/docs/webhooks/verify-webhooks-requests) for the signature.

## 3. Provision a customer

Provisioning is three API calls. Create a tenant. Create a sending domain under that tenant. Create an SMTP credential under that tenant.

```javascript postshiba-client.js
export class PostShibaClient {
  constructor({ baseUrl, apiKey, teamId, clusterId }) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.teamId = teamId
    this.clusterId = clusterId
  }

  async request(path, { method = "GET", body } = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      throw new Error(`PostShiba ${method} ${path}: ${response.status} ${await response.text()}`)
    }

    if (response.status === 204) return null
    return response.json()
  }

  async provisionCustomer({ name, slug, domain }) {
    const tenant = await this.request(
      `/api/v1/teams/${this.teamId}/tenants`,
      {
        method: "POST",
        body: { tenant: { name, slug } },
      },
    )

    const sendingDomain = await this.request(
      `/api/v1/teams/${this.teamId}/sending_domains`,
      {
        method: "POST",
        body: {
          sending_domain: {
            name: domain,
            tenant_id: tenant.id,
          },
        },
      },
    )

    const smtpCredential = await this.request(
      `/api/v1/teams/${this.teamId}/clusters/${this.clusterId}/smtp_credentials`,
      {
        method: "POST",
        body: {
          smtp_credential: {
            tenant_id: tenant.id,
          },
        },
      },
    )

    return { tenant, sendingDomain, smtpCredential }
  }
}
```

Call it from the onboarding job.

```javascript provision-customer.js
import { PostShibaClient } from "./postshiba-client.js"

const capsule = new PostShibaClient({
  baseUrl: "https://app.postshiba.com",
  apiKey: "YOUR_API_KEY",
  teamId: "KjkAJW",
  clusterId: "NmQpXr",
})

const setup = await capsule.provisionCustomer({
  name: "Acme Florist",
  slug: "acme-florist",
  domain: "mail.acme.example",
})

console.log({
  capsuleTenantId: setup.tenant.id,
  capsuleTenantSlug: setup.tenant.slug,
  capsuleDomainId: setup.sendingDomain.id,
  dkimHost: setup.sendingDomain.dkim_cname_host,
  dkimType: setup.sendingDomain.dkim_manual ? "TXT" : "CNAME",
  dkimValue: setup.sendingDomain.dkim_manual ? setup.sendingDomain.dkim_txt : setup.sendingDomain.dkim_cname_target,
  returnPathHost: setup.sendingDomain.return_path_host,
  returnPathValue: setup.sendingDomain.return_path_target,
  optionalDmarc: setup.sendingDomain.dmarc_record,
  smtpUsername: setup.smtpCredential.username,
})
```

The tenant create body looks like this.

```json tenant-response.json
{
  "id": "WbLcFd",
  "name": "Acme Florist",
  "slug": "acme-florist",
  "suspended": false
}
```

If `provisionCustomer` throws, read the status and body on that `Error`. A `403` `kyc_required` means the team is still pending.

## 4. Verify the domain

Show the DNS values from the domain response in your dashboard. Copy host and value. Do not transform them. See [Add and verify a domain](/docs/add-a-domain) and [Verified domains](/docs/dashboard/domains/introduction).

When the customer says the records are ready, ask PostShiba to check them.

```bash verify-domain.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/sending_domains/HsVtYk/verify" \
  --header "Authorization: Bearer $CAPSULE_API_KEY"
```

Read the domain until `sending_allowed` is `true`. That requires verified DKIM and a verified return-path, unless the domain uses `dkim_manual`.

```bash get-domain.sh
curl -sS \
  --url "$CAPSULE_URL/api/v1/sending_domains/HsVtYk" \
  --header "Authorization: Bearer $CAPSULE_API_KEY"
```

```json domain-ready.json
{
  "id": "HsVtYk",
  "name": "mail.acme.example",
  "tenant_id": "WbLcFd",
  "tenant": "acme-florist",
  "dkim_status": "verified",
  "return_path_status": "verified",
  "sending_allowed": true
}
```

If `sending_allowed` stays `false`, check `last_verification_error`.

## 5. Send for the customer

Look up the tenant on your server. Call PostShiba with the platform token. Pass the tenant slug on the send. `POST /api/v1/emails` does not accept `Idempotency-Key`. We call `POST /api/v1/teams/:team_id/clusters/:cluster_id/sends` with `Idempotency-Key` when we want the first `201` replayed for 24 hours. A reused key with a different body returns 409 `idempotency_conflict`.

```javascript send-for-customer.js
import { PostShiba } from "postshiba"

export async function sendForCustomer({
  apiKey,
  teamId,
  customer,
  message,
}) {
  if (!customer.capsuleTenantSlug) {
    throw new Error("Customer has no PostShiba tenant mapping")
  }

  const postshiba = new PostShiba(apiKey, { teamId })
  const body = await postshiba.emails.send({
    from: message.from,
    to: message.to,
    cc: message.cc || [],
    bcc: message.bcc || [],
    reply_to: message.replyTo,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: message.attachments || [],
    headers: message.headers || {},
    unique_args: {
      customer_id: customer.id,
      transmission_id: message.id,
      category: message.category,
    },
    tenant: customer.capsuleTenantSlug,
  })

  if (body.queued !== true) {
    throw new Error(`PostShiba send failed: ${JSON.stringify(body)}`)
  }

  return body
}
```

```json send-response.json
{
  "queued": true,
  "message_id": "abc@postshiba.com",
  "from": "Acme <hello@mail.acme.example>",
  "to": ["you@example.com"],
  "subject": "Your order",
  "unique_args": {
    "customer_id": "cust_1",
    "transmission_id": "tx_1",
    "category": "receipt"
  }
}
```

If the function throws `Customer has no PostShiba tenant mapping`, the mapping is missing. If inject queued nobody, the response is `502` `{error: inject_failed}`. Other send errors are on [Errors](/docs/api-reference/errors) and [Sending](/docs/api-reference/sending).

## 6. Route delivery events

Verify the exact webhook body before parsing it. Each event is a SendGrid Event Webhook object. `tenant_id` is the tenant slug. Unique args you set at send time are flattened onto the event and also appear as `unique_args`.

```javascript delivery-webhook.js
import { createHmac, timingSafeEqual } from "node:crypto"

function verify({ body, timestamp, signature, secret }) {
  if (!timestamp || !signature?.startsWith("sha256=")) return false

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) return false

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest()
  const received = Buffer.from(signature.slice(7), "hex")

  return expected.length === received.length &&
    timingSafeEqual(expected, received)
}

export function createDeliveryHandler({ secret, updateTransmission }) {
  return async function handle(request) {
    const body = await request.text()
    const timestamp = request.headers.get("X-Capsule-Timestamp")
    const signature = request.headers.get("X-Capsule-Signature")

    if (!verify({ body, timestamp, signature, secret })) {
      return new Response("invalid signature", { status: 401 })
    }

    const events = JSON.parse(body)
    for (const event of events) {
      await updateTransmission({
        tenantSlug: event.tenant_id,
        transmissionId: event.transmission_id,
        eventId: event.sg_event_id,
        type: event.event,
        recipient: event.email,
        occurredAt: new Date(event.timestamp * 1000),
        response: event.response,
        reason: event.reason,
      })
    }

    return new Response(null, { status: 204 })
  }
}
```

A 2xx response marks the delivery as sent. Return `204` on success. Reject a timestamp older than 300 seconds as a replay check. A bad signature should return `401`. See [Retries and replays](/docs/webhooks/retries-and-replays) for backoff.

## 7. Add a suppression

List the customer's suppressions. Index accepts `email` and `after`. It does not filter by tenant, so filter the returned rows by `tenant_id` in your application. The default page size is 100.

```bash list-suppressions.sh
curl -sS \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/suppressions" \
  --header "Authorization: Bearer $CAPSULE_API_KEY"
```

Each row has `email`, `reason`, `tenant_id`, `tenant`, and `created_at`.

Add an address when the customer asks you not to send.

```bash add-suppression.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/suppressions" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "suppression": {
      "email": "do-not-send@example.com",
      "tenant_id": "WbLcFd"
    }
  }'
```

```json suppression-response.json
{
  "id": "YtReWq",
  "email": "do-not-send@example.com",
  "reason": "manual",
  "tenant_id": "WbLcFd",
  "tenant": "acme-florist"
}
```

Import a list when you migrate a customer.

```bash import-suppressions.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/suppressions/import" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "emails": ["do-not-send@example.com", "old@example.com"],
    "tenant_id": "WbLcFd"
  }'
```

```json import-response.json
{
  "imported": 1,
  "existing": 1,
  "invalid": 0
}
```

Remove a suppression when the customer asks. DELETE returns `204` with an empty body.

```bash remove-suppression.sh
curl -sS \
  --request DELETE \
  --url "$CAPSULE_URL/api/v1/suppressions/YtReWq" \
  --header "Authorization: Bearer $CAPSULE_API_KEY"
```

A later send skips a suppressed address and lists it in `suppressed` on the response. A send where every recipient is suppressed returns `403` `{error: suppressed}`. See [How to manage suppressions](/docs/dashboard/emails/email-suppressions) and [How to set the email firewall](/docs/dashboard/emails/email-firewall).

## 8. Bind an inbox

Create an inbox on the customer's verified sending domain when you want replies. Default host is `inbound.{sending_domain}`.

```bash create-inbox.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/inboxes" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "inbox": {
      "name": "Acme replies",
      "local_part": "reply",
      "sending_domain_id": "HsVtYk",
      "webhook_url": "https://esp.example.com/webhooks/capsule/inbound",
      "webhook_format": "json"
    }
  }'
```

The tenant comes from the sending domain. Store `webhook_secret` now. Lists omit it.

```json inbox-response.json
{
  "id": "PqRzMn",
  "name": "Acme replies",
  "address": "reply@inbound.mail.acme.example",
  "local_part": "reply",
  "host": "inbound.mail.acme.example",
  "tenant_id": "WbLcFd",
  "sending_domain_id": "HsVtYk",
  "webhook_url": "https://esp.example.com/webhooks/capsule/inbound",
  "webhook_format": "json",
  "webhook_secret": "SAVE_THIS_SECRET",
  "mx_status": "pending",
  "mx_record": "inbound.mail.acme.example MX 10 inbound.postshiba.com",
  "mx_target": "inbound.postshiba.com"
}
```

Publish the MX record on `inbound.{sending_domain}`. Then call `POST /api/v1/inboxes/PqRzMn/verify`. Verify queues a check. Poll the inbox until `mx_status` is `verified`. Do not move the sending domain MX. See [How do I avoid MX conflicts?](/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records). The [support desk guide](/docs/guides/build-email-support-desk) shows threading. The [AI agent inbox guide](/docs/guides/build-ai-agent-inbox) shows a hosted inbox.

## 9. Pause the customer

```bash suspend-tenant.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/tenants/WbLcFd/suspend" \
  --header "Authorization: Bearer $CAPSULE_API_KEY"
```

```json suspend-response.json
{
  "id": "WbLcFd",
  "name": "Acme Florist",
  "slug": "acme-florist",
  "suspended": true
}
```

Resume after the problem is resolved.

```bash resume-tenant.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/tenants/WbLcFd/resume" \
  --header "Authorization: Bearer $CAPSULE_API_KEY"
```

```json resume-response.json
{
  "id": "WbLcFd",
  "name": "Acme Florist",
  "slug": "acme-florist",
  "suspended": false
}
```

If resume returns `403` `operator_hold`, the tenant was paused by PostShiba. See [Errors](/docs/api-reference/errors).

Disable a leaked SMTP credential separately. The password is omitted.

```bash disable-credential.sh
curl -sS \
  --request DELETE \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/clusters/NmQpXr/smtp_credentials/RvWsXq" \
  --header "Authorization: Bearer $CAPSULE_API_KEY"
```

```json disabled-credential.json
{
  "id": "RvWsXq",
  "username": "smtp_9",
  "tenant_id": "WbLcFd",
  "tenant": "acme-florist",
  "cluster_id": "NmQpXr"
}
```

See [Tenants](/docs/dashboard/tenants/introduction) for delete guards.

You now have a tenant, a domain, a credential, a send, a signed webhook, a suppression, an inbox, and a pause switch.

## Next steps

- [Tenants](/docs/dashboard/tenants/introduction)
- [Verified domains](/docs/dashboard/domains/introduction)
- [SMTP credentials](/docs/api-reference/smtp-credentials)
- [Unique args](/docs/dashboard/emails/unique-args)
- [How to manage suppressions](/docs/dashboard/emails/email-suppressions)
- [Verify webhook requests](/docs/webhooks/verify-webhooks-requests)
