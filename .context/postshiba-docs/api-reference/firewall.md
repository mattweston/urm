# Firewall

> Pre-send recipient checks for the token's team.

Pre-send recipient checks for the token's team. Toggle catalog checks, then add deny or allow domains and addresses. Allow wins. SMTP uses the same policy.

## GET /api/v1/teams/:obfuscated_team_id/firewall

Get the team's firewall. available_checks is the live catalog.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/firewall
```

```json response.json
{
  "enabled_checks": [
    "temp_providers",
    "plus_addressing"
  ],
  "available_checks": [
    "temp_providers",
    "free_providers",
    "plus_addressing"
  ],
  "entries": [
    {
      "id": "BnMkLo",
      "list": "deny",
      "value": "mailinator.com",
      "created_at": "2026-08-31T00:00:00Z"
    }
  ]
}
```

## PATCH /api/v1/teams/:obfuscated_team_id/firewall

Replace enabled_checks. Unknown ids are rejected. Missing checks are off.

```bash request.sh
curl -sS -X PATCH \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"firewall":{"enabled_checks":["temp_providers","plus_addressing"]}}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/firewall
```

```json response.json
{
  "enabled_checks": [
    "temp_providers",
    "plus_addressing"
  ],
  "available_checks": [
    "temp_providers",
    "free_providers",
    "plus_addressing"
  ],
  "entries": [
    {
      "id": "BnMkLo",
      "list": "deny",
      "value": "mailinator.com",
      "created_at": "2026-08-31T00:00:00Z"
    }
  ]
}
```

## POST /api/v1/teams/:obfuscated_team_id/firewall_entries

Add a deny or allow value. Domains match subdomains. Addresses match the plus-stripped mailbox.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"firewall_entry":{"list":"deny","value":"mailinator.com"}}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/firewall_entries
```

```json response.json
{
  "id": "BnMkLo",
  "list": "deny",
  "value": "mailinator.com",
  "created_at": "2026-08-31T00:00:00Z"
}
```

## DELETE /api/v1/firewall_entries/:id

Remove a deny or allow value.

- `id`: Public firewall entry id

```bash request.sh
curl -sS -X DELETE \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/firewall_entries/:firewall_entry_id
```
