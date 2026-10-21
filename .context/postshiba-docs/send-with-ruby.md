# Send emails with Ruby

> Install the Ruby SDK from GitHub and call send_email.

## What you'll build

A Ruby script that sends a receipt email with the `postshiba` gem and prints the queued message.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- Ruby 3.1 or later.

## Install

The gem is on GitHub, not RubyGems. Add it to your `Gemfile`, then run `bundle install`.

```ruby Gemfile
gem "postshiba", git: "https://github.com/postshiba/postshiba-ruby.git"
```

## Send your first email

Pass your API key to `PostShiba.new`, then call `send_email` with a Hash. `team_id` is only needed for team-scoped calls such as listing clusters. It is on the **API keys** page.

```ruby send.rb
require "postshiba"

postshiba = PostShiba.new(api_key: "YOUR_API_KEY", team_id: "KjkAJW")

sent = postshiba.send_email({
  from: "hello@mail.example.com",
  to: ["you@example.com"],
  reply_to: "support@example.com",
  subject: "Your receipt",
  text: "Thanks for your order.",
  html: "<p>Thanks for your order.</p>",
  unique_args: {order_id: "ord_123"}
})
puts sent
```

Run it with `bundle exec ruby send.rb`. `send_email` returns the JSON body of the `201` response as a Hash with string keys. The message then shows under Events in the dashboard.

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

Without a pin, PostShiba uses your first cluster that is ready to send. Pass `cluster_id:` after the message Hash to choose one.

```ruby pin.rb
postshiba.send_email(message, cluster_id: "NmQpXr")
```

## Attachments and templates

### Attach a file

Add `attachments` with `filename`, `content_type`, and base64 `content`. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```ruby attachment.rb
require "base64"

postshiba.send_email({
  from: "hello@mail.example.com",
  to: ["you@example.com"],
  subject: "Your invoice",
  text: "Your invoice is attached.",
  attachments: [
    {filename: "invoice.pdf", content_type: "application/pdf", content: Base64.strict_encode64(File.binread("invoice.pdf"))}
  ]
})
```

### Send a published template

Pass `template` with the alias or public id and its `variables`. Leave out `html` and `text`.

```ruby template.rb
postshiba.send_email({
  from: "hello@mail.example.com",
  to: ["you@example.com"],
  template: {id: "welcome", variables: {name: "Ada"}}
})
```

## Troubleshooting

A response outside 2xx raises `PostShiba::Error`. `error` and `field` come from the JSON body, and `message` holds the explanation.

```ruby errors.rb
begin
  postshiba.send_email(message)
rescue PostShiba::Error => e
  warn [e.error, e.field, e.message].join(" ")
  raise
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

- [Send emails with Rails](/docs/send-with-rails) to deliver through Action Mailer.
- [Unique args](/docs/dashboard/emails/unique-args) to get your own ids back on delivery webhooks.
- [Managing webhooks](/docs/webhooks/introduction) to receive delivery events.
- [SDKs](/docs/sdks) for every language client.
