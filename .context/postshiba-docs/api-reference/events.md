# Events

> Delivery events for a cluster.

Delivery events for the team or a cluster, newest first. Optional filters apply first, then the list is capped at 200. Same filters as the Events page. Unique args you set at send time live in the stored payload as a JSON object. Bounce, deferred, dropped, and spamreport rows include bounce_classification, bounce_reason, smtp_code, enhanced_code, and a pasteable explanation. Delivered rows return those fields as null. When the receiving server never answered, payload.response.content and payload.reason carry a plain sentence about the connection. A Support key gets no payload, and runs of four or more digits in subject-like fields are masked. Use explanation when you tell a customer what happened.

## GET /api/v1/teams/:obfuscated_team_id/message_events

List team events. Filters apply first, then the latest 200.

- `cluster_id`: Public cluster id. Uses the same window as the cluster Events page.
- `message_id`: Exact message id
- `recipient`: Case-insensitive exact recipient
- `mx_provider`: Case-insensitive exact MX provider
- `sending_ip`: Exact sending IP
- `tenant_id`: Public tenant id
- `sending_domain_id`: Public sending domain id
- `event_type`: Exact event type
- `since`: Occurred at on or after
- `until`: Occurred at on or before
- `query`: JSON and/or group of rules. Fields: message_id, recipient, mx_provider, sending_ip, tenant_id, sending_domain_id, cluster_id, event_type, occurred_at. cmp: eq, neq, contains, gte, lte

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/message_events
```

```json response.json
[
  {
    "id": "JkLmNp",
    "event_type": "delivered",
    "recipient": "dest@example.com",
    "sender": "hello@mail.example.com",
    "message_id": "abc",
    "mx_provider": "gmail",
    "sending_ip": "203.0.113.10",
    "bounce_classification": null,
    "bounce_reason": null,
    "smtp_code": null,
    "enhanced_code": null,
    "explanation": null,
    "occurred_at": "2026-08-29T00:00:00Z",
    "drain_status": "pending",
    "tenant_id": "WbLcFd",
    "sending_domain_id": "HsVtYk",
    "node_id": "ZxHvTb",
    "payload": {
      "event": "delivered"
    }
  }
]
```

## GET /api/v1/teams/:obfuscated_team_id/clusters/:obfuscated_cluster_id/message_events

List events. Filters apply first, then the latest 200.

- `obfuscated_cluster_id`: Public cluster id
- `message_id`: Exact message id
- `recipient`: Case-insensitive exact recipient
- `mx_provider`: Case-insensitive exact MX provider
- `sending_ip`: Exact sending IP
- `tenant_id`: Public tenant id
- `sending_domain_id`: Public sending domain id
- `cluster_id`: Public cluster id
- `event_type`: Exact event type
- `since`: Occurred at on or after
- `until`: Occurred at on or before
- `query`: JSON and/or group of rules. Fields: message_id, recipient, mx_provider, sending_ip, tenant_id, sending_domain_id, cluster_id, event_type, occurred_at. cmp: eq, neq, contains, gte, lte

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/clusters/:obfuscated_cluster_id/message_events
```

```json response.json
[
  {
    "id": "JkLmNp",
    "event_type": "delivered",
    "recipient": "dest@example.com",
    "sender": "hello@mail.example.com",
    "message_id": "abc",
    "mx_provider": "gmail",
    "sending_ip": "203.0.113.10",
    "bounce_classification": null,
    "bounce_reason": null,
    "smtp_code": null,
    "enhanced_code": null,
    "explanation": null,
    "occurred_at": "2026-08-29T00:00:00Z",
    "drain_status": "pending",
    "tenant_id": "WbLcFd",
    "sending_domain_id": "HsVtYk",
    "node_id": "ZxHvTb",
    "payload": {
      "event": "delivered"
    }
  }
]
```

## GET /api/v1/message_events/:id

Get one event and its payload. A Support key omits payload.

- `id`: Public event id

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/message_events/:message_event_id
```

```json response.json
{
  "id": "JkLmNp",
  "event_type": "delivered",
  "recipient": "dest@example.com",
  "sender": "hello@mail.example.com",
  "message_id": "abc",
  "mx_provider": "gmail",
  "sending_ip": "203.0.113.10",
  "bounce_classification": null,
  "bounce_reason": null,
  "smtp_code": null,
  "enhanced_code": null,
  "explanation": null,
  "occurred_at": "2026-08-29T00:00:00Z",
  "drain_status": "pending",
  "tenant_id": "WbLcFd",
  "sending_domain_id": "HsVtYk",
  "node_id": "ZxHvTb",
  "payload": {
    "event": "delivered"
  }
}
```
