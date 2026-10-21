# Send emails with Rails

> Deliver with Action Mailer and delivery_method = :postshiba.

## What you'll build

An Action Mailer mailer that delivers through PostShiba instead of SMTP. Your existing mailers, views, and `deliver_later` jobs keep working.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- Ruby 3.1 or later.

## Install

The gem is on GitHub, not RubyGems. Add it to your `Gemfile`, then run `bundle install`. It registers the `:postshiba` delivery method with Action Mailer.

```ruby Gemfile
gem "postshiba", git: "https://github.com/postshiba/postshiba-ruby.git"
```

## Send your first email

This file sets the delivery method, defines a mailer, and sends one message. Run it with `bin/rails runner send.rb`.

```ruby send.rb
ActionMailer::Base.delivery_method = :postshiba
ActionMailer::Base.postshiba_settings = {api_key: "YOUR_API_KEY"}

class ReceiptMailer < ApplicationMailer
  def receipt
    headers["X-Capsule-Unique-Args"] = {order_id: "ord_123"}.to_json
    mail(
      from: "hello@mail.example.com",
      to: "you@example.com",
      reply_to: "support@example.com",
      subject: "Your receipt"
    ) do |format|
      format.text { render plain: "Thanks for your order." }
      format.html { render html: "<p>Thanks for your order.</p>".html_safe }
    end
  end
end

ReceiptMailer.receipt.deliver_now
```

The message then shows under Events in the dashboard. `deliver_now` returns the `Mail::Message`, not the API response.

The adapter turns `Reply-To` into `reply_to` and `X-Capsule-Unique-Args` into `unique_args` on the `POST /api/v1/emails` body. Other custom headers are sent as `headers`.

### Configure your app

In an app, set the delivery method once in `config/environments/production.rb` and keep the key in credentials.

```ruby production.rb
config.action_mailer.delivery_method = :postshiba
config.action_mailer.postshiba_settings = {
  api_key: Rails.application.credentials.dig(:postshiba, :api_key)
}
```

`postshiba_settings` also accepts `cluster_id`, `team_id`, and `base_url`.

### Pin a cluster

Without a pin, PostShiba uses your first cluster that is ready to send. Set `cluster_id` in `postshiba_settings`, or set `X-Capsule-Cluster-Id` on one message. The header wins and is sent as an HTTP header, not in the body.

```ruby pin_mailer.rb
mail(from: "hello@mail.example.com", to: "you@example.com", subject: "Your invoice")
  .tap { |message| message["X-Capsule-Cluster-Id"] = "NmQpXr" }
```

### Deliver in the background

Swap `deliver_now` for `deliver_later` and Active Job sends it from your queue.

```ruby deliver_later.rb
ReceiptMailer.receipt.deliver_later
```

## Attachments and templates

### Attach a file

Use Action Mailer's `attachments`. The adapter base64-encodes each file for the API. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```ruby receipt_mailer.rb
def receipt
  attachments["invoice.pdf"] = File.binread(Rails.root.join("tmp/invoice.pdf"))
  mail(from: "hello@mail.example.com", to: "you@example.com", subject: "Your invoice")
end
```

### Use a view

Put the HTML in `app/views/receipt_mailer/receipt.html.erb` and drop the `format` block. Action Mailer finds the view by method name. Hosted PostShiba templates go through the [Ruby client](/docs/send-with-ruby) with `template`, not through Action Mailer.

```erb receipt.html.erb
<p>Thanks for your order.</p>
```

## Troubleshooting

A failed send raises `PostShiba::Error` from `deliver_now` when `raise_delivery_errors` is on. `error` and `field` come from the JSON body.

| Status | `error` | What to do |
| --- | --- | --- |
| `401` | `Invalid token or no user signed in` | The API key is missing, mistyped, or deleted. Copy it again from **API keys**. |
| `403` | `forbidden` | Support keys cannot send. Use a Full access key. |
| `403` | `domain_unverified` | `from` is not on a verified domain. |
| `403` | `kyc_required` | Your team is pending production approval. Until then, send only to team members, live inbox addresses, and inbox forward-to addresses. |
| `422` | `invalid` | `field` names the problem, such as a missing `to` or a rejected attachment. |
| `429` | `throttled` | The cluster hit its hourly throttle or 24-hour cap. Retrying right away hits the same cap. If you use `deliver_later`, retry the job after the hour. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap). |
| `429` | `rate_limited` | More than 300 send requests in one minute on one API key. Slow down. |

Every other status is on [Errors](/docs/api-reference/errors).

## Next steps

- [Send emails with Ruby](/docs/send-with-ruby) for the plain client.
- [Unique args](/docs/dashboard/emails/unique-args) to get your own ids back on delivery webhooks.
- [Managing webhooks](/docs/webhooks/introduction) to receive delivery events.
- [SDKs](/docs/sdks) for every language client.
