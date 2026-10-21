# Suppressions

> Addresses that must not be sent to.

Addresses PostShiba won't send to. Hard bounces, spam reports, and unsubscribes add one automatically. You can also add one, import many, or remove one. When you move from another provider, import its bounce, complaint, and unsubscribe lists before your first send.

## GET /api/v1/teams/:obfuscated_team_id/suppressions

List suppressions as id-ascending pages. Default 100, max 1000. Next page is after the last id.

- `after`: Return rows with id greater than this. Omit for the first page.
- `limit`: Page size. Default 100. Max 1000.
- `email`: Case-insensitive exact address. Plus tags collapse to the stripped address.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/suppressions
```

```json response.json
[
  {
    "id": "YtReWq",
    "email": "blocked@example.com",
    "reason": "manual",
    "tenant_id": "WbLcFd",
    "tenant": "default",
    "created_at": "2026-08-30T00:00:00Z"
  }
]
```

## POST /api/v1/teams/:obfuscated_team_id/suppressions

Add an address. Optional tenant_id. Defaults to the team's default tenant. Reason is always manual.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"suppression":{"email":"blocked@example.com","tenant_id":"WbLcFd"}}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/suppressions
```

```json response.json
{
  "id": "YtReWq",
  "email": "blocked@example.com",
  "reason": "manual",
  "tenant_id": "WbLcFd",
  "tenant": "default",
  "created_at": "2026-08-30T00:00:00Z"
}
```

## POST /api/v1/teams/:obfuscated_team_id/suppressions/import

Add many addresses. Optional tenant_id defaults to the team's default tenant. Reason is always manual. Existing rows are skipped. Max 10,000 addresses. A CSV file is also accepted (column email, address, or recipient, or one address per line).

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"emails":["blocked@example.com","old@example.com"],"tenant_id":"WbLcFd"}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/suppressions/import
```

```json response.json
{
  "imported": 2,
  "existing": 0,
  "invalid": 0
}
```

## DELETE /api/v1/suppressions/:id

Remove an address from the list.

- `id`: Public suppression id

```bash request.sh
curl -sS -X DELETE \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/suppressions/:suppression_id
```
