# Send emails with Node.js

> Install the Node SDK from GitHub and call emails.send.

## What you'll build

A Node.js script that sends a receipt email with the `postshiba` client and logs the queued message.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- Node.js 18 or later.

## Install

The package is on GitHub, not the npm registry. It ships TypeScript source without a compiled build, so run it with [tsx](https://tsx.is) or a bundler. Plain `node` stops with `ERR_UNKNOWN_FILE_EXTENSION`.

```sh install.sh
npm install github:postshiba/postshiba-node
npm install --save-dev tsx
```

## Send your first email

Pass your API key to `PostShiba`, then call `emails.send`. `teamId` is only needed for team-scoped calls such as listing clusters. It is on the **API keys** page.

```javascript send.js
import { PostShiba } from "postshiba"

const postshiba = new PostShiba("YOUR_API_KEY", { teamId: "KjkAJW" })

const sent = await postshiba.emails.send({
	from: "hello@mail.example.com",
	to: ["you@example.com"],
	reply_to: "support@example.com",
	subject: "Your receipt",
	text: "Thanks for your order.",
	html: "<p>Thanks for your order.</p>",
	unique_args: { order_id: "ord_123" },
})

console.log(sent)
```

The file uses `import` and top-level `await`, so set `"type": "module"` in `package.json`, then run `npx tsx send.js`. `emails.send` resolves to the JSON body of the `201` response. The message then shows under Events in the dashboard.

```json response.json
{
  "queued": true,
  "message_id": "abc@capsule.test",
  "from": "hello@mail.example.com",
  "to": ["you@example.com"],
  "subject": "Your receipt",
  "unique_args": {"order_id": "ord_123"}
}
```

### Pin a cluster

Without a pin, PostShiba uses your first cluster that is ready to send. Pass `clusterId` to choose one.

```javascript pin.js
await postshiba.emails.send(message, { clusterId: "NmQpXr" })
```

## Attachments and templates

### Attach a file

Add `attachments` with `filename`, `content_type`, and base64 `content`. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```javascript attachment.js
import { readFile } from "node:fs/promises"

await postshiba.emails.send({
	from: "hello@mail.example.com",
	to: ["you@example.com"],
	subject: "Your invoice",
	text: "Your invoice is attached.",
	attachments: [
		{
			filename: "invoice.pdf",
			content_type: "application/pdf",
			content: (await readFile("invoice.pdf")).toString("base64"),
		},
	],
})
```

### Send a published template

Pass `template` with the alias or public id and its `variables`. Leave out `html` and `text`.

```javascript template.js
await postshiba.emails.send({
	from: "hello@mail.example.com",
	to: ["you@example.com"],
	template: { id: "welcome", variables: { name: "Ada" } },
})
```

## Troubleshooting

A response outside 2xx throws `PostShibaError` with `error`, `field`, and `message` from the JSON body.

```javascript errors.js
import { PostShibaError } from "postshiba"

try {
	await postshiba.emails.send(message)
} catch (err) {
	if (err instanceof PostShibaError) {
		console.error(err.error, err.field, err.message)
	}
	throw err
}
```

| Status | `error` | What to do |
| --- | --- | --- |
| `401` | `Invalid token or no user signed in` | The API key is missing, mistyped, or deleted. Copy it again from **API keys**. |
| `403` | `forbidden` | Support keys cannot send. Use a Full access key. |
| `403` | `domain_unverified` | `from` is not on a verified domain. |
| `403` | `kyc_required` | Your team is pending production approval. Until then, send only to team members, live inbox addresses, and inbox forward-to addresses. |
| `422` | `invalid` | `field` names the problem, such as a missing `to`, an unpublished template, or a rejected attachment. |
| `429` | `throttled` | The cluster hit its hourly throttle or 24-hour cap. The client does not retry, and retrying right away hits the same cap. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap). |
| `429` | `rate_limited` | More than 300 send requests in one minute on one API key. Slow down. |

Every other status is on [Errors](/docs/api-reference/errors).

## Next steps

- [Send emails with NestJS](/docs/send-with-nestjs), [Convex](/docs/send-with-convex), [Inngest](/docs/send-with-inngest), or [Trigger.dev](/docs/send-with-trigger) if you use one of them.
- [Unique args](/docs/dashboard/emails/unique-args) to get your own ids back on delivery webhooks.
- [Verify webhook requests](/docs/webhooks/verify-webhooks-requests) with `postshiba.webhooks.verify`.
- [SDKs](/docs/sdks) for every language client.
