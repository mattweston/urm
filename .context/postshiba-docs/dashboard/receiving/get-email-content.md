# Get email content

> Text, HTML, headers, raw MIME, and plus-address threads.

Stored inbound mail and the JSON webhook share one payload. This page lists its fields and explains how threads work.

## Payload fields

| Field | What it holds |
| --- | --- |
| `id` | The message id |
| `inbox_id` | The inbox that received it |
| `to`, `from`, `subject` | Addressing and subject |
| `text`, `html` | The plain-text and HTML bodies |
| `in_reply_to` | The `In-Reply-To` header |
| `headers` | `from`, `to`, `cc`, `subject`, `date`, `message-id`, `in-reply-to`, and `references`, when present |
| `envelope` | `mail_from`, `rcpt_to`, and `plus_tag` from the SMTP session |
| `authentication` | SPF, DKIM, DMARC, and ARC results |
| `attachments` | File metadata. See [Receiving attachments](/docs/dashboard/receiving/attachments). |
| `expires_at` | When PostShiba deletes the stored message |
| `thread_id` | The thread key. See below. |

API responses also include `drain_status`, and message show adds `raw` with the full MIME. Full field rows are on [Inbound messages](/docs/api-reference/messages).

## Threads and plus-addresses

Plus-addressing routes `agent+thread@` to the inbox `agent@` and sets `thread_id` to `thread`. Give each conversation its own tag to keep replies together.

Without a plus tag, `thread_id` is the first `In-Reply-To` value, then the first `References` value, then the message's own `Message-ID`.

## Next steps

- [Managing received emails](/docs/dashboard/receiving/manage-emails)
- [Receiving attachments](/docs/dashboard/receiving/attachments)
- [Build an AI agent inbox on PostShiba](/docs/guides/build-ai-agent-inbox)
- [Inbound messages API](/docs/api-reference/messages)
