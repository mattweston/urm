# Event types

> The seven delivery events PostShiba sends, and the fields on each one.

PostShiba emits seven event types. Each one arrives as an object in the SendGrid Event Webhook format.

## Emitted events

| `event` | When it fires |
| --- | --- |
| `processed` | PostShiba accepted the message for delivery. |
| `delivered` | The receiving server accepted the message. |
| `deferred` | The receiving server asked PostShiba to try again later. Delivery continues. |
| `bounce` | The message was not delivered. `type` says whether the address is bad (`bounce`) or the message was refused (`blocked`). |
| `dropped` | The message was rejected before it was sent. |
| `spamreport` | The recipient marked the message as spam. |
| `unsubscribe` | The recipient unsubscribed with the List-Unsubscribe link. See [How do recipients unsubscribe?](/docs/knowledge-base/how-do-recipients-unsubscribe) |

A new endpoint subscribes to all seven. An endpoint keeps the event types you saved, so an endpoint created before `unsubscribe` existed needs it ticked on its page in **Webhooks**.

An endpoint also accepts `open`, `click`, `group_unsubscribe`, and `group_resubscribe` in its event types, for compatibility with SendGrid settings. PostShiba never emits them. It does not track opens or clicks.

## Event fields

Fields with no value are left out of the object.

| Field | Description |
| --- | --- |
| `event` | One of the event types above. |
| `email` | Recipient address. |
| `timestamp` | Unix time the event happened. |
| `sg_event_id` | Unique event id, `capsule-{id}`. Use it to drop duplicates when a delivery is retried. |
| `sg_message_id` | PostShiba message id. |
| `smtp-id` | The message's `Message-ID` header, or `<{message_id}@capsule>` when it has none. |
| `response` | The receiving server's SMTP reply. When the server never answered, a plain sentence about the connection, such as `Timed out waiting for mx.example.com to respond.` |
| `reason` | On `deferred`, `bounce`, and `dropped`. The failure reason, usually the same text as `response`. |
| `status` | Enhanced status code, such as `5.1.1`, when the reply included one. |
| `attempt` | Delivery attempt count, as a string. |
| `bounce_classification` | On `deferred`, `bounce`, and `dropped`. The failure category. |
| `type` | On `bounce` only. `bounce` for a hard bounce, `blocked` otherwise. |
| `tenant_id` | Slug of the PostShiba tenant that sent the message. |
| `from` | `From` header, or the envelope sender when the header is missing. |
| `subject` | Subject. |
| `category` | From unique args or the `X-Category` header. |
| `campaign_id` | From unique args or the `X-Campaign-Id` header. |
| `ip` | The sending IP, or the receiving server's IP, when known. |
| `attribution` | On some `spamreport` events. `verified` or `inferred`, depending on how the complaint was matched to your message. |
| `unique_args` | The object you set at send time. Its keys are also copied onto the event. |

A unique arg is copied onto the event only when PostShiba hasn't already set that field. It always stays inside `unique_args`. `tenant_id` on the event is always the PostShiba tenant, so pass your own customer id under a key such as `account`. See [Unique args](/docs/dashboard/emails/unique-args).

## Example

```json events.json
[
  {
    "event": "delivered",
    "email": "you@example.com",
    "timestamp": 1790000000,
    "sg_event_id": "capsule-44",
    "sg_message_id": "abc@capsule.test",
    "smtp-id": "<abc@capsule.test>",
    "response": "250 2.0.0 OK",
    "tenant_id": "default",
    "from": "hello@mail.example.com",
    "subject": "PostShiba test",
    "campaign_id": "cmp_123",
    "site": "docs",
    "unique_args": {
      "campaign_id": "cmp_123",
      "site": "docs"
    }
  }
]
```

## Next steps

- [Verify webhook requests](/docs/webhooks/verify-webhooks-requests)
- [Unique args](/docs/dashboard/emails/unique-args)
- [Bounce explanations](/docs/support/bounce-explanations)
- [Webhooks API reference](/docs/api-reference/webhooks)
