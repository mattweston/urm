# Outbound retention

> How long PostShiba keeps copies of the messages it composes.

How many days PostShiba keeps a copy of each message it composes for the token's team and of each message the team's inboxes receive. 0 turns retention off; received mail then stays until the inbox webhook takes it, or for the inbox default. options lists every allowed value and its price per 1,000 stored messages in cents, which can be fractional. A change applies to messages sent or received after it. Only a key created by a Team Administrator can read or change it. Other keys get 404.

## GET /api/v1/teams/:obfuscated_team_id/outbound_retention

Get the team's outbound retention and the allowed values.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/outbound_retention
```

```json response.json
{
  "retention_days": 45,
  "options": [
    {
      "days": 0,
      "price_per_1000_cents": 0
    },
    {
      "days": 7,
      "price_per_1000_cents": 6.5
    },
    {
      "days": 28,
      "price_per_1000_cents": 6.5
    },
    {
      "days": 45,
      "price_per_1000_cents": 6.5
    },
    {
      "days": 90,
      "price_per_1000_cents": 6.5
    },
    {
      "days": 180,
      "price_per_1000_cents": 13
    },
    {
      "days": 365,
      "price_per_1000_cents": 26
    }
  ]
}
```

## PATCH /api/v1/teams/:obfuscated_team_id/outbound_retention

Set outbound_retention_days to one of the options. Any other value returns 422.

```bash request.sh
curl -sS -X PATCH \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"team":{"outbound_retention_days":45}}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/outbound_retention
```

```json response.json
{
  "retention_days": 45,
  "options": [
    {
      "days": 0,
      "price_per_1000_cents": 0
    },
    {
      "days": 7,
      "price_per_1000_cents": 6.5
    },
    {
      "days": 28,
      "price_per_1000_cents": 6.5
    },
    {
      "days": 45,
      "price_per_1000_cents": 6.5
    },
    {
      "days": 90,
      "price_per_1000_cents": 6.5
    },
    {
      "days": 180,
      "price_per_1000_cents": 13
    },
    {
      "days": 365,
      "price_per_1000_cents": 26
    }
  ]
}
```
