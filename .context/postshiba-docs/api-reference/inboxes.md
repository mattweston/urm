# Inboxes

> Hosted or domain-bound receiving addresses.

An inbox receives mail. A hosted inbox gets an address on the PostShiba inbound zone and needs no DNS, so its mx_status is not_required. A domain-bound inbox needs an MX record on a host you choose: inbound.{sending_domain} by default, another subdomain, or the sending domain itself. Set host and the sending domain is inferred. Create refuses a host that already has MX, so mail for an existing mailbox is never taken over. It also refuses a host that is not under one of your sending domains, or that another team's verified domain owns. The sending domain may still be waiting on DNS: the inbox is created and starts receiving once the domain verifies, so you can publish its MX record together with DKIM and return-path. The domain's records list includes that MX. Set forward_to to re-sign each message and send it to an address on a verified sending domain. The forwarded copy is From {mailbox}@{sending_domain} with Reply-To set to the original sender. You can create inboxes while your account is pending approval. Mail is received once the team has an active shared cluster. inbound_emails_per_hour is the team's hourly receiving allowance, the sum across its live clusters. A soft reject from the inbound spam filter returns 451 temporary filter delay, so the sender retries. webhook_secret is returned on create and show, never on the list. stored_bytes is how much received mail the inbox holds right now; it is left off the list. Inbox storage bills per GB-month. Inboxes can't be updated through the API. Delete disables the inbox, and the address can be created again.

## GET /api/v1/teams/:obfuscated_team_id/inboxes

List live inboxes. webhook_secret is omitted.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/inboxes
```

```json response.json
[
  {
    "id": "PqRzMn",
    "name": "agent",
    "address": "inbabc123@inbound.capsule.test",
    "local_part": "inbabc123",
    "host": "inbound.capsule.test",
    "tenant_id": "WbLcFd",
    "webhook_url": "https://hooks.example.com/mail",
    "webhook_format": "json",
    "mx_status": "not_required",
    "inbound_emails_per_hour": 25,
    "retention_hours": 168
  }
]
```

## GET /api/v1/inboxes/:id

Get one live inbox, including the webhook secret.

- `id`: Public inbox id

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/inboxes/:inbox_id
```

```json response.json
{
  "id": "PqRzMn",
  "name": "agent",
  "address": "inbabc123@inbound.capsule.test",
  "local_part": "inbabc123",
  "host": "inbound.capsule.test",
  "tenant_id": "WbLcFd",
  "webhook_url": "https://hooks.example.com/mail",
  "webhook_format": "json",
  "webhook_secret": "hex-secret",
  "mx_status": "not_required",
  "inbound_emails_per_hour": 25,
  "retention_hours": 168,
  "stored_bytes": 48213904
}
```

## POST /api/v1/teams/:obfuscated_team_id/inboxes

Create an inbox. Works while your account is pending approval. Mail is received once the team has an active shared cluster. Hosted: omit host and sending_domain_id. Domain-bound: set local_part and host to one of your sending domains or a subdomain. The domain may still be waiting on DNS; sending_domain_id is inferred from host when omitted. Host is refused if it already has MX, belongs to another team's verified domain, is not under one of your sending domains, or the domain is suspended.

- `name`: Label. Used as local_part when local_part is omitted and name is a valid mailbox.
- `local_part`: Mailbox. Generated on hosted inboxes when omitted. On domain-bound inboxes, defaults to name when that is a valid mailbox, otherwise inbox. * is catch-all.
- `host`: Domain-bound receive host: the sending domain or a subdomain. Infers sending_domain_id. Omit for a hosted inbox on the PostShiba inbound zone.
- `sending_domain_id`: Optional. Verified sending domain. Inferred from host when omitted.
- `forward_to`: Optional. Address on a verified sending domain.
- `webhook_url`: Optional. HTTPS in production.
- `webhook_format`: json or sendgrid_parse. Default json.
- `tenant_id`: Optional. Sending domain tenant wins when the inbox is domain-bound.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"inbox":{"name":"agent","local_part":"agent","host":"inbound.example.com","webhook_url":"https://hooks.example.com/mail","forward_to":"you@example.com"}}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/inboxes
```

```json response.json
{
  "id": "PqRzMn",
  "name": "agent",
  "address": "inbabc123@inbound.capsule.test",
  "local_part": "inbabc123",
  "host": "inbound.capsule.test",
  "tenant_id": "WbLcFd",
  "webhook_url": "https://hooks.example.com/mail",
  "webhook_format": "json",
  "webhook_secret": "hex-secret",
  "mx_status": "not_required",
  "inbound_emails_per_hour": 25,
  "retention_hours": 168,
  "stored_bytes": 48213904
}
```

## DELETE /api/v1/inboxes/:id

Disable the inbox. The address can be created again.

- `id`: Public inbox id

```bash request.sh
curl -sS -X DELETE \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/inboxes/:inbox_id
```

```json response.json
{
  "id": "PqRzMn",
  "name": "agent",
  "address": "inbabc123@inbound.capsule.test",
  "local_part": "inbabc123",
  "host": "inbound.capsule.test",
  "tenant_id": "WbLcFd",
  "webhook_url": "https://hooks.example.com/mail",
  "webhook_format": "json",
  "mx_status": "not_required",
  "inbound_emails_per_hour": 25,
  "retention_hours": 168,
  "stored_bytes": 48213904
}
```

## POST /api/v1/inboxes/:id/verify

Queue an MX check for a domain-bound inbox.

- `id`: Public inbox id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/inboxes/:inbox_id/verify
```

```json response.json
{
  "id": "PqRzMn",
  "name": "agent",
  "address": "inbabc123@inbound.capsule.test",
  "local_part": "inbabc123",
  "host": "inbound.capsule.test",
  "tenant_id": "WbLcFd",
  "webhook_url": "https://hooks.example.com/mail",
  "webhook_format": "json",
  "mx_status": "not_required",
  "inbound_emails_per_hour": 25,
  "retention_hours": 168,
  "stored_bytes": 48213904
}
```
