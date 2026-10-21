# Send emails with Phoenix

> Set the Swoosh adapter to PostShiba.Swoosh.Adapter.

## What you'll build

A Swoosh mailer in your Phoenix app that delivers through PostShiba. Existing `Swoosh.Email` code keeps working.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- Elixir 1.15 or later.

## Install

The package is on GitHub, not Hex. Add it to `deps/0` in `mix.exs`, keep `:swoosh`, then run `mix deps.get`.

```elixir mix.exs
{:postshiba, git: "https://github.com/postshiba/postshiba-elixir.git"},
{:swoosh, "~> 1.17"}
```

## Send your first email

1. Point your mailer at the adapter in `config/runtime.exs` or `config/config.exs`. The adapter reads `:api_key`, and optionally `:base_url` and `:team_id`.

```elixir config.exs
config :my_app, MyApp.Mailer,
  adapter: PostShiba.Swoosh.Adapter,
  api_key: "YOUR_API_KEY"
```

2. Keep the mailer module Phoenix generated in `lib/my_app/mailer.ex`.

```elixir mailer.ex
defmodule MyApp.Mailer do
  use Swoosh.Mailer, otp_app: :my_app
end
```

3. Build a message and deliver it.

```elixir send.exs
import Swoosh.Email

new()
|> from("hello@mail.example.com")
|> to("you@example.com")
|> reply_to("support@example.com")
|> subject("Your receipt")
|> header("X-Capsule-Unique-Args", ~s({"order_id":"ord_123"}))
|> text_body("Thanks for your order.")
|> html_body("<p>Thanks for your order.</p>")
|> MyApp.Mailer.deliver()
|> IO.inspect()
```

Run it with `mix run send.exs`. `deliver/1` returns `{:ok, map}`, where the map is the JSON body of the `201` response. The message then shows under Events in the dashboard.

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

The adapter sends `X-Capsule-Unique-Args` as `unique_args`. It always uses your first cluster that is ready to send.

The adapter makes its own HTTP requests and ignores Swoosh's `:api_client`. If Swoosh fails to start because Hackney is missing, set `config :swoosh, :api_client, false`.

## Attachments and templates

### Attach a file

Use Swoosh's `attachment/2` with a path or a `Swoosh.Attachment`. The adapter base64-encodes each file for the API. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```elixir attachment.exs
import Swoosh.Email

new()
|> from("hello@mail.example.com")
|> to("you@example.com")
|> subject("Your invoice")
|> text_body("Your invoice is attached.")
|> attachment("priv/invoice.pdf")
|> MyApp.Mailer.deliver()
```

Hosted PostShiba templates go through the [Elixir client](/docs/send-with-elixir) with `template`, not through Swoosh.

## Troubleshooting

A failed send returns `{:error, %PostShiba.Error{}}` with `error`, `field`, and `message`.

| Status | `error` | What to do |
| --- | --- | --- |
| `401` | `Invalid token or no user signed in` | The API key is missing, mistyped, or deleted. Copy it again from **API keys**. |
| `403` | `forbidden` | Support keys cannot send. Use a Full access key. |
| `403` | `domain_unverified` | `from` is not on a verified domain. |
| `403` | `kyc_required` | Your team is pending production approval. Until then, send only to team members, live inbox addresses, and inbox forward-to addresses. |
| `422` | `invalid` | `field` names the problem, such as a missing `to` or a rejected attachment. |
| `429` | `throttled` | The cluster hit its hourly throttle or 24-hour cap. Retrying right away hits the same cap. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap). |
| `429` | `rate_limited` | More than 300 send requests in one minute on one API key. Slow down. |

Every other status is on [Errors](/docs/api-reference/errors).

## Next steps

- [Send emails with Elixir](/docs/send-with-elixir) for the plain client.
- [Unique args](/docs/dashboard/emails/unique-args) to get your own ids back on delivery webhooks.
- [Managing webhooks](/docs/webhooks/introduction) to receive delivery events.
- [SDKs](/docs/sdks) for every language client.
