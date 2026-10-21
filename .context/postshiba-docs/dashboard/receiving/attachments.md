# Receiving attachments

> Bytes on webhook, message show, and a download URL.

Files on inbound mail are available in the dashboard, on the API, and on the webhook. Where you get the bytes depends on the channel.

## Where the bytes are

| Channel | What you get |
| --- | --- |
| Message list (`GET …/inbound_messages`) | Metadata only: `filename`, `content_type`, `size` |
| Message show (`GET …/inbound_messages/:id`) | Metadata plus `content_base64` |
| JSON webhook | Metadata plus `content_base64` |
| Download URL (`GET …/attachments/:index`) | The raw file |
| Dashboard | **Download** on each attachment in the message view |

Attachments are numbered from `1`, in the order they appear in the message.

## Attachment fields

```json attachment.json
{
  "filename": "photo.png",
  "content_type": "image/png",
  "size": 70,
  "content_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
}
```

## SendGrid Inbound Parse format

A `sendgrid_parse` webhook sends files as form fields `attachment1`, `attachment2`, and so on. `attachment-info` is JSON with each file's name and type. The `email` field holds the raw MIME.

Download steps are on [Managing received emails](/docs/dashboard/receiving/manage-emails). Full fields are on [Inbound messages](/docs/api-reference/messages).

## Next steps

- [Managing received emails](/docs/dashboard/receiving/manage-emails)
- [Get email content](/docs/dashboard/receiving/get-email-content)
- [Receiving webhooks](/docs/dashboard/receiving/create-receiving-webhook)
- [Inbound messages API](/docs/api-reference/messages)
