# Managing API keys

> How to mint a Full or Support key for one team.

An API key is a Bearer token for the REST API, the SDKs, and [MCP](/docs/connect-mcp). Each key belongs to one team and has a fixed access level.

## Before you start

- You need the Team Administrator role to create or delete a key. Other roles can open the page, but they cannot see tokens.
- If you belong to one team and it has no cluster yet, **API keys** is hidden from the sidebar. [Create a cluster](/docs/dashboard/clusters/introduction) first.

## Create a key

1. Select **API keys** in the sidebar.
2. Select **Create API key**.
3. Enter a **Name**. Leave it blank to use `API key`.
4. Under **Access**, choose **Full access** or **Support**.
5. Select **Create API key**.
6. Copy the **Bearer token** from the key's row, or open the key and copy it there.

The access level cannot change after you create the key. To switch, create a new key and delete the old one.

| Access | What the key can do |
| --- | --- |
| Full access | Clusters, credentials, and sending. Every endpoint in the [API reference](/docs/api-reference/introduction). |
| Support | Recipient lookup, analytics, status, and suppressions. See [Create a Support key](/docs/support/create-a-support-key). |

## Use the key

Send the token in the `Authorization` header.

```bash whoami.sh
curl -sS -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/users/me
```

The key only works for its own team. [Create an API key](/docs/create-an-api-key) shows the full response.

## Find your team and cluster ids

The **API keys** page also lists your **Team id** and the **Cluster id** of each live cluster. Select an id to copy it.

| Id | Where it goes |
| --- | --- |
| Team id | `/api/v1/teams/…` paths and the SDK team id. |
| Cluster id | `/clusters/…` paths and the `X-Capsule-Cluster-Id` header. |

A team id in the path that does not match the token's team returns `404` `team_mismatch`. See [Errors](/docs/api-reference/errors).

## Delete a key

Select **Delete** on the key's row, then confirm. Anything that uses the key stops working.

## Next steps

- [Create an API key](/docs/create-an-api-key)
- [Create a Support key](/docs/support/create-a-support-key)
- [Connect MCP](/docs/connect-mcp)
- [Authentication](/docs/api-reference/authentication)
