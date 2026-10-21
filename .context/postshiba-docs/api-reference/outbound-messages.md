# Outbound messages

> Stored copies of messages PostShiba composed, with the raw .eml.

Copies of messages PostShiba composed for the token's team: POST /emails, POST /sends, and sends and template tests from the dashboard. Mail you relay over SMTP or HTTP inject is not kept. Copies are kept only while outbound retention is on, for the retention_days the team had when the message was sent. expires_at is when the copy is deleted. Only a key created by a Team Administrator can read them. Other keys get 404.

## GET /api/v1/teams/:obfuscated_team_id/outbound_messages

List stored outbound messages, newest first. The list omits text, html, and attachments.

- `q`: Optional. Matches message_id, subject, from, or to.
- `before`: Optional. Public id of the last message on the previous page.
- `limit`: Optional. Page size. Default 100. Max 200.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/outbound_messages
```

```json response.json
[
  {
    "id": "OuTbMs",
    "message_id": "<abc123@mail.example.com>",
    "from": "hello@mail.example.com",
    "to": [
      "you@example.com"
    ],
    "cc": [],
    "bcc": [],
    "subject": "Your receipt",
    "source": "api",
    "sandbox": false,
    "bytesize": 24310,
    "retention_days": 45,
    "cluster_id": "NmQpXr",
    "tenant_id": "WbLcFd",
    "created_at": "2026-08-29T00:00:00.000Z",
    "expires_at": "2026-10-13T00:00:00.000Z"
  }
]
```

## GET /api/v1/outbound_messages/:id

Get one stored outbound message with its text and html parts and attachment metadata. text, html, and attachments are empty when the stored copy can't be read.

- `id`: Public outbound message id

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/outbound_messages/:outbound_message_id
```

```json response.json
{
  "id": "OuTbMs",
  "message_id": "<abc123@mail.example.com>",
  "from": "hello@mail.example.com",
  "to": [
    "you@example.com"
  ],
  "cc": [],
  "bcc": [],
  "subject": "Your receipt",
  "source": "api",
  "sandbox": false,
  "bytesize": 24310,
  "retention_days": 45,
  "cluster_id": "NmQpXr",
  "tenant_id": "WbLcFd",
  "created_at": "2026-08-29T00:00:00.000Z",
  "expires_at": "2026-10-13T00:00:00.000Z",
  "text": "Hi",
  "html": "<p>Hi</p>",
  "attachments": [
    {
      "filename": "invoice.pdf",
      "content_type": "application/pdf",
      "size": 18204
    }
  ]
}
```

## GET /api/v1/outbound_messages/:id/raw

Download the stored message as a .eml file (message/rfc822). Returns 410 when the stored copy can't be read.

- `id`: Public outbound message id

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/outbound_messages/:outbound_message_id/raw
```

## GET /api/v1/outbound_messages/:id/attachments/:index

Download one attachment as the decoded file. Index is 1-based and matches the attachments array on show. Returns 410 when the stored copy can't be read.

- `id`: Public outbound message id
- `index`: 1-based attachment position from the message attachments array

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/outbound_messages/:outbound_message_id/attachments/:index
```
