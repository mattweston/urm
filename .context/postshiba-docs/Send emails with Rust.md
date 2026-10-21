# Send emails with Rust

> Install the Rust crate from GitHub and call emails().send.

## What you'll build

A Rust program that sends a receipt email with the `postshiba` crate and prints the queued message.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).

## Install

The crate is on GitHub, not crates.io. Add it and `serde_json` to `Cargo.toml`. The client is blocking, so no async runtime is needed.

```toml Cargo.toml
[dependencies]
postshiba = { git = "https://github.com/postshiba/postshiba-rust" }
serde_json = "1"
```

## Send your first email

Pass your API key to `Client::new`, then call `emails().send` with a `serde_json::Value`. `team_id` is only needed for team-scoped calls such as listing clusters. It is on the **API keys** page.

```rust send.rs
use postshiba::Client;
use serde_json::json;

fn main() -> Result<(), postshiba::Error> {
	let client = Client::new("YOUR_API_KEY").team_id("KjkAJW");

	let sent = client.emails().send(&json!({
		"from": "hello@mail.example.com",
		"to": ["you@example.com"],
		"reply_to": "support@example.com",
		"subject": "Your receipt",
		"text": "Thanks for your order.",
		"html": "<p>Thanks for your order.</p>",
		"unique_args": { "order_id": "ord_123" }
	}))?;

	println!("{sent}");
	Ok(())
}
```

Put this in `src/main.rs` and run `cargo run`. `emails().send` returns `Result<Value, Error>`, and the value is the JSON body of the `201` response. The message then shows under Events in the dashboard.

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

Without a pin, PostShiba uses your first cluster that is ready to send. Call `send_with` with your cluster id to choose one.

```rust pin.rs
client.emails().send_with(&message, "NmQpXr")?;
```

## Attachments and templates

### Attach a file

Add `attachments` with `filename`, `content_type`, and base64 `content`. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types. This sample uses the `base64` crate for encoding.

```rust attachment.rs
use base64::Engine;

let pdf = base64::engine::general_purpose::STANDARD.encode(std::fs::read("invoice.pdf").unwrap());

client.emails().send(&json!({
	"from": "hello@mail.example.com",
	"to": ["you@example.com"],
	"subject": "Your invoice",
	"text": "Your invoice is attached.",
	"attachments": [
		{ "filename": "invoice.pdf", "content_type": "application/pdf", "content": pdf }
	]
}))?;
```

### Send a published template

Pass `template` with the alias or public id and its `variables`. Leave out `html` and `text`.

```rust template.rs
client.emails().send(&json!({
	"from": "hello@mail.example.com",
	"to": ["you@example.com"],
	"template": { "id": "welcome", "variables": { "name": "Ada" } }
}))?;
```

## Troubleshooting

A response outside 2xx returns `postshiba::Error`, a struct with `error` and `field` as `Option<String>` and `message` as `String`.

```rust errors.rs
if let Err(err) = client.emails().send(&message) {
	eprintln!("{:?} {:?} {}", err.error, err.field, err.message);
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

- [Unique args](/docs/dashboard/emails/unique-args) to get your own ids back on delivery webhooks.
- [Managing webhooks](/docs/webhooks/introduction) to receive delivery events.
- [Send emails with SMTP](/docs/send-with-smtp) if you already use `lettre`.
- [SDKs](/docs/sdks) for every language client.
