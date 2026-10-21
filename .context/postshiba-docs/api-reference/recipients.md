# Recipients

> Look up one address: sends, suppressions, and firewall.

Look up one address on the token's team. Returns recent sends, suppressions, the firewall verdict, and whether the address can receive mail. A Support key masks runs of four or more digits in explanations. It never returns a raw event payload.

## GET /api/v1/teams/:obfuscated_team_id/recipients

Look up a recipient by email.

- `email`: Recipient address. Case-insensitive. Required for a useful result.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/recipients
```

```json response.json
{
  "email": "dest@example.com",
  "can_receive": false,
  "suppressions": [
    {
      "id": "YtReWq",
      "email": "blocked@example.com",
      "reason": "manual",
      "tenant_id": "WbLcFd",
      "tenant": "default",
      "created_at": "2026-08-30T00:00:00Z"
    }
  ],
  "firewall": null,
  "sends": [
    {
      "id": "JkLmNp",
      "event_type": "dropped",
      "message_id": null,
      "occurred_at": "2026-08-29T00:00:00Z",
      "explanation": "We did not send this message because the address is on your suppression list."
    }
  ]
}
```
