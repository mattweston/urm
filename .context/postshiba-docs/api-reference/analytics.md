# Analytics

> Delivery totals for the token's team.

Delivery totals for the token's team. Optional compare returns the previous window of the same length.

## GET /api/v1/teams/:obfuscated_team_id/analytics

Delivery analytics for the token's team.

- `since`: ISO-8601 start. Default is 24 hours before until.
- `until`: ISO-8601 end. Default is now.
- `dimension`: mx_provider, sending_domain_id, tenant_id, cluster_id, sending_ip, or bounce_classification.
- `min_processed`: Hide rows below this processed count. Default is 1.
- `compare`: true adds a compare block for the previous window of the same length.
- `compare_since`: ISO-8601 start for an explicit compare window.
- `compare_until`: ISO-8601 end for an explicit compare window.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/analytics
```

```json response.json
{
  "dimension": "mx_provider",
  "window": {
    "since": "2026-09-15T12:00:00Z",
    "until": "2026-09-16T12:00:00Z"
  },
  "totals": {
    "processed": 10,
    "delivered": 8,
    "deferred": 1,
    "bounce": 1,
    "spamreport": 0,
    "unsubscribe": 0
  },
  "rows": [
    {
      "key": "gmail",
      "label": "gmail",
      "processed": 10,
      "delivered": 8,
      "deferred": 1,
      "bounce": 1,
      "spamreport": 0,
      "unsubscribe": 0
    }
  ]
}
```
