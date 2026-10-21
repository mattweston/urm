# Attachments

> MIME on SMTP, structured parts on HTTP inject, base64 on the REST send API.

Each send path takes files in a different shape. Pick the example for the path you use.

## Attach over SMTP

Send multipart MIME in `DATA`. PostShiba does not rewrite attachment types. A message over 25 MB is rejected. See [Send emails with SMTP](/docs/send-with-smtp).

```bash send-with-attachment.sh
swaks --server smtp.postshiba.com:587 --tls \
  --auth PLAIN --auth-user smtp_9 --auth-password YOUR_PASSWORD \
  --from hello@mail.example.com --to you@example.com \
  --header "Subject: PostShiba test" \
  --body "see attached" \
  --attach-name note.txt \
  --attach-type text/plain \
  --attach-body "hello"
```

## Attach over HTTP inject

Pass `content.attachments` as an array of `file_name`, `content_type`, `data`, and `base64`. Set `base64` to `true` when `data` is base64.

```bash inject-with-attachment.sh
curl -sS -u 'smtp_9:YOUR_PASSWORD' \
  -H 'Content-Type: application/json' \
  -d '{
    "envelope_sender": "hello@mail.example.com",
    "content": {
      "text_body": "see attached",
      "headers": {
        "From": "hello@mail.example.com",
        "Subject": "PostShiba test"
      },
      "attachments": [
        {
          "file_name": "photo.png",
          "content_type": "image/png",
          "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          "base64": true
        }
      ]
    },
    "recipients": [{"email": "you@example.com"}]
  }' \
  https://inject.postshiba.com/api/inject/v1
```

## Attach over REST

Pass `attachments` as an array of `filename`, `content_type`, and base64 `content`.

```bash send-with-attachment-rest.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "hello@mail.example.com",
    "to": ["you@example.com"],
    "subject": "PostShiba test",
    "text": "see attached",
    "attachments": [
      {
        "filename": "photo.png",
        "content_type": "image/png",
        "content": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
      }
    ]
  }' \
  https://app.postshiba.com/api/v1/emails
```

| REST limit | Value |
| --- | --- |
| Files per send | 10 |
| Size per file | 18 MB |
| Size of all files | 18 MB |
| Allowed types | JPEG, PNG, GIF, WebP, PDF, Word `.doc` and `.docx`, and `.ics` |

`filename` is required, and its extension must match the file's contents: `.jpg`, `.png`, `.gif`, `.webp`, `.pdf`, `.doc`, `.docx`, or `.ics`. A name like `invoice.pdf.html` is refused. PostShiba reads the type from the decoded bytes and sends the file with that type, whatever `content_type` says. A file it cannot identify is refused. A calendar invite must start with `BEGIN:VCALENDAR`.

A file that breaks a rule returns `422` `invalid` with `field` `attachments`. Files over 18 MB in total return `413` `payload_too_large`. The full field list is on [Sending](/docs/api-reference/sending).

Files that arrive on inbound mail are covered on [Receiving attachments](/docs/dashboard/receiving/attachments).

## Next steps

- [Sending emails](/docs/dashboard/emails/introduction)
- [Send emails with SMTP](/docs/send-with-smtp)
- [Send emails with HTTP](/docs/send-with-http)
- [Sending](/docs/api-reference/sending)
