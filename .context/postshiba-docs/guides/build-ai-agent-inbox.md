# Build an AI agent inbox on PostShiba

> Give an agent a real inbox with signed webhooks and reply support.

This guide gives one agent a hosted inbox, stores a signed message, saves an approved draft, and sends one reply.

## Before you start

- A Full access key from [API keys](/docs/create-an-api-key).
- A sending domain you can verify. A hosted inbox is not a From identity.
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
      "name": "agent-mail",
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
  "name": "agent-mail",
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

## 2. Create the tenant

```bash create-tenant.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/tenants" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "tenant": {
      "name": "Acme agents",
      "slug": "acme-agents"
    }
  }'
```

```json tenant-response.json
{
  "id": "WbLcFd",
  "name": "Acme agents",
  "slug": "acme-agents",
  "suspended": false
}
```

Keep the id and the slug. See [Tenants](/docs/dashboard/tenants/introduction).

## 3. Issue a hosted inbox

Omit `sending_domain_id` and `local_part`. PostShiba generates an address on its inbound zone. `mx_status` is `not_required`. There is no MX to publish.

```bash create-inbox.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/inboxes" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "inbox": {
      "name": "Acme research agent",
      "tenant_id": "WbLcFd",
      "webhook_url": "https://agents.example.com/webhooks/capsule/inbound",
      "webhook_format": "json"
    }
  }'
```

```json inbox-response.json
{
  "id": "PqRzMn",
  "name": "Acme research agent",
  "address": "inbabc123@inbound.postshiba.com",
  "local_part": "inbabc123",
  "host": "inbound.postshiba.com",
  "tenant_id": "WbLcFd",
  "webhook_url": "https://agents.example.com/webhooks/capsule/inbound",
  "webhook_format": "json",
  "webhook_secret": "SAVE_THIS_SECRET",
  "mx_status": "not_required"
}
```

Save the inbox ID, address, and `webhook_secret`. Lists omit the secret. See [Receiving emails](/docs/dashboard/receiving/introduction).

## 4. Verify and store every webhook

Verify the signature, reject a stale timestamp, upsert on the inbound message ID, then enqueue work. Do not run the model inside this request.

```javascript inbound-webhook.js
import { createHmac, timingSafeEqual } from "node:crypto"

function verifyPostShiba({ rawBody, timestamp, signature, secret }) {
  if (!timestamp || !signature?.startsWith("sha256=")) return false

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) return false

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest()
  const received = Buffer.from(signature.slice(7), "hex")

  return received.length === expected.length &&
    timingSafeEqual(received, expected)
}

export function createAgentInboxHandler({ inbox, store, enqueueOnce }) {
  return async function handle(request) {
    const rawBody = await request.text()
    const timestamp = request.headers.get("X-Capsule-Timestamp")
    const signature = request.headers.get("X-Capsule-Signature")

    if (!verifyPostShiba({
      rawBody,
      timestamp,
      signature,
      secret: inbox.webhookSecret,
    })) {
      return new Response("invalid signature", { status: 401 })
    }

    const message = JSON.parse(rawBody)
    if (message.inbox_id !== inbox.capsuleId) {
      return new Response("wrong inbox", { status: 403 })
    }

    await store.upsertInbound({
      id: message.id,
      agentId: inbox.agentId,
      from: message.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      threadId: message.thread_id,
      inReplyTo: message.in_reply_to,
      headers: message.headers,
      envelope: message.envelope,
      authentication: message.authentication,
      attachments: message.attachments,
    })

    await enqueueOnce(`agent-inbound:${message.id}`, {
      topic: "agent-inbound",
      messageId: message.id,
    })
    return new Response(null, { status: 204 })
  }
}
```

A valid signed body for this inbox returns `204`. A bad signature should return `401`. A body for another inbox returns `403`. See [Verify webhook requests](/docs/webhooks/verify-webhooks-requests).

## 5. Save an approved draft

Email is untrusted input. After the policy check, pass only approved fields to the model and save the draft.

```javascript run-agent.js
export async function processAgentMail({
  messageId,
  store,
  model,
  policy,
  sendReply,
}) {
  const message = await store.getInbound(messageId)
  const conversation = await store.findConversation({
    agentId: message.agentId,
    threadId: message.threadId,
  })

  const decision = await policy.inspect({
    sender: message.from,
    subject: message.subject,
    text: message.text,
    attachments: message.attachments.map(({ filename, content_type, size }) => ({
      filename,
      contentType: content_type,
      size,
    })),
  })

  if (!decision.mayRunAgent) {
    await store.markNeedsReview(messageId, decision.reason)
    return
  }

  const draft = await model.draftReply({
    trustedInstructions: conversation.agentInstructions,
    untrustedEmail: {
      from: message.from,
      subject: message.subject,
      text: message.text,
    },
    allowedTools: decision.allowedTools,
  })

  if (decision.requiresHumanApproval) {
    await store.saveDraft(messageId, draft)
    return
  }

  await sendReply({ message, conversation, text: draft.text })
}
```

Set `requiresHumanApproval` to `true` until you trust the policy. A saved draft is the row from `store.saveDraft`. If `mayRunAgent` is `false`, you see `markNeedsReview` instead.

## 6. Send the approved reply

A hosted inbox is not a From identity. Verify `mail.acme.example` and issue a credential for this tenant first.

```bash create-domain.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/sending_domains" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "sending_domain": {
      "name": "mail.acme.example",
      "tenant_id": "WbLcFd"
    }
  }'
```

Publish DNS and wait until `sending_allowed` is `true`. See [Send basic transactional emails with PostShiba](/docs/guides/send-transactional-email).

```bash create-credential.sh
curl -sS \
  --request POST \
  --url "$CAPSULE_URL/api/v1/teams/$TEAM_ID/clusters/NmQpXr/smtp_credentials" \
  --header "Authorization: Bearer $CAPSULE_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "smtp_credential": {
      "tenant_id": "WbLcFd"
    }
  }'
```

The tenant-scoped credential is required so REST can pick a sending-ready cluster that has a live credential for this tenant. Cluster create only issues a default-tenant credential.

```json credential-response.json
{
  "id": "RvWsXq",
  "username": "smtp_9",
  "password": "once-only-password",
  "tenant_id": "WbLcFd",
  "tenant": "acme-agents",
  "cluster_id": "NmQpXr"
}
```

Send with the platform token. Set `reply_to` to a plus-address so the next inbound message carries your conversation ID in `thread_id`.

```javascript send-agent-reply.js
import { PostShiba } from "postshiba"

export function createPostShibaSender({
  apiKey,
  teamId,
  from,
  inboxAddress,
  tenant,
}) {
  const postshiba = new PostShiba(apiKey, { teamId })

  return async function sendReply({ message, conversation, text }) {
    const [local, host] = inboxAddress.split("@")
    const replyAddress = `${local}+${conversation.id}@${host}`
    const sourceMessageId = message.headers["message-id"]
    const references = [
      message.headers.references,
      sourceMessageId,
    ].filter(Boolean).join(" ")
    const originalSubject = message.subject || "Your message"

    const body = await postshiba.emails.send({
      from,
      to: [message.from],
      reply_to: replyAddress,
      subject: originalSubject.toLowerCase().startsWith("re:")
        ? originalSubject
        : `Re: ${originalSubject}`,
      text,
      headers: {
        "In-Reply-To": sourceMessageId,
        References: references,
      },
      unique_args: {
        agent_id: conversation.agentId,
        conversation_id: conversation.id,
      },
      tenant,
    })

    if (body.queued !== true) {
      throw new Error(`PostShiba send failed: ${JSON.stringify(body)}`)
    }

    return body
  }
}
```

```json send-response.json
{
  "queued": true,
  "message_id": "abc@postshiba.com",
  "from": "Acme Agent <agent@mail.acme.example>",
  "to": ["you@example.com"],
  "subject": "Re: Your message",
  "unique_args": {
    "agent_id": "agent_1",
    "conversation_id": "conversation_42"
  }
}
```

If inject queued nobody, the response is `502` `{error: inject_failed}`. Match `agent_id` and `conversation_id` on the delivery webhook. See [Event types](/docs/webhooks/event-types).

You now have a hosted inbox, a signed store-and-queue handler, a reviewed draft, and one queued reply.

## Next steps

- [Build an email support desk on PostShiba](/docs/guides/build-email-support-desk)
- [Receiving emails](/docs/dashboard/receiving/introduction)
- [Get email content](/docs/dashboard/receiving/get-email-content)
- [Tenants](/docs/dashboard/tenants/introduction)
- [Verify webhook requests](/docs/webhooks/verify-webhooks-requests)
