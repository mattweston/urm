# Webhooks

> Outbound delivery webhook endpoints.

Delivery webhook endpoints. PostShiba POSTs each delivery event to the url as a one-item array in the SendGrid Event Webhook format. Every POST carries X-Capsule-Timestamp and X-Capsule-Signature, which is sha256= plus the hex HMAC-SHA256 of {timestamp}.{body} keyed with secret. secret is returned on create and show, not on the list. Omit cluster_id and tenant_id to receive the whole team's events, or set one of them to receive only that cluster's or tenant's. Any response outside 2xx is a failure. An event gets up to 6 attempts, retried after 5 minutes, 30 minutes, 2 hours, 8 hours, and 24 hours, and is then marked dead. Replay dead deliveries from the dashboard. The API has no replay action. After 8 failed attempts in a row, new events are skipped for that endpoint until a delivery succeeds. last_probe_ok is a HEAD request sent on create, on url changes, and every 5 minutes. Any status below 500, including 405, counts as up. The url must be public, and https in production.

## GET /api/v1/teams/:obfuscated_team_id/webhook_endpoints

List webhook endpoints. secret is omitted.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/webhook_endpoints
```

```json response.json
[
  {
    "id": "CdFgHj",
    "url": "https://hooks.example.com/capsule",
    "enabled": true,
    "cluster_id": null,
    "tenant_id": null,
    "event_types": [
      "processed",
      "dropped",
      "deferred",
      "bounce",
      "delivered",
      "spamreport",
      "unsubscribe"
    ],
    "last_success_at": null,
    "last_failure_at": null,
    "consecutive_failures": 0,
    "last_probed_at": null,
    "last_probe_ok": null,
    "last_probe_code": null
  }
]
```

## GET /api/v1/webhook_endpoints/:id

Get one endpoint, including the signing secret.

- `id`: Public webhook endpoint id

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/webhook_endpoints/:webhook_endpoint_id
```

```json response.json
{
  "id": "CdFgHj",
  "url": "https://hooks.example.com/capsule",
  "enabled": true,
  "cluster_id": null,
  "tenant_id": null,
  "event_types": [
    "processed",
    "dropped",
    "deferred",
    "bounce",
    "delivered",
    "spamreport",
    "unsubscribe"
  ],
  "last_success_at": null,
  "last_failure_at": null,
  "consecutive_failures": 0,
  "last_probed_at": null,
  "last_probe_ok": null,
  "last_probe_code": null,
  "secret": "hex-secret"
}
```

## POST /api/v1/teams/:obfuscated_team_id/webhook_endpoints

Create an endpoint. Optional event_types, cluster_id, and tenant_id. Defaults to the SendGrid delivery set and team scope.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"webhook_endpoint":{"url":"https://hooks.example.com/capsule","event_types":["delivered","bounce"],"cluster_id":"NmQpXr"}}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/webhook_endpoints
```

```json response.json
{
  "id": "CdFgHj",
  "url": "https://hooks.example.com/capsule",
  "enabled": true,
  "cluster_id": null,
  "tenant_id": null,
  "event_types": [
    "processed",
    "dropped",
    "deferred",
    "bounce",
    "delivered",
    "spamreport",
    "unsubscribe"
  ],
  "last_success_at": null,
  "last_failure_at": null,
  "consecutive_failures": 0,
  "last_probed_at": null,
  "last_probe_ok": null,
  "last_probe_code": null,
  "secret": "hex-secret"
}
```

## PATCH /api/v1/webhook_endpoints/:id

Update url, enabled, event_types, or scope. secret is omitted.

- `id`: Public webhook endpoint id

```bash request.sh
curl -sS -X PATCH \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"webhook_endpoint":{"enabled":false,"event_types":["delivered","bounce"]}}' \
  https://app.postshiba.com/api/v1/webhook_endpoints/:webhook_endpoint_id
```

```json response.json
{
  "id": "CdFgHj",
  "url": "https://hooks.example.com/capsule",
  "enabled": false,
  "cluster_id": null,
  "tenant_id": null,
  "event_types": [
    "delivered",
    "bounce"
  ],
  "last_success_at": null,
  "last_failure_at": null,
  "consecutive_failures": 0,
  "last_probed_at": null,
  "last_probe_ok": null,
  "last_probe_code": null
}
```

## DELETE /api/v1/webhook_endpoints/:id

Delete an endpoint.

- `id`: Public webhook endpoint id

```bash request.sh
curl -sS -X DELETE \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/webhook_endpoints/:webhook_endpoint_id
```
