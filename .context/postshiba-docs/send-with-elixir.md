# Send emails with Elixir

> Install the Elixir SDK from GitHub and call Emails.send.

## What you'll build

An Elixir script that sends a receipt email with the `postshiba` package and prints the queued message.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- Elixir 1.15 or later.

## Install

The package is on GitHub, not Hex. Add it to `deps/0` in `mix.exs`, then run `mix deps.get`.

```elixir mix.exs
{:postshiba, git: "https://github.com/postshiba/postshiba-elixir.git"}
```

## Send your first email

Create a client with your API key, then call `PostShiba.Emails.send/2` with a map. `PostShiba.new/3` also takes a base URL and a team id for team-scoped calls such as listing clusters.

```elixir send.exs
client = PostShiba.new("YOUR_API_KEY")

sent =
  PostShiba.Emails.send(client, %{
    "from" => "hello@mail.example.com",
    "to" => ["you@example.com"],
    "reply_to" => "support@example.com",
    "subject" => "Your receipt",
    "text" => "Thanks for your order.",
    "html" => "<p>Thanks for your order.</p>",
    "unique_args" => %{"order_id" => "ord_123"}
  })

IO.inspect(sent)
```

Run it from your project with `mix run send.exs`. `Emails.send` returns the decoded JSON body of the `201` response as a map, not an `{:ok, body}` tuple. The message then shows under Events in the dashboard.

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

Without a pin, PostShiba uses your first cluster that is ready to send. Pass `cluster_id` to choose one.

```elixir pin.exs
PostShiba.Emails.send(client, message, cluster_id: "NmQpXr")
```

## Attachments and templates

### Attach a file

Add `attachments` with `filename`, `content_type`, and base64 `content`. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```elixir attachment.exs
PostShiba.Emails.send(client, %{
  "from" => "hello@mail.example.com",
  "to" => ["you@example.com"],
  "subject" => "Your invoice",
  "text" => "Your invoice is attached.",
  "attachments" => [
    %{
      "filename" => "invoice.pdf",
      "content_type" => "application/pdf",
      "content" => Base.encode64(File.read!("invoice.pdf"))
    }
  ]
})
```

### Send a published template

Pass `template` with the alias or public id and its `variables`. Leave out `html` and `text`.

```elixir template.exs
PostShiba.Emails.send(client, %{
  "from" => "hello@mail.example.com",
  "to" => ["you@example.com"],
  "template" => %{"id" => "welcome", "variables" => %{"name" => "Ada"}}
})
```

## Troubleshooting

A response outside 2xx raises `PostShiba.Error` with `error`, `field`, and `message`. It does not return `{:error, reason}`.

```elixir errors.exs
try do
  PostShiba.Emails.send(client, message)
rescue
  e in PostShiba.Error ->
    IO.puts("#{e.error} #{e.field} #{e.message}")
    reraise e, __STACKTRACE__
end
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

- [Send emails with Phoenix](/docs/send-with-phoenix) to deliver through Swoosh.
- [Unique args](/docs/dashboard/emails/unique-args) to get your own ids back on delivery webhooks.
- [Managing webhooks](/docs/webhooks/introduction) to receive delivery events.
- [SDKs](/docs/sdks) for every language client.
