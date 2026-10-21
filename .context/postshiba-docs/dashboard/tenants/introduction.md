# Tenants

> Why extra tenants exist, and what they isolate.

A tenant is a namespace under your team. Extra tenants let a multi-customer app keep one customer's sending apart from another's.

## The default tenant

Every team has a default tenant with slug `default`. It does not appear on the **Tenants** page. Most teams send from it, with as many domains as they need. Customers who send as your domains can share it too, along with its suppression list and SMTP password.

Tenant choices appear on other forms (domains, inboxes, suppressions, and test sends) only once your team has at least one extra tenant.

## What an extra tenant isolates

Each extra tenant has its own:

- Sending domains. A domain belongs to one tenant.
- SMTP credentials. A credential can only send as its tenant's domains.
- Inboxes.
- Suppression list.
- Webhook endpoints.

Suspend a tenant to stop every domain on it. The rest of your team keeps sending.

## Add a tenant

1. In the sidebar, open **Sending** → **Tenants**, then select **Add tenant**.
2. Enter a **Name** and a **Slug**. The slug takes lowercase letters, numbers, and hyphens. You pass it as `tenant` on a send.
3. Select **Add tenant**.
4. On the tenant page, select **Add domain** to add its sending domains.
5. Select **Issue credential** to create an SMTP user for the tenant on a sending-ready cluster. Copy the password from the notice, because it is shown once.

Adding tenants needs the Team Administrator role.

## Suspend, resume, or remove a tenant

- **Suspend** pauses sending for every domain on the tenant. **Resume** turns it back on. If our abuse team paused the tenant, **Resume** is blocked. Open a support ticket instead.
- **Remove** deletes the tenant's SMTP users and moves its domains to the tenant you pick. You cannot remove the default tenant.

How to pass `tenant` on a send, and the errors that follow, are on [Setting up PostShiba for multi-tenant apps](/docs/knowledge-base/setting-up-capsule-for-multi-tenants). API routes are on [Tenants](/docs/api-reference/tenants).

## Next steps

- [Setting up PostShiba for multi-tenant apps](/docs/knowledge-base/setting-up-capsule-for-multi-tenants)
- [Build an ESP on PostShiba](/docs/guides/build-an-esp)
- [Tenants API](/docs/api-reference/tenants)
- [Managing API keys](/docs/dashboard/api-keys/introduction)
