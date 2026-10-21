# Unique args

> Pass tracking fields that come back on delivery webhooks.

Unique args are your own key and value pairs, such as a campaign id or an account id. PostShiba attaches them to a send and returns them on every delivery webhook for that message.

## Set unique args

Each send path takes them in a different place. PostShiba reads the `X-Capsule-Unique-Args` header and strips it before the mail leaves, so recipients never see it.

| Send path | Where to put them |
| --- | --- |
| REST | `unique_args` object on the send body |
| SMTP | `X-Capsule-Unique-Args` header with a JSON object |
| HTTP inject | `X-Capsule-Unique-Args` in `content.headers` |
| Dashboard test send | **Unique args** under **More** |

```bash send-with-unique-args.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "hello@mail.example.com",
    "to": ["you@example.com"],
    "subject": "PostShiba test",
    "text": "hello from PostShiba",
    "unique_args": {"campaign_id": "cmp_123", "site": "docs"}
  }' \
  https://app.postshiba.com/api/v1/emails
```

The header value is the same object as JSON.

```json X-Capsule-Unique-Args.json
{
  "campaign_id": "cmp_123",
  "site": "docs"
}
```

## Limits

| Limit | Value |
| --- | --- |
| Keys | 32 at most |
| Key length | 64 bytes |
| Value length | 256 bytes |
| Value types | Scalars only (strings, numbers, booleans) |

The send still goes out when an arg breaks a limit. Keys past the 32nd, and keys or values that are too long, are left off the webhook events.

These keys are reserved because every event already carries them, and they are also left off: `event`, `email`, `timestamp`, `sg_event_id`, `sg_message_id`, `smtp-id`, and `tenant_id`. See [Event types](/docs/webhooks/event-types).

## Next steps

- [Managing webhooks](/docs/webhooks/introduction)
- [Event types](/docs/webhooks/event-types)
- [Custom headers](/docs/dashboard/emails/custom-headers)
- [Sending](/docs/api-reference/sending)
