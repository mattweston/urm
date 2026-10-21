# Managing webhooks

> Get delivery events POSTed to your server as a SendGrid Event Webhook array.

Add a delivery webhook and PostShiba POSTs an event to your URL each time a message is processed, delivered, deferred, bounced, dropped, reported as spam, or unsubscribed. The body uses the SendGrid Event Webhook format, so an existing SendGrid event handler can read it.

## Before you start

- A URL on the public internet that accepts `POST`. Production URLs must use `https`. Private and internal addresses are refused.
- For the API route, a Full access key from [Create an API key](/docs/create-an-api-key).

## Add an endpoint in the dashboard

1. Open **Webhooks** in the dashboard and click **Add endpoint**.
2. Enter the **URL**.
3. Pick a **Scope**. **Team** receives every event. **Cluster** or **Tenant** receives only events from that cluster or tenant.
4. Pick the **Event types**. New endpoints start with all seven emitted events. See [Event types](/docs/webhooks/event-types).
5. Save, then copy the **Signing secret** from the endpoint page. You need it to [verify requests](/docs/webhooks/verify-webhooks-requests).

The endpoint page also shows whether the URL is reachable and lists the 50 most recent deliveries with their status and last error.

## Add an endpoint with the API

```bash create-webhook.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"webhook_endpoint": {"url": "https://hooks.example.com/postshiba", "event_types": ["delivered", "bounce"]}}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/webhook_endpoints
```

The create response is the only API response besides show that includes `secret`. Store it with your other secrets. To limit the endpoint to one cluster or one tenant, add `cluster_id` or `tenant_id`. Set one or neither. Every endpoint action is on [Webhooks](/docs/api-reference/webhooks).

## What each request looks like

Each `POST` carries one event in a JSON array:

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` |
| `X-Capsule-Timestamp` | Unix time, as a string, when the request was signed. |
| `X-Capsule-Signature` | `sha256=` followed by the hex HMAC-SHA256 of `{timestamp}.{body}`. |

Return any `2xx` status to acknowledge the event. Anything else, including a redirect, a timeout, or a refused connection, counts as a failure and is retried. PostShiba waits up to 5 seconds to connect and 10 seconds for your response. See [Retries and replays](/docs/webhooks/retries-and-replays).

## Reachability checks

PostShiba sends a `HEAD` request to the URL when you add or change the endpoint, then every 5 minutes. Any status below `500`, including `405`, marks it **Up**. A `5xx`, a timeout, or a connection error marks it **Down**. The check only reports status. It does not pause deliveries.

## Next steps

- [Verify webhook requests](/docs/webhooks/verify-webhooks-requests)
- [Event types](/docs/webhooks/event-types)
- [Retries and replays](/docs/webhooks/retries-and-replays)
- [Forward webhooks to Amazon EventBridge](/docs/webhooks/eventbridge)
- [Webhooks API reference](/docs/api-reference/webhooks)
