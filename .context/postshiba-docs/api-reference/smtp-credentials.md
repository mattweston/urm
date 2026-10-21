# SMTP credentials

> Issue a username and a once-only password.

SMTP credentials authenticate SMTP and HTTP inject on one cluster, for one tenant. The password is returned once, on create, so store it then. Delete disables a credential, and enable turns it back on.

## POST /api/v1/teams/:obfuscated_team_id/clusters/:obfuscated_cluster_id/smtp_credentials

Create a credential. Optional tenant_id. Defaults to the team's default tenant.

- `obfuscated_cluster_id`: Public cluster id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"smtp_credential":{"tenant_id":"WbLcFd"}}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/clusters/:obfuscated_cluster_id/smtp_credentials
```

```json response.json
{
  "id": "RvWsXq",
  "username": "smtp_9",
  "password": "once-only-password",
  "tenant_id": "WbLcFd",
  "tenant": "default",
  "cluster_id": "NmQpXr"
}
```

## DELETE /api/v1/teams/:obfuscated_team_id/clusters/:obfuscated_cluster_id/smtp_credentials/:id

Disable a credential. Password is omitted.

- `obfuscated_cluster_id`: Public cluster id
- `id`: Public credential id

```bash request.sh
curl -sS -X DELETE \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/clusters/:obfuscated_cluster_id/smtp_credentials/:smtp_credential_id
```

```json response.json
{
  "id": "RvWsXq",
  "username": "smtp_9",
  "tenant_id": "WbLcFd",
  "tenant": "default",
  "cluster_id": "NmQpXr"
}
```

## POST /api/v1/teams/:obfuscated_team_id/clusters/:obfuscated_cluster_id/smtp_credentials/:id/enable

Enable a disabled credential. Password is omitted.

- `obfuscated_cluster_id`: Public cluster id
- `id`: Public credential id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/clusters/:obfuscated_cluster_id/smtp_credentials/:smtp_credential_id/enable
```

```json response.json
{
  "id": "RvWsXq",
  "username": "smtp_9",
  "tenant_id": "WbLcFd",
  "tenant": "default",
  "cluster_id": "NmQpXr"
}
```
