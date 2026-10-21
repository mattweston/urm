# Choose a send path

> Pick SMTP, HTTP inject, or the REST API for your first send.

PostShiba accepts mail three ways. All three send from the same clusters, apply the same suppressions and firewall, and report the same delivery events.

## Before you start

- A cluster that shows `sending_ready`. See [Clusters](/docs/dashboard/clusters/introduction).
- A verified domain. See [Add and verify a domain](/docs/add-a-domain).

## Compare the paths

| | SMTP | HTTP inject | REST API |
| --- | --- | --- | --- |
| Endpoint | The cluster's SMTP host, port 587 | `POST {http_endpoint}/api/inject/v1` on the cluster | `POST /api/v1/emails` |
| Auth | SMTP username and password, AUTH PLAIN after STARTTLS | The same username and password as HTTP Basic | API key as a Bearer token |
| Body | Your own MIME message | Raw MIME, or text, HTML, headers, and attachments as JSON | JSON fields. PostShiba composes the message |
| Hosted templates | No | No | Yes |
| At your cluster's cap | Messages wait in the queue | `429` with `hourly send limit reached` or `daily send limit reached` | `429` `throttled` |
| Best for | Existing mail libraries and high volume | High volume from code, without an SMTP client | Lower-volume transactional sends and templates |

For high-volume sending, use SMTP or HTTP inject. The REST API also has a limit of 300 send requests per minute per API key. See [REST API](/docs/api-reference/introduction).

## Send with the REST API

```bash send.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"from": "hello@mail.example.com", "to": ["you@example.com"], "subject": "Hello from PostShiba", "text": "It works.", "unique_args": {"order_id": "1234"}}' \
  https://app.postshiba.com/api/v1/emails
```

```json send-response.json
{
  "queued": true,
  "message_id": "abc@capsule.test",
  "from": "hello@mail.example.com",
  "to": ["you@example.com"],
  "subject": "Hello from PostShiba",
  "unique_args": {"order_id": "1234"}
}
```

`unique_args` comes back on every delivery event for this message. See [Unique args](/docs/dashboard/emails/unique-args).

`from` is Optional. Send from any address on a verified domain. If you leave `from` blank, PostShiba uses `hello@` on the sending tenant's first sending-ready domain. See [Sender email addresses](/docs/knowledge-base/how-do-i-create-an-email-address).

`POST /api/v1/emails` picks a sending-ready cluster for you. To choose one, set the `X-Capsule-Cluster-Id` header. Every field is on [Sending](/docs/api-reference/sending).

## Step-by-step guides

- [Send emails with SMTP](/docs/send-with-smtp)
- [Send emails with HTTP](/docs/send-with-http)
- [SDKs](/docs/sdks) for Node.js, Python, Ruby, PHP, Go, and more

## Next steps

- [Sending emails](/docs/dashboard/emails/introduction)
- [Send with a template](/docs/dashboard/templates/send-with-a-template)
- [Attachments](/docs/dashboard/emails/attachments)
- [Unique args](/docs/dashboard/emails/unique-args)
- [Email firewall](/docs/dashboard/emails/email-firewall)
