# What happens at your cap

> Every send path refuses the message. The dashboard and an admin email tell you.

Each cluster has an hourly cap and a rolling 24-hour cap. This page covers what each send path does when a cap is full, how PostShiba tells you, and how to raise it.

## The two caps

| Cap | API field | Window |
| --- | --- | --- |
| Hourly throttle | `emails_per_hour` | The current hour |
| 24-hour cap | `emails_per_day` | The last 24 hours, rolling |

Both come from the cluster's plan. An active [capacity boost](/docs/knowledge-base/how-do-capacity-boosts-work) raises them for its 24 hours. Use the **Hour** and **24h** toggle on the cluster page to see how much of each is used.

## What each send path does

| Send path | When either cap is full |
| --- | --- |
| SMTP | Returns `451 4.7.0 hourly send limit reached`, or `451 4.7.0 daily send limit reached` at the 24-hour cap, and does not keep the message. Mail servers retry a `451` on their own. Most app libraries raise an error, so retry once the cap has room. |
| HTTP inject | Returns `429 hourly send limit reached`, or `429 daily send limit reached` at the 24-hour cap. |
| REST `POST /api/v1/emails` and `POST /sends` | Returns `429` `throttled`. |

A REST rejection looks like this.

```json response.json
{
  "error": "throttled",
  "field": "base",
  "message": "This cluster hit its hourly send limit"
}
```

When the 24-hour cap is the one that is full, the message reads `This cluster hit its 24-hour send limit`. Retrying right away hits the same cap. Other error strings are on [Errors](/docs/api-reference/errors).

## How you find out

- An amber banner runs across the top of every dashboard page for that cluster. It names the cluster, the hourly cap, and how many messages are scheduled and ready.
- Team Administrators see **Change plan** on the banner. When capacity boosts are enabled, they also see **Boost**.
- Team Administrators and the billing contact get an email with a link to the cluster, at most once an hour.

## Raise the cap

- Select **Resize** on the cluster page to move to a larger plan. See [Clusters](/docs/dashboard/clusters/introduction).
- If capacity boosts are enabled for your account, buy a 24-hour boost. A boost does not change the monthly plan. See [How do I buy a capacity boost?](/docs/knowledge-base/how-do-i-buy-a-capacity-boost).

## Next steps

- [Why did sending stop?](/docs/support/why-did-sending-stop)
- [How do capacity boosts work?](/docs/knowledge-base/how-do-capacity-boosts-work)
- [Clusters](/docs/dashboard/clusters/introduction)
- [Errors](/docs/api-reference/errors)
