# REST API

> Bearer tokens, team isolation, and OpenAPI.

The PostShiba REST API covers the same resources as the dashboard, including clusters, domains, tenants, inboxes, webhooks, templates, and sending. It takes JSON and returns JSON.

## Base URL

```text base-url.txt
https://app.postshiba.com/api/v1
```

The OpenAPI spec is at [`/api/v1/openapi.yaml`](/api/v1/openapi.yaml). Language clients are on [SDKs](/docs/sdks). This reference uses curl.

## Authentication

Send an API key as a Bearer token on every request. Each key belongs to one team and can only see that team's data. See [Create an API key](/docs/create-an-api-key).

```bash whoami.sh
curl -sS \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/users/me
```

A missing or invalid key returns `401`. A Support key can call only `GET /users/me` and the recipient, analytics, status, events, and suppression endpoints. Anything else returns `403` `forbidden`.

## Ids

Ids are short public strings such as `KjkAJW`, never database numbers. Team-scoped paths take your team id, for example `/api/v1/teams/{team_id}/clusters`. Copy the team id and cluster ids from **API keys** in the dashboard.

A team id that doesn't match the key returns `404` `team_mismatch`. A record that doesn't exist, or belongs to another team, returns `404`.

## Request bodies

Most create and update requests wrap fields in the resource name, such as `{"cluster": {...}}` or `{"sending_domain": {...}}`. Send, network, and suppression import requests take a flat body. Each endpoint's example shows its shape.

Send `Content-Type: application/json` with every request that has a body.

## Lists

Most lists return every matching row. Events and inbound messages return the newest 200 rows after filters. Suppressions are cursor-paginated. Pass the last id you saw as `after`, and set `limit` up to 1000. The default `limit` is 100.

## Rate limits

Each API key has these budgets:

| Requests | Limit |
| --- | --- |
| `POST /emails` and `POST /sends` | 300 per minute |
| Creating SMTP credentials, inboxes, and sending domains, and running domain or inbox verification | 60 per hour |
| Suppression imports | 60 per hour |
| MCP requests | 600 per minute |

All of a team's API keys also share one send budget of 600 per minute across `POST /emails` and `POST /sends`. A send request body over 36 MB returns `413` `{"error": "payload_too_large", "field": "body"}`.

Going over returns `429` `{"error": "rate_limited"}`. Cluster sending capacity is separate. A send over your cluster's hourly or 24-hour cap returns `429` `{"error": "throttled"}`. See [Errors](/docs/api-reference/errors) and [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap).

## Next steps

- [Authentication](/docs/api-reference/authentication)
- [Sending](/docs/api-reference/sending)
- [Errors](/docs/api-reference/errors)
- [Connect MCP](/docs/connect-mcp)
