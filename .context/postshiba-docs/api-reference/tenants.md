# Tenants

> Extra tenants under the token's team.

A tenant is one of your customers under your team. Each tenant has its own sending domains, SMTP credentials, inboxes, suppressions, and webhooks, and you can suspend one without affecting the others. Every team has a default tenant. The list omits it, but you can fetch it by id.

## GET /api/v1/teams/:obfuscated_team_id/tenants

List extra tenants. The default tenant is omitted.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/tenants
```

```json response.json
[
  {
    "id": "WbLcFd",
    "name": "Acme Florist",
    "slug": "acme-florist",
    "suspended": false
  }
]
```

## POST /api/v1/teams/:obfuscated_team_id/tenants

Create a tenant. Slug is generated from name when omitted.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"tenant":{"name":"Acme Florist"}}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/tenants
```

```json response.json
{
  "id": "WbLcFd",
  "name": "Acme Florist",
  "slug": "acme-florist",
  "suspended": false
}
```

## GET /api/v1/tenants/:id

Get one tenant. Includes the default tenant.

- `id`: Public tenant id

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/tenants/:tenant_id
```

```json response.json
{
  "id": "WbLcFd",
  "name": "Acme Florist",
  "slug": "acme-florist",
  "suspended": false
}
```

## POST /api/v1/tenants/:id/suspend

Pause sending.

- `id`: Public tenant id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/tenants/:tenant_id/suspend
```

```json response.json
{
  "id": "WbLcFd",
  "name": "Acme Florist",
  "slug": "acme-florist",
  "suspended": true
}
```

## POST /api/v1/tenants/:id/resume

Resume sending. Returns 403 {error: operator_hold} when the tenant was paused by our abuse team; contact support.

- `id`: Public tenant id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/tenants/:tenant_id/resume
```

```json response.json
{
  "id": "WbLcFd",
  "name": "Acme Florist",
  "slug": "acme-florist",
  "suspended": false
}
```

## DELETE /api/v1/tenants/:id

Delete an extra tenant. SMTP users are deleted. Domains and inboxes move to destination_tenant_id, or the default tenant when that is omitted. Rejected if it is the default tenant.

- `id`: Public tenant id
- `destination_tenant_id`: Optional. Tenant that receives domains and inboxes. Defaults to the team's default tenant.

```bash request.sh
curl -sS -X DELETE \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/tenants/:tenant_id
```
