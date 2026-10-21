# Inbound messages

> Received messages for one inbox, with raw MIME and attachments.

Messages an inbox has received and not yet purged, newest first, up to 200. The list omits raw and each attachment's content_base64. Show includes both. On a webhook inbox, raw and content_base64 are null after the webhook delivers or gives up, and the attachment download then returns 410. You can also download one attachment as a file by its 1-based position in the attachments array. drain_status is pending, stored, retrying, delivered, or dead. thread_id comes from the plus tag, else In-Reply-To, References, or Message-ID. expires_at is when the message is purged. authentication carries the SPF, DKIM, DMARC, and ARC results PostShiba measured on receipt. Use it instead of any Authentication-Results header inside raw, which the sender controls. A token whose user is not a team admin gets the same view as a non-admin in the dashboard: digits in subject, text, and html are masked, raw and content_base64 are null, and the attachment download returns 404.

## GET /api/v1/inboxes/:inbox_id/inbound_messages

List alive messages for a live inbox.

- `inbox_id`: Public inbox id

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/inboxes/:inbox_id/inbound_messages
```

```json response.json
[
  {
    "id": "GxTyVu",
    "inbox_id": "PqRzMn",
    "to": "inbabc123@inbound.capsule.test",
    "from": "sender@example.com",
    "subject": "Hello",
    "text": "Hi",
    "html": "<p>Hi</p>",
    "thread_id": "thread",
    "headers": {},
    "envelope": {
      "mail_from": "sender@example.com",
      "rcpt_to": "inbabc123@inbound.capsule.test",
      "plus_tag": "thread"
    },
    "authentication": {
      "spf": {
        "result": "pass",
        "domain": "example.com"
      },
      "dkim": [
        {
          "result": "pass",
          "domain": "example.com",
          "selector": "google"
        }
      ],
      "dmarc": {
        "result": "pass",
        "policy": "none",
        "aligned": true
      },
      "arc": {
        "result": "none"
      }
    },
    "attachments": [
      {
        "filename": "photo.png",
        "content_type": "image/png",
        "size": 70
      }
    ],
    "expires_at": "2026-08-30T00:00:00Z",
    "drain_status": "stored"
  }
]
```

## GET /api/v1/inboxes/:inbox_id/inbound_messages/:id

Get one alive message, including raw MIME and attachment content_base64. Both are null after a webhook inbox delivers or gives up.

- `inbox_id`: Public inbox id
- `id`: Public inbound message id

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/inboxes/:inbox_id/inbound_messages/:inbound_message_id
```

```json response.json
{
  "id": "GxTyVu",
  "inbox_id": "PqRzMn",
  "to": "inbabc123@inbound.capsule.test",
  "from": "sender@example.com",
  "subject": "Hello",
  "text": "Hi",
  "html": "<p>Hi</p>",
  "thread_id": "thread",
  "headers": {},
  "envelope": {
    "mail_from": "sender@example.com",
    "rcpt_to": "inbabc123@inbound.capsule.test",
    "plus_tag": "thread"
  },
  "authentication": {
    "spf": {
      "result": "pass",
      "domain": "example.com"
    },
    "dkim": [
      {
        "result": "pass",
        "domain": "example.com",
        "selector": "google"
      }
    ],
    "dmarc": {
      "result": "pass",
      "policy": "none",
      "aligned": true
    },
    "arc": {
      "result": "none"
    }
  },
  "attachments": [
    {
      "filename": "photo.png",
      "content_type": "image/png",
      "size": 70,
      "content_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    }
  ],
  "expires_at": "2026-08-30T00:00:00Z",
  "drain_status": "stored",
  "raw": "From: sender@example.com\n"
}
```

## GET /api/v1/inboxes/:inbox_id/inbound_messages/:id/attachments/:index

Download one attachment as the decoded file. Index is 1-based and matches the attachments array. Returns 410 after a webhook inbox delivers or gives up.

- `inbox_id`: Public inbox id
- `id`: Public inbound message id
- `index`: 1-based attachment position from the message attachments array

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/inboxes/:inbox_id/inbound_messages/:inbound_message_id/attachments/:index
```
