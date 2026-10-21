# Send emails with Inngest

> Install the Inngest adapter and call sendEmail inside step.run.

## What you'll build

An Inngest function that sends a welcome email when a user signs up. The adapter runs the send as a step, so Inngest retries it and replays never send twice.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- Your team id and cluster id. Both are on the **API keys** page.
- Node.js 18 or later.

## Install

The adapter is on GitHub, not the npm registry. Install it with `inngest`.

```sh install.sh
npm install github:postshiba/postshiba-inngest inngest
```

The package ships TypeScript source without a compiled build. Your app's bundler must compile it. In Next.js, add `@postshiba/inngest` to `transpilePackages`. Plain `node` cannot load it.

## Send your first email

Call `sendEmail` with the function's `step`, your config, and the message. Pass `idempotencyKey` from `event.id` so a replayed step does not send twice.

```ts send.ts
import { Inngest } from "inngest"
import { sendEmail } from "@postshiba/inngest"

const inngest = new Inngest({ id: "app" })

export const sendWelcome = inngest.createFunction(
	{ id: "send-welcome" },
	{ event: "app/user.created" },
	async ({ event, step }) => {
		return await sendEmail(
			step,
			{
				apiKey: "YOUR_API_KEY",
				teamId: "KjkAJW",
				clusterId: "NmQpXr",
			},
			{
				from: "hello@mail.example.com",
				to: [event.data.email],
				subject: "Welcome",
				text: "Glad you are here.",
				idempotencyKey: event.id,
			},
		)
	},
)
```

Serve the function with your Inngest handler, then send an `app/user.created` event. `sendEmail` runs a step named `postshiba-send` and returns `{ queued, messageId }`. The message then shows under Events in the dashboard.

`clusterId` is required. The adapter posts to `POST /api/v1/teams/:team_id/clusters/:cluster_id/sends` with an `Idempotency-Key` header.

## Attachments and templates

### Attach a file

Pass `attachments` with `filename`, `contentType`, and base64 `content`. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```ts attachment.ts
await sendEmail(step, config, {
	from: "hello@mail.example.com",
	to: [event.data.email],
	subject: "Your photo",
	text: "See attached.",
	attachments: [
		{
			filename: "photo.png",
			contentType: "image/png",
			content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
		},
	],
	idempotencyKey: event.id,
})
```

### Send a published template

Pass `template` with the alias or public id and its `variables`. Leave out `html` and `text`.

```ts template.ts
await sendEmail(step, config, {
	from: "hello@mail.example.com",
	to: [event.data.email],
	template: { id: "welcome", variables: { name: event.data.name } },
	idempotencyKey: event.id,
})
```

## Troubleshooting

The adapter maps API errors onto Inngest errors before they leave the step. `PostShibaHttpError` carries `status`, `code`, and `retryable`.

| Status | `error` | What the adapter does |
| --- | --- | --- |
| `401` | `Invalid token or no user signed in` | Throws `NonRetriableError`. Check the API key. |
| `403` | `forbidden`, `domain_unverified`, or `kyc_required` | Throws `NonRetriableError`. Use a Full access key and a verified `from`. While your team is pending production approval, send only to team members, live inbox addresses, and inbox forward-to addresses. |
| `409` | `idempotency_conflict` | Throws `NonRetriableError`. The same `idempotencyKey` was used with a different message. |
| `422` | `invalid` | Throws `NonRetriableError`. `code` and the error message say which field. |
| `429` | `throttled` | Throws `RetryAfterError`, and Inngest waits one hour before the next attempt. Do not send the same message from another system in that window. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap). |

Every other status is on [Errors](/docs/api-reference/errors).

## Next steps

- [Verify webhook requests](/docs/webhooks/verify-webhooks-requests), or use the adapter's `handleWebhook` to turn delivery events into `postshiba/email.event` Inngest events.
- [Unique args](/docs/dashboard/emails/unique-args) to get your own ids back on delivery webhooks.
- [Send emails with Node.js](/docs/send-with-nodejs) for the plain client.
- [SDKs](/docs/sdks) for every language client.
