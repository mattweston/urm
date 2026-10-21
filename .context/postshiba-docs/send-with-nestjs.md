# Send emails with NestJS

> Import PostShibaModule and call sendMail.

## What you'll build

A NestJS service that injects the PostShiba client and sends a welcome email with `sendMail`.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- Node.js 18 or later.

## Install

The Nest module ships in the Node package, which is on GitHub, not the npm registry.

```sh install.sh
npm install github:postshiba/postshiba-node
```

The package ships TypeScript source without a compiled build. Nest's default `tsc` build does not compile dependencies, so `node dist/main` cannot load `postshiba/nest` yet. Until a compiled build ships, bundle the package into your build, or call [`POST /api/v1/emails`](/docs/send-with-http) with `fetch` from your service.

## Send your first email

1. Register the module in `AppModule`. It provides a `PostShiba` client on the `POSTSHIBA` token. `teamId` is only needed for team-scoped calls such as listing clusters.

```ts app.module.ts
import { Module } from "@nestjs/common"
import { PostShibaModule } from "postshiba/nest"
import { MailService } from "./mail.service"

@Module({
	imports: [
		PostShibaModule.register({
			apiKey: "YOUR_API_KEY",
			teamId: "KjkAJW",
		}),
	],
	providers: [MailService],
})
export class AppModule {}
```

2. Inject `POSTSHIBA` into a service and call `sendMail`.

```ts send.ts
import { Inject, Injectable } from "@nestjs/common"
import { POSTSHIBA, sendMail } from "postshiba/nest"
import type { PostShiba } from "postshiba"

@Injectable()
export class MailService {
	constructor(@Inject(POSTSHIBA) private readonly postshiba: PostShiba) {}

	sendReceipt() {
		return sendMail(this.postshiba, {
			from: "hello@mail.example.com",
			to: "you@example.com",
			replyTo: "support@example.com",
			subject: "Your receipt",
			text: "Thanks for your order.",
			html: "<p>Thanks for your order.</p>",
			uniqueArgs: { order_id: "ord_123" },
		})
	}
}
```

Save it as `mail.service.ts`. `sendMail` resolves to the JSON body of the `201` response. The message then shows under Events in the dashboard.

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

`sendMail` uses your first cluster that is ready to send. To choose one, call the client directly with `clusterId`.

```ts pin.ts
await this.postshiba.emails.send(message, { clusterId: "NmQpXr" })
```

## Attachments and templates

### Attach a file

Pass `attachments` with `filename`, `content_type`, and base64 `content`. `sendMail` forwards them as they are. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```ts attachment.ts
import { readFile } from "node:fs/promises"

await sendMail(this.postshiba, {
	from: "hello@mail.example.com",
	to: "you@example.com",
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

`sendMail` does not take `template`. Call the client directly with the alias or public id and its `variables`.

```ts template.ts
await this.postshiba.emails.send({
	from: "hello@mail.example.com",
	to: ["you@example.com"],
	template: { id: "welcome", variables: { name: "Ada" } },
})
```

## Troubleshooting

A response outside 2xx rejects with `PostShibaError`, exported from `postshiba/nest`, with `error`, `field`, and `message`.

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

- [Send emails with Node.js](/docs/send-with-nodejs) for the plain client.
- [Unique args](/docs/dashboard/emails/unique-args) to get your own ids back on delivery webhooks.
- [Verify webhook requests](/docs/webhooks/verify-webhooks-requests) with `postshiba.webhooks.verify`.
- [SDKs](/docs/sdks) for every language client.
