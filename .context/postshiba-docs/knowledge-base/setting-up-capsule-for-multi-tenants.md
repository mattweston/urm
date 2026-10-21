# Setting up PostShiba for multi-tenant apps

> One team, extra tenants, scoped domains and credentials.

Use one PostShiba team and create a tenant for each of your customers. Each tenant keeps its own sending domains, SMTP credentials, inboxes, suppressions, and webhooks, so one customer's problems stay with that customer.

## Before you start

- A cluster that is `sending_ready`.
- An API key. See [Create an API key](/docs/create-an-api-key).

## Set up a tenant

1. Create a tenant from **Tenants** in the dashboard, or with the [Tenants API](/docs/api-reference/tenants). Give it a slug you will recognize, such as `acme-florist`.
2. Add and verify the customer's sending domain under that tenant. See [Add and verify a domain](/docs/add-a-domain).
3. Issue an SMTP credential for the tenant on your cluster. REST sends need it too, because we pick the cluster from the tenant's live credentials.
4. Send with `tenant` set to the tenant's slug or id.

Your team also has a default tenant with the slug `default`. Sends without `tenant` use it. It is not listed on the **Tenants** page or in `GET /api/v1/teams/:team_id/tenants`, but you can fetch it by id.

## Send as a tenant

```bash send-as-tenant.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "hello@mail.example.com",
    "to": ["you@example.com"],
    "subject": "PostShiba test",
    "text": "hello from PostShiba",
    "tenant": "acme-florist"
  }' \
  https://app.postshiba.com/api/v1/emails
```

`tenant` decides which domains can be the `from` address and which suppression list applies. An unknown tenant returns `422` with `{"error": "invalid", "field": "tenant"}`.

## How the cluster is picked

| Request | Cluster used |
| --- | --- |
| `X-Capsule-Cluster-Id` header | That cluster, if your team owns it. |
| `tenant` and no header | The first sending-ready cluster where the tenant has a live SMTP credential. |
| Neither | The team's first sending-ready cluster. |

If no cluster fits, the send returns `403` with `cluster_not_ready`. More on routing is on [Sending](/docs/api-reference/sending).

## SMTP

Each SMTP credential belongs to one tenant, so SMTP sends use that tenant automatically. If the session asks for a different tenant than the credential's, AUTH fails with `tenant_mismatch`.

## Next steps

- [Tenants](/docs/dashboard/tenants/introduction)
- [Build an ESP on PostShiba](/docs/guides/build-an-esp)
- [Tenants API](/docs/api-reference/tenants)
- [Sending](/docs/api-reference/sending)
