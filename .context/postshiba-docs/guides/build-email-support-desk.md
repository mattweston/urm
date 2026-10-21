# Build an email support desk on PostShiba

> Receive support mail, keep conversations together, and send replies.

This guide gives `help@inbound.support.example.com` an inbox, replies from `help@support.example.com`, keeps later mail on plus-addresses such as `help+ticket_123@inbound.support.example.com`, and watches those replies on a delivery webhook. You keep a mailbox, a ticket, and a message in your own database.

## Before you start

- A Full access key from [API keys](/docs/create-an-api-key).
- DNS for `support.example.com`. You will publish DKIM, return-path, and MX on `inbound.support.example.com`. Leave the sending domain MX alone.
- A payment method on the team. Cluster create returns `403` `{error: payment_required}` when billing is on and there is no card.

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
      "name": "support-mail",
      "size": "small",
      "region": "manual",
      "plan": "nano",
      "classification": "transactional"
    }
  }'
```

```json cluster-response.json
{
  "id": "NmQpXr",
  "name": "support-mail",
  "region": "manual",
  "size": "small",
  "plan": "nano",
  "ip_assignment": "shared",
  "desired_status": "active",
  "status": "active",
  "sending_ready": true
}
```

If `sending_ready` is still `false`, GET `/api/v1/clusters/NmQpXr` again. If the response is `403` `kyc_required`, the team is still pending. While the team is pending, you send only to member emails, live inbox addresses, and inbox forward-to addresses, and anything else returns `403` `kyc_required`. See [Does PostShiba require production approval?](/docs/knowledge-base/does-capsule-require-production-approval).

## 2. Add the sending domain

Create and verify `support.example.com` before the inbox. The same domain lets agents reply from `help@support.example.com`.

```bash create-domain.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/sending_domains" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "sending_domain": {
      "name": "support.example.com"
    }
  }'
```

```json domain-response.json
{
  "id": "HsVtYk",
  "name": "support.example.com",
  "tenant_id": "WbLcFd",
  "tenant": "default",
  "dkim_status": "pending",
  "return_path_status": "pending",
  "dmarc_status": "pending",
  "sending_allowed": false,
  "dkim_selector": "ps1",
  "dkim_manual": false,
  "dkim_cname_host": "ps1._domainkey.support.example.com",
  "dkim_cname_target": "HsVtYk.customers.postshiba.com",
  "return_path_host": "rp.support.example.com",
  "return_path_target": "rp.postshiba.com"
}
```

Publish the DKIM CNAME and return-path CNAME exactly as returned. Then verify.

```bash verify-domain.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/sending_domains/HsVtYk/verify" \
  --header "Authorization: Bearer $CAPSULE_API_KEY"
```

Wait until `sending_allowed` is `true`. See [Add and verify a domain](/docs/add-a-domain).

## 3. Create the inbox

Set `sending_domain_id` and `webhook_format` `json`. Default host is `inbound.support.example.com`.

```bash create-inbox.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/inboxes" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "inbox": {
      "name": "Customer support",
      "local_part": "help",
      "sending_domain_id": "HsVtYk",
      "webhook_url": "https://desk.example.com/webhooks/capsule/inbound",
      "webhook_format": "json"
    }
  }'
```

```json inbox-response.json
{
  "id": "PqRzMn",
  "name": "Customer support",
  "address": "help@inbound.support.example.com",
  "local_part": "help",
  "host": "inbound.support.example.com",
  "tenant_id": "WbLcFd",
  "sending_domain_id": "HsVtYk",
  "webhook_url": "https://desk.example.com/webhooks/capsule/inbound",
  "webhook_format": "json",
  "webhook_secret": "SAVE_THIS_SECRET",
  "mx_status": "pending",
  "mx_record": "inbound.support.example.com MX 10 inbound.postshiba.com",
  "mx_target": "inbound.postshiba.com"
}
```

Save `webhook_secret` now. Lists omit it. Publish the MX record on `inbound.support.example.com`. Leave `support.example.com` MX alone. See [How do I avoid MX conflicts?](/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records).

```bash verify-inbox.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/inboxes/PqRzMn/verify" \
  --header "Authorization: Bearer $CAPSULE_API_KEY"
```

Verify queues a check. Poll the inbox until `mx_status` is `verified`.

```json inbox-ready.json
{
  "id": "PqRzMn",
  "address": "help@inbound.support.example.com",
  "mx_status": "verified"
}
```

If `mx_status` stays `pending` or becomes `failed`, check the MX host and value.

## 4. Accept the inbound webhook

Read the raw body before parsing JSON. Pass in your own database and queue functions. Inbox webhooks sign with `webhook_secret`.

```javascript inbound-webhook.js
import { createHmac, timingSafeEqual } from "node:crypto"

function validSignature({ body, timestamp, signature, secret }) {
  if (!timestamp || !signature?.startsWith("sha256=")) return false

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) return false

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest()
  const received = Buffer.from(signature.slice("sha256=".length), "hex")

  return received.length === expected.length &&
    timingSafeEqual(received, expected)
}

export function createInboundHandler({ secret, saveMessage, enqueueOnce }) {
  return async function handleInbound(request) {
    const body = await request.text()
    const timestamp = request.headers.get("X-Capsule-Timestamp")
    const signature = request.headers.get("X-Capsule-Signature")

    if (!validSignature({ body, timestamp, signature, secret })) {
      return new Response("invalid signature", { status: 401 })
    }

    const message = JSON.parse(body)

    await saveMessage({
      capsuleId: message.id,
      inboxId: message.inbox_id,
      from: message.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      threadId: message.thread_id,
      inReplyTo: message.in_reply_to,
      headers: message.headers,
      attachments: message.attachments,
      expiresAt: message.expires_at,
    })

    await enqueueOnce(`support-inbound:${message.id}`, {
      topic: "support-inbound",
      messageId: message.id,
    })
    return new Response(null, { status: 204 })
  }
}
```

A 2xx response marks the delivery as sent. Return `204` on success. A bad signature should return `401`. `saveMessage` must upsert on the PostShiba message ID. If queue publication fails, let the request fail so PostShiba retries. See [Verify webhook requests](/docs/webhooks/verify-webhooks-requests) and [Inbound messages](/docs/api-reference/messages).

For a new message to the base inbox, create a ticket. For later mail, read `thread_id`. PostShiba sets that field from the plus tag first, then In-Reply-To, then References, then Message-ID. See [Get email content](/docs/dashboard/receiving/get-email-content).

## 5. Send an agent reply

Cluster create already issues a default SMTP credential. REST sends use the Bearer token. Create another credential only when you need the password for SMTP.

Set `reply_to` to a plus-address with your ticket ID. Set `In-Reply-To` and `References` from the inbound headers.

```javascript send-reply.js
import { PostShiba } from "postshiba"

export async function sendReply({
  apiKey,
  teamId,
  ticket,
  inboundMessage,
  agentText,
}) {
  const postshiba = new PostShiba(apiKey, { teamId })
  const messageId = inboundMessage.headers["message-id"]
  const priorReferences = inboundMessage.headers.references
  const references = [priorReferences, messageId].filter(Boolean).join(" ")
  const originalSubject = inboundMessage.subject || "Your support request"

  const body = await postshiba.emails.send({
    from: "Acme Support <help@support.example.com>",
    to: [inboundMessage.from],
    reply_to: `help+${ticket.id}@inbound.support.example.com`,
    subject: originalSubject.toLowerCase().startsWith("re:")
      ? originalSubject
      : `Re: ${originalSubject}`,
    text: agentText,
    headers: {
      "In-Reply-To": messageId,
      References: references,
    },
    unique_args: {
      ticket_id: ticket.id,
      support_message_id: ticket.nextMessageId,
    },
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
  "from": "Acme Support <help@support.example.com>",
  "to": ["you@example.com"],
  "subject": "Re: I need help with order 123",
  "unique_args": {
    "ticket_id": "ticket_123",
    "support_message_id": "msg_1"
  }
}
```

When the customer replies, mail goes to `help+ticket_123@inbound.support.example.com`. PostShiba matches it to the `help` inbox and sets `thread_id` to `ticket_123`. If inject queued nobody, the response is `502` `{error: inject_failed}`.

## 6. Track the reply

Create a separate webhook endpoint for outgoing delivery events.

```bash create-delivery-webhook.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/webhook_endpoints" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "webhook_endpoint": {
      "url": "https://desk.example.com/webhooks/capsule/delivery",
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

```json delivery-webhook-response.json
{
  "id": "CdFgHj",
  "url": "https://desk.example.com/webhooks/capsule/delivery",
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

Match `ticket_id` and `support_message_id` from the flattened unique args. A `delivered` event means the destination accepted the reply. See [Delivered but not in the inbox](/docs/knowledge-base/what-if-an-email-says-delivered).

You now have a verified `support.example.com`, a domain-bound inbox, a signed inbound handler, a plus-address reply, and a delivery webhook.

## Next steps

- [Receiving emails](/docs/dashboard/receiving/introduction)
- [Receiving webhooks](/docs/dashboard/receiving/create-receiving-webhook)
- [Get email content](/docs/dashboard/receiving/get-email-content)
- [Verify webhook requests](/docs/webhooks/verify-webhooks-requests)
- [Inbound messages](/docs/api-reference/messages)
