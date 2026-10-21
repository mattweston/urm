# Authentication

> Send an API key as a Bearer token and check which user it belongs to.

Create an API key on the API keys page and send it as a Bearer token on every request. Each key belongs to one team. The API keys page also lists your team id, for /api/v1/teams/… paths and the SDKs, and your cluster ids, for /clusters/… paths and X-Capsule-Cluster-Id. A team id in the path that does not match the key returns 404 {error: team_mismatch}. While an account is suspended, reads and deletes still work, but creating or changing clusters, domains, tenants, SMTP credentials, inboxes, webhook endpoints, and templates returns 403 {error: team_suspended}.

## GET /api/v1/users/me

Check that a key works and see the user it belongs to. The response does not include a team id. Copy that from the API keys page.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/users/me
```

```json response.json
{
  "id": "UsErMe",
  "email": "you@example.com",
  "first_name": "Ada",
  "last_name": "Lovelace",
  "time_zone": "UTC",
  "locale": null,
  "created_at": "2026-09-11T12:00:00.000Z",
  "updated_at": "2026-09-11T12:00:00.000Z"
}
```
