# How do capacity boosts work?

> A 24-hour outbound allowance on top of the monthly plan.

A capacity boost raises one cluster's outbound limits to a bigger plan's limits for exactly 24 hours, for a one-time price. Your monthly plan and subscription stay the same, and the limits return to the plan when the boost ends.

Capacity boosts are not turned on for every account. If the cluster page has no **Boost** option, boosts are not available on your account.

## What a boost changes

| Limit | During a boost |
| --- | --- |
| Emails per hour | Raised to the target plan's hourly limit |
| Emails per rolling 24 hours | Raised to the target plan's 24-hour limit |
| Inbound receiving | Unchanged. It follows your monthly plans. |
| Monthly price and plan | Unchanged |

On the API, `base_emails_per_hour` and `base_emails_per_day` show your plan. `emails_per_hour` and `emails_per_day` show the limits in force right now, including an active boost.

## What a boost does not change

- **Usage.** Starting, extending, or ending a boost does not reset what the cluster has already sent. If you sent more during the boost than the plan allows, sends wait until the plan's hourly or 24-hour limit has room again.
- **Billing model.** A boost is not a pack of email credits, and there are no per-email overages.
- **Account checks.** Production approval, suspensions, domain verification, and abuse controls apply to every send as usual.
- **Delivery at the destination.** A boost raises PostShiba's limits only. Mailbox providers still apply their own rate limits.

The boost ends at a fixed time. It does not depend on a background job running on time.

## Which plans can boost

| From | To |
| --- | --- |
| Micro | Small |
| Small | Medium or Large |
| Medium | Large |

Nano, Large, XL, and Burst have no boost. The price is fixed per boost and stored with it, so later price changes do not affect a boost you already bought.

What happens when a cluster reaches its limit is on [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap).

## Next steps

- [How do I buy a capacity boost?](/docs/knowledge-base/how-do-i-buy-a-capacity-boost)
- [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap)
- [Clusters API](/docs/api-reference/clusters)
