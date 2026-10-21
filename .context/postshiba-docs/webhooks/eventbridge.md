# Forward webhooks to Amazon EventBridge

> Verify the signature in a Lambda function, then put each event on an EventBridge bus.

Point a delivery webhook at a Lambda function URL. The function checks the signature, calls `PutEvents`, and your EventBridge rules route each event by type.

## Before you start

- An AWS account where you can create a Lambda function, a function URL, and an EventBridge bus.
- Access to **Webhooks** in the PostShiba dashboard, or a Full access API key.

## 1. Create the bus

Create an event bus in the same Region as the function. This guide names it `postshiba`.

## 2. Allow PutEvents

Add this statement to the function's execution role. Replace `REGION`, `ACCOUNT`, and the bus name.

```json policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "events:PutEvents",
      "Resource": "arn:aws:events:REGION:ACCOUNT:event-bus/postshiba"
    }
  ]
}
```

## 3. Write the function

Use the Node.js 22 runtime. Mark the package as a module so `index.js` can use `import`, and install the EventBridge client in the function directory.

```json package.json
{
  "type": "module"
}
```

```bash install.sh
npm install @aws-sdk/client-eventbridge
```

Set two environment variables on the function. `POSTSHIBA_WEBHOOK_SECRET` is the endpoint's signing secret, which you copy in step 5. `EVENT_BUS_NAME` is the bus name.

```javascript index.js
import { createHmac, timingSafeEqual } from "node:crypto"
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"

const client = new EventBridgeClient({})
const secret = process.env.POSTSHIBA_WEBHOOK_SECRET
const busName = process.env.EVENT_BUS_NAME

export const handler = async (event) => {
	if (event.requestContext?.http?.method === "HEAD") {
		return { statusCode: 204, body: "" }
	}

	const raw = event.isBase64Encoded
		? Buffer.from(event.body || "", "base64").toString("utf8")
		: event.body || ""
	const headers = event.headers || {}

	if (!verify(raw, headers["x-capsule-timestamp"], headers["x-capsule-signature"])) {
		return { statusCode: 401, body: "invalid signature" }
	}

	let batch
	try {
		batch = JSON.parse(raw)
	} catch {
		return { statusCode: 400, body: "invalid json" }
	}
	if (!Array.isArray(batch)) {
		return { statusCode: 400, body: "expected an array" }
	}

	for (let i = 0; i < batch.length; i += 10) {
		const result = await client.send(
			new PutEventsCommand({
				Entries: batch.slice(i, i + 10).map((item) => ({
					EventBusName: busName,
					Source: "postshiba",
					DetailType: String(item.event || "event"),
					Detail: JSON.stringify(item),
				})),
			}),
		)
		if (result.FailedEntryCount) {
			return { statusCode: 500, body: "put events failed" }
		}
	}

	return { statusCode: 204, body: "" }
}

function verify(raw, timestamp, signature) {
	if (!secret || !timestamp || !signature) return false
	const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex")
	const given = String(signature).replace(/^sha256=/, "")
	const a = Buffer.from(expected)
	const b = Buffer.from(given)
	if (a.length !== b.length) return false
	return timingSafeEqual(a, b)
}
```

What the function does:

- Answers `HEAD` with `204`. PostShiba sends `HEAD` to check the URL is reachable, without a signature.
- Verifies the signature over `{timestamp}.{raw body}` before parsing. See [Verify webhook requests](/docs/webhooks/verify-webhooks-requests).
- Puts events in batches of 10, the `PutEvents` limit.
- Returns `500` if any entry fails, so PostShiba retries. A retry sends the same event again, so use `sg_event_id` to drop duplicates downstream. See [Retries and replays](/docs/webhooks/retries-and-replays).

PostShiba waits 10 seconds for a response, so keep the function's work inside that.

## 4. Open a function URL

Create a function URL with auth type `NONE`, payload format version 2.0, and the buffered invoke mode. The signature check replaces IAM auth, and the function returns `401` when it fails. Copy the `https://` URL.

## 5. Create the webhook

1. In the PostShiba dashboard, open **Webhooks** and click **Add endpoint**. Or use the API from [Managing webhooks](/docs/webhooks/introduction).
2. Paste the function URL and pick the event types. See [Event types](/docs/webhooks/event-types).
3. Copy the **Signing secret** into the function's `POSTSHIBA_WEBHOOK_SECRET`.

## 6. Add a rule

On the `postshiba` bus, create a rule that matches source `postshiba`. Filter on the detail type to pick event names, such as `delivered` or `bounce`.

```json rule-pattern.json
{
  "source": ["postshiba"],
  "detail-type": ["bounce", "spamreport"]
}
```

`detail` is one event object. Its fields are listed on [Event types](/docs/webhooks/event-types).

Inbox webhooks use the same signature headers, keyed with the inbox's `webhook_secret`, so the same `verify` function works for received mail. Their body is different. See [Receiving webhooks](/docs/dashboard/receiving/create-receiving-webhook).

## Next steps

- [Verify webhook requests](/docs/webhooks/verify-webhooks-requests)
- [Retries and replays](/docs/webhooks/retries-and-replays)
- [Event types](/docs/webhooks/event-types)
- [Webhooks API reference](/docs/api-reference/webhooks)
