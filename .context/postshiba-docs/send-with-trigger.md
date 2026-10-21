# Send emails with Trigger.dev

> Install the Trigger.dev adapter and call sendEmail from a task.

## What you'll build

A Trigger.dev task that sends a welcome email. The adapter tells Trigger.dev which errors to retry, and when.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- Your team id and cluster id. Both are on the **API keys** page.
- Node.js 18 or later.

## Install

The adapter is on GitHub, not the npm registry. Install it with `@trigger.dev/sdk`.

```sh install.sh
npm install github:postshiba/postshiba-trigger @trigger.dev/sdk
```

## Send your first email

Define a task that calls `sendEmail`. Use `defaultRetry` and put `catchPostShibaError` on `catchError`. Pass a stable `idempotencyKey` so a retried run does not send twice.

```ts send.ts
import { task } from "@trigger.dev/sdk"
import { catchPostShibaError, defaultRetry, sendEmail } from "@postshiba/trigger"

export const sendWelcome = task({
	id: "send-welcome",
	retry: defaultRetry,
	catchError: async ({ error }) => catchPostShibaError(error),
	run: async (payload: { to: string; id: string }) => {
		return await sendEmail(
			{
				apiKey: "YOUR_API_KEY",
				teamId: "KjkAJW",
				clusterId: "NmQpXr",
			},
			{
				from: "hello@mail.example.com",
				to: [payload.to],
				subject: "Welcome",
				text: "Glad you are here.",
				idempotencyKey: payload.id,
			},
		)
	},
})
```

Trigger the task with `{ to: "you@example.com", id: "user_123" }`. `sendEmail` returns `{ queued, messageId }`. The message then shows under Events in the dashboard.

`clusterId` is required. The adapter posts to `POST /api/v1/teams/:team_id/clusters/:cluster_id/sends` with an `Idempotency-Key` header.

## Attachments and templates

### Attach a file

Pass `attachments` with `filename`, `contentType`, and base64 `content`. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```ts attachment.ts
await sendEmail(config, {
	from: "hello@mail.example.com",
	to: [payload.to],
	subject: "Your photo",
	text: "See attached.",
	attachments: [
		{
			filename: "photo.png",
			contentType: "image/png",
			content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
		},
	],
	idempotencyKey: payload.id,
})
```

### Send a published template

Pass `template` with the alias or public id and its `variables`. Leave out `html` and `text`.

```ts template.ts
await sendEmail(config, {
	from: "hello@mail.example.com",
	to: [payload.to],
	template: { id: "welcome", variables: { name: payload.name } },
	idempotencyKey: payload.id,
})
```

## Troubleshooting

A response outside 2xx throws `PostShibaHttpError` with `status`, `code`, and `retryable`. Permanent errors become `AbortTaskRunError`.

| Status | `error` | What the adapter does |
| --- | --- | --- |
| `401` | `Invalid token or no user signed in` | Stops the run without retrying. Check the API key. |
| `403` | `forbidden`, `domain_unverified`, or `kyc_required` | Stops the run. Use a Full access key and a verified `from`. While your team is pending production approval, send only to team members, live inbox addresses, and inbox forward-to addresses. |
| `409` | `idempotency_conflict` | Stops the run. The same `idempotencyKey` was used with a different message. |
| `422` | `invalid` | Stops the run. `code` and the error message say which field. |
| `429` | `throttled` | `catchPostShibaError` schedules the retry for the start of the next UTC hour. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap). |

Every other status is on [Errors](/docs/api-reference/errors).

## Next steps

- [Verify webhook requests](/docs/webhooks/verify-webhooks-requests), or use the adapter's `handleWebhook` to trigger a task for each delivery event.
- [Unique args](/docs/dashboard/emails/unique-args) to get your own ids back on delivery webhooks.
- [Send emails with Node.js](/docs/send-with-nodejs) for the plain client.
- [SDKs](/docs/sdks) for every language client.
