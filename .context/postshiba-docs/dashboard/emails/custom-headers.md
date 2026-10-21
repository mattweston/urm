# Custom headers

> Add headers. Reserved names are ignored.

Add your own headers to a REST send with the `headers` object. PostShiba copies each name and value onto the composed mail, except for reserved names.

## Add a header

```bash send-with-headers.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "hello@mail.example.com",
    "to": ["you@example.com"],
    "subject": "PostShiba test",
    "text": "hello from PostShiba",
    "headers": {
      "X-Campaign": "cmp_123"
    }
  }' \
  https://app.postshiba.com/api/v1/emails
```

On the dashboard test-send form, the same object goes in **Headers** under **More**.

## Rules

- Names must be RFC 5322 field names: printable ASCII with no space or colon. Any other name fails the whole send with 422 `{error: invalid, field: headers}`.
- Values are written as strings. Blank values are dropped.
- A value that contains a line break (CR or LF) is ignored.
- Reserved names are ignored, in any case. `_` counts as `-`, so `return_path` is `Return-Path`.

## Reserved header names

| Group | Names |
| --- | --- |
| Addressing and body | `From`, `To`, `Cc`, `Bcc`, `Subject`, `Reply-To`, `Date`, `MIME-Version`, any `Content-*` |
| Envelope and trace | `Return-Path`, `Sender`, `Received`, `Authentication-Results`, `DKIM-Signature`, any `Resent-*` |
| Set by PostShiba | `X-Report-Abuse`, `Feedback-ID`, `X-Mailer`, `X-Complaints-To`, `X-Tenant-Id`, `X-PostShibaRef`, any `X-Capsule-*` except `X-Capsule-Ip` |

`List-Unsubscribe`, `List-Unsubscribe-Post`, `List-Id`, `In-Reply-To`, `References`, `Message-ID`, `Precedence`, `Auto-Submitted`, and your own `X-*` headers are kept.

Use the top-level `from`, `to`, `cc`, `bcc`, `subject`, and `reply_to` fields instead of headers for addressing. PostShiba writes the abuse-report headers itself. See [How do I report abuse?](/docs/knowledge-base/how-do-i-report-abuse).

To pin a sending cluster, set `X-Capsule-Cluster-Id` as an HTTP request header on `POST /api/v1/emails`, not in `headers`. See [Sending](/docs/api-reference/sending).

## Related headers

- For fields that should come back on delivery webhooks, use [unique args](/docs/dashboard/emails/unique-args).
- To send one message from a specific sending IP on its cluster, set `X-Capsule-Ip`. See [How do dedicated IPs work?](/docs/knowledge-base/how-do-dedicated-ips-work).
- For one-click `List-Unsubscribe` and `X-Include-Unsubscribe`, see [How do recipients unsubscribe?](/docs/knowledge-base/how-do-recipients-unsubscribe).

## Next steps

- [Unique args](/docs/dashboard/emails/unique-args)
- [Sending emails](/docs/dashboard/emails/introduction)
- [Sending](/docs/api-reference/sending)
