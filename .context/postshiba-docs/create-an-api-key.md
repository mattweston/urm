# Create an API key

> Create a Bearer token in the dashboard and make your first authenticated request.

An API key authenticates REST and MCP requests for one team. SMTP and HTTP inject use cluster credentials instead. See [SMTP credentials](/docs/api-reference/smtp-credentials).

## Before you start

You need the Team Administrator role to create or delete a key. See [Team roles](/docs/support/roles).

## Create the key

1. In the dashboard, open **API keys** and click **Create API key**.
2. Enter a **Name** so you can tell keys apart later.
3. Choose the **Access** level. You can't change it after the key is created.
4. Save, then copy the **Bearer token**.

| Access | What it can do |
| --- | --- |
| Full access | Everything in the REST API: clusters, domains, credentials, inboxes, webhooks, and sending. |
| Support | Look up a recipient, read analytics, status, events, and suppressions, and remove a suppression. Nothing else. See [Create a Support key](/docs/support/create-a-support-key). |

The **API keys** page also shows your team id. Use it in paths such as `/api/v1/teams/{team_id}/clusters`.

## Test the key

Send the key in the `Authorization` header. This request returns the user the key belongs to.

```bash whoami.sh
curl -sS \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/users/me
```

```json whoami-response.json
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

A missing or revoked key returns `401`. Keep keys on your server. Anyone with the token can act on your team.

## Delete a key

Click **Delete** next to the key on **API keys**. Anything using it stops working straight away.

## Next steps

- [Add and verify a domain](/docs/add-a-domain)
- [Connect MCP](/docs/connect-mcp)
- [Authentication](/docs/api-reference/authentication)
- [Managing API keys](/docs/dashboard/api-keys/introduction)
