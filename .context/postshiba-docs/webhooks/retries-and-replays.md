# Retries and replays

> How PostShiba retries a failed webhook, when it gives up, and how to send it again.

When your endpoint doesn't return a `2xx`, PostShiba retries the event on a fixed schedule. After the last attempt fails, the delivery is marked dead and you can replay it from the dashboard.

## Retry schedule

Each event gets up to six attempts. The first is sent right away.

| Attempt | Sent after the previous failure |
| --- | --- |
| 1 | Immediately |
| 2 | 5 minutes |
| 3 | 30 minutes |
| 4 | 2 hours |
| 5 | 8 hours |
| 6 | 24 hours |

Retries are picked up once a minute, so an attempt can land up to a minute after its scheduled time. If attempt 6 fails, the delivery is dead. That is about 35 hours after the first attempt.

A failure is any status outside `2xx`, a redirect, a timeout, a refused connection, or a URL that resolves to a private address. Each attempt is signed again with a new `X-Capsule-Timestamp`.

## Handle duplicates

Your server can receive the same event twice, for example when it handled the request but responded too late. Store `sg_event_id` and skip events you've already processed.

## Replay dead deliveries

1. Open **Webhooks** in the dashboard and select the endpoint.
2. Check **Recent deliveries** for rows marked `dead` and fix whatever was failing.
3. Click **Replay dead letters**.

Every dead delivery for that endpoint is queued again. A replayed delivery gets one more attempt. If that attempt fails, it goes straight back to dead.

The API has no replay action. Replays are dashboard only.

## When an endpoint keeps failing

After 8 failed attempts in a row, PostShiba stops creating deliveries for new events on that endpoint. Retries already scheduled still run. A successful retry or replay resets the count, and new events flow again.

Events skipped during that pause are not queued, so a replay does not send them. Read them from the [Events API](/docs/api-reference/events) instead.

If you disable an endpoint, or remove an event type from it, pending retries for it are dropped.

## Next steps

- [Managing webhooks](/docs/webhooks/introduction)
- [Verify webhook requests](/docs/webhooks/verify-webhooks-requests)
- [Webhooks API reference](/docs/api-reference/webhooks)
