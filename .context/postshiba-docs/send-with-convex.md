# Send emails with Convex

> Install the Convex component and call sendEmail.

## What you'll build

A Convex mutation that enqueues a welcome email. The PostShiba component commits the email with your transaction, then delivers it from a background action with retries.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- Your team id and cluster id. Both are on the **API keys** page.

## Install

The component is on GitHub, not the npm registry.

```sh install.sh
npm install github:postshiba/postshiba-convex
```

## Send your first email

1. Register the component in `convex/convex.config.ts`.

```ts convex.config.ts
import { defineApp } from "convex/server"
import postshiba from "@postshiba/convex/convex.config"

const app = defineApp()
app.use(postshiba)

export default app
```

2. Create the client and call `sendEmail` from a mutation in `convex/email.ts`.

```ts email.ts
import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { PostShiba } from "@postshiba/convex"
import { components } from "./_generated/api"

export const postshiba = new PostShiba(components.postshiba, {
	apiKey: "YOUR_API_KEY",
	teamId: "KjkAJW",
	clusterId: "NmQpXr",
	testMode: false,
})

export const sendWelcome = mutation({
	args: { to: v.string() },
	returns: v.string(),
	handler: async (ctx, args) => {
		return await postshiba.sendEmail(ctx, {
			from: "hello@mail.example.com",
			to: args.to,
			subject: "Welcome",
			text: "Glad you are here.",
			html: "<p>Glad you are here.</p>",
		})
	},
})
```

Run it with `npx convex run email:sendWelcome '{"to": "you@example.com"}'`. `sendEmail` returns an `EmailId` once the email is stored as `queued`. Delivery happens after the mutation commits, and the message then shows under Events in the dashboard.

You can leave out `apiKey`, `teamId`, and `clusterId` and set `POSTSHIBA_API_KEY`, `POSTSHIBA_TEAM_ID`, and `POSTSHIBA_CLUSTER_ID` with `npx convex env set` instead.

Two options matter before you send for real:

| Option | Default | Why it matters |
| --- | --- | --- |
| `testMode` | `true` | While on, every recipient must be on `inbound.postshiba.com`. Set it to `false` to send to real addresses. |
| `hourlyLimit` | `25` | The component sends at most this many emails an hour. Raise it to just under your cluster's hourly capacity. |

## Attachments and templates

### Attach a file

Pass `attachments` with `filename`, `contentType`, and base64 `content`. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```ts attachment.ts
await postshiba.sendEmail(ctx, {
	from: "hello@mail.example.com",
	to: "you@example.com",
	subject: "Your photo",
	text: "See attached.",
	attachments: [
		{
			filename: "photo.png",
			contentType: "image/png",
			content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
		},
	],
})
```

### Send a published template

Pass `template` with the alias or public id and its `variables`. Leave out `html` and `text`.

```ts template.ts
await postshiba.sendEmail(ctx, {
	from: "hello@mail.example.com",
	to: "you@example.com",
	template: { id: "welcome", variables: { name: "Ada" } },
})
```

## Troubleshooting

Errors do not reach your mutation, because delivery runs later. Read the outcome with `postshiba.status(ctx, emailId)`, or subscribe to webhooks with `handleEventWebhook`.

| Status | `error` | What the component does |
| --- | --- | --- |
| `401` | `Invalid token or no user signed in` | Marks the email `failed` without retrying. Check `apiKey` or `POSTSHIBA_API_KEY`. |
| `403` | `forbidden`, `domain_unverified`, or `kyc_required` | Marks the email `failed`. Use a Full access key and a verified `from`. While your team is pending production approval, send only to team members, live inbox addresses, and inbox forward-to addresses. |
| `422` | `invalid` | Marks the email `failed`. `errorCode` and `errorMessage` on the email say why. |
| `429` | `throttled` | Retries with backoff, because the component owns the queue. Keep `hourlyLimit` under your cluster's capacity so this stays rare. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap). |

Every other status is on [Errors](/docs/api-reference/errors).

## Next steps

- [Verify webhook requests](/docs/webhooks/verify-webhooks-requests) before you route events to `handleEventWebhook`.
- [Event types](/docs/webhooks/event-types) to see which statuses the component can record.
- [Send emails with Node.js](/docs/send-with-nodejs) for the plain client.
- [SDKs](/docs/sdks) for every language client.
