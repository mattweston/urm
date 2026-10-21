# Send emails with Go

> Install the Go module from GitHub and call EmailsSend.

## What you'll build

A Go program that sends a receipt email with the `postshiba` module and prints the queued message.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- Go 1.22 or later.

## Install

Run this inside a Go module. Start one with `go mod init` if you need to.

```sh install.sh
go get github.com/postshiba/postshiba-go
```

## Send your first email

Pass your API key to `NewClient`, then call `EmailsSend` with a map. `WithTeamID` is only needed for team-scoped calls such as listing clusters. The team id is on the **API keys** page.

```go send.go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/postshiba/postshiba-go"
)

func main() {
	client := postshiba.NewClient("YOUR_API_KEY", postshiba.WithTeamID("KjkAJW"))

	sent, err := client.EmailsSend(context.Background(), map[string]any{
		"from":        "hello@mail.example.com",
		"to":          []string{"you@example.com"},
		"reply_to":    "support@example.com",
		"subject":     "Your receipt",
		"text":        "Thanks for your order.",
		"html":        "<p>Thanks for your order.</p>",
		"unique_args": map[string]any{"order_id": "ord_123"},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(sent)
}
```

Run it with `go run send.go`. `EmailsSend` returns `(any, error)`, and the value is the decoded JSON body of the `201` response. The message then shows under Events in the dashboard.

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

Without a pin, PostShiba uses your first cluster that is ready to send. Pass `SendOptions` with `ClusterID` to choose one.

```go pin.go
sent, err := client.EmailsSend(ctx, message, &postshiba.SendOptions{ClusterID: "NmQpXr"})
```

## Attachments and templates

### Attach a file

Add `attachments` with `filename`, `content_type`, and base64 `content`. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```go attachment.go
pdf, err := os.ReadFile("invoice.pdf")
if err != nil {
	log.Fatal(err)
}

_, err = client.EmailsSend(ctx, map[string]any{
	"from":    "hello@mail.example.com",
	"to":      []string{"you@example.com"},
	"subject": "Your invoice",
	"text":    "Your invoice is attached.",
	"attachments": []map[string]any{{
		"filename":     "invoice.pdf",
		"content_type": "application/pdf",
		"content":      base64.StdEncoding.EncodeToString(pdf),
	}},
})
```

### Send a published template

Pass `template` with the alias or public id and its `variables`. Leave out `html` and `text`.

```go template.go
_, err := client.EmailsSend(ctx, map[string]any{
	"from": "hello@mail.example.com",
	"to":   []string{"you@example.com"},
	"template": map[string]any{
		"id":        "welcome",
		"variables": map[string]any{"name": "Ada"},
	},
})
```

## Troubleshooting

A response outside 2xx returns a `*postshiba.Error`. `Err` holds the JSON `error` string, next to `Field` and `Message`.

```go errors.go
var apiErr *postshiba.Error
if errors.As(err, &apiErr) {
	log.Println(apiErr.Err, apiErr.Field, apiErr.Message)
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
- [Send emails with SMTP](/docs/send-with-smtp) if you already use `net/smtp`.
- [SDKs](/docs/sdks) for every language client.
