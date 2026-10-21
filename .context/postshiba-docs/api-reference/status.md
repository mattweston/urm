# Status

> Whether the token's team can send right now.

Whether the token's team can send right now: cap, holds, suspension, and KYC.

## GET /api/v1/teams/:obfuscated_team_id/status

Sending status for the token's team.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/status
```

```json response.json
{
  "suspended": false,
  "kyc_status": "approved",
  "clusters_at_cap": [
    {
      "id": "NmQpXr",
      "name": "outbound",
      "hourly_remaining": 0,
      "daily_remaining": 12,
      "queued": 15
    }
  ],
  "held_tenants": []
}
```
