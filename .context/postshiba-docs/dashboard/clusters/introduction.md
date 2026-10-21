# Clusters

> Why a send needs a named environment, and why transactional and bulk stay apart.

A cluster is a named sending environment with its own hourly and 24-hour capacity. Every send, SMTP credential, and delivery event belongs to one cluster. Customer clusters send from a shared IP.

## Before you start

- Add a payment method. Without one, **Add cluster** sends you to **Billing** first.
- Until your team has [production approval](/docs/knowledge-base/does-capsule-require-production-approval), you can have one live cluster. Creating another returns you to **Clusters** with an approval notice.
- Creating and changing clusters needs the Team Administrator role.

## Create a cluster

1. In the sidebar, open **Sending** → **Clusters**, then select **Add cluster**.
2. Enter a name. Use lowercase letters, numbers, and hyphens, with no spaces.
3. Under **Email type**, choose **Transactional** or **Marketing**.
4. Under **Volume**, drag the slider to your hourly volume, or select a plan icon. PostShiba picks the smallest plan that covers it.
5. Select **Add cluster**.

The cluster starts on the shared sending pool. Its SMTP host appears once the shared IP is attached. PostShiba also issues a first SMTP credential, which you can see under **Connect** on the cluster page.

## Transactional or marketing

The type is locked after create. Create another cluster when you need the other type.

| Dashboard choice | API `classification` | Use it for | Unsubscribe headers |
| --- | --- | --- | --- |
| Transactional | `transactional` | Receipts and resets | Not added |
| Marketing | `bulk` | Campaigns and newsletters | PostShiba adds one-click `List-Unsubscribe` |

**Marketing** is disabled when no shared marketing IP is free. See [How do recipients unsubscribe?](/docs/knowledge-base/how-do-recipients-unsubscribe) for when the header is added.

## Manage a cluster

Open a cluster from **Clusters**. The page shows traffic, capacity for the hour and the last 24 hours, and recent events.

| Control | What it does |
| --- | --- |
| **Send test** | Opens the test-send form. See [Send test emails](/docs/dashboard/emails/send-test-emails). |
| **Domains** | Opens your sending domains. |
| **Sending Guide** | Shows SMTP, HTTP, and REST recipes and framework guides for this cluster. |
| **Connect** | Lists and issues SMTP credentials. |
| **Resize** | Changes the plan. Upgrades bill the rest of the period now. Downgrades credit the next invoice. |
| **Advanced** → **Edit cluster** | Renames the cluster. |
| **Advanced** → **Suspend** or **Resume** | Pauses or restarts sending on the cluster. |
| **Advanced** → **Teardown** | Stops sending for good. The row stays for history. |

When capacity boosts are enabled for your account, **Boost** appears next to **Resize**. See [How do capacity boosts work?](/docs/knowledge-base/how-do-capacity-boosts-work).

Create fields, hosts, and teardown over the API are on [Clusters](/docs/api-reference/clusters). Extra IPs are on [How do dedicated IPs work?](/docs/knowledge-base/how-do-dedicated-ips-work).

## Next steps

- [Add and verify a domain](/docs/add-a-domain)
- [Send test emails](/docs/dashboard/emails/send-test-emails)
- [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap)
- [Clusters API](/docs/api-reference/clusters)
- [Network](/docs/api-reference/network)
