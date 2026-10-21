# Templates

> Hosted Liquid templates.

Hosted Liquid templates. Create a draft, edit HTML, text, subject, and global CSS, then publish. Send with template.id (alias or public id) and a variables object. Drafts cannot send. Editing a published template keeps the published snapshot live until you publish again. CSS is injected and inlined at send time. id on member routes is the public id or the alias.

## GET /api/v1/teams/:obfuscated_team_id/templates

List templates.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/templates
```

```json response.json
[
  {
    "id": "TpLmQr",
    "name": "Welcome",
    "alias": "welcome",
    "from": "hello@mail.example.com",
    "reply_to": null,
    "subject": "Hi {{ name }}",
    "html": "<p>Hi {{ name }}</p>",
    "text": "Hi {{ name }}",
    "css": "p { color: #18181b; }",
    "sample_data": {
      "name": "Ada"
    },
    "published": true,
    "published_at": "2026-09-11T12:00:00.000Z",
    "has_unpublished_changes": false,
    "created_at": "2026-09-11T12:00:00.000Z",
    "updated_at": "2026-09-11T12:00:00.000Z"
  }
]
```

## GET /api/v1/templates/:id

Get one template by public id or alias. Returns the current draft fields.

- `id`: Public template id or alias

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/templates/:email_template_id
```

```json response.json
{
  "id": "TpLmQr",
  "name": "Welcome",
  "alias": "welcome",
  "from": "hello@mail.example.com",
  "reply_to": null,
  "subject": "Hi {{ name }}",
  "html": "<p>Hi {{ name }}</p>",
  "text": "Hi {{ name }}",
  "css": "p { color: #18181b; }",
  "sample_data": {
    "name": "Ada"
  },
  "published": true,
  "published_at": "2026-09-11T12:00:00.000Z",
  "has_unpublished_changes": false,
  "created_at": "2026-09-11T12:00:00.000Z",
  "updated_at": "2026-09-11T12:00:00.000Z"
}
```

## POST /api/v1/teams/:obfuscated_team_id/templates

Create a draft template. Alias is generated from name when omitted. name is required. alias is lowercase letters, numbers, and hyphens, unique per team.

- `name`: Required. Display name.
- `alias`: Optional. Lowercase letters, numbers, hyphens. Unique per team. Generated from name when omitted.
- `from`: Optional. Default From. Overridable at send.
- `reply_to`: Optional. Default Reply-To.
- `subject`: Optional. Liquid.
- `html`: Optional. Liquid HTML.
- `text`: Optional. Liquid plain text.
- `css`: Optional. Global CSS for this template.
- `sample_data`: Optional. JSON object used by the dashboard preview.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email_template":{"name":"Welcome","alias":"welcome","from":"hello@mail.example.com","subject":"Hi {{ name }}","html":"\u003cp\u003eHi {{ name }}\u003c/p\u003e","text":"Hi {{ name }}","css":"p { color: #18181b; }","sample_data":{"name":"Ada"}}}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/templates
```

```json response.json
{
  "id": "TpLmQr",
  "name": "Welcome",
  "alias": "welcome",
  "from": "hello@mail.example.com",
  "reply_to": null,
  "subject": "Hi {{ name }}",
  "html": "<p>Hi {{ name }}</p>",
  "text": "Hi {{ name }}",
  "css": "p { color: #18181b; }",
  "sample_data": {
    "name": "Ada"
  },
  "published": true,
  "published_at": "2026-09-11T12:00:00.000Z",
  "has_unpublished_changes": false,
  "created_at": "2026-09-11T12:00:00.000Z",
  "updated_at": "2026-09-11T12:00:00.000Z"
}
```

## PATCH /api/v1/templates/:id

Update draft fields. The published snapshot is unchanged until you publish.

- `id`: Public template id or alias

```bash request.sh
curl -sS -X PATCH \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email_template":{"subject":"Welcome, {{ name }}"}}' \
  https://app.postshiba.com/api/v1/templates/:email_template_id
```

```json response.json
{
  "id": "TpLmQr",
  "name": "Welcome",
  "alias": "welcome",
  "from": "hello@mail.example.com",
  "reply_to": null,
  "subject": "Welcome, {{ name }}",
  "html": "<p>Hi {{ name }}</p>",
  "text": "Hi {{ name }}",
  "css": "p { color: #18181b; }",
  "sample_data": {
    "name": "Ada"
  },
  "published": true,
  "published_at": "2026-09-11T12:00:00.000Z",
  "has_unpublished_changes": true,
  "created_at": "2026-09-11T12:00:00.000Z",
  "updated_at": "2026-09-11T12:00:00.000Z"
}
```

## POST /api/v1/templates/:id/publish

Publish the current draft. Sends use this snapshot until the next publish.

- `id`: Public template id or alias

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/templates/:email_template_id/publish
```

```json response.json
{
  "id": "TpLmQr",
  "name": "Welcome",
  "alias": "welcome",
  "from": "hello@mail.example.com",
  "reply_to": null,
  "subject": "Hi {{ name }}",
  "html": "<p>Hi {{ name }}</p>",
  "text": "Hi {{ name }}",
  "css": "p { color: #18181b; }",
  "sample_data": {
    "name": "Ada"
  },
  "published": true,
  "published_at": "2026-09-11T12:00:00.000Z",
  "has_unpublished_changes": false,
  "created_at": "2026-09-11T12:00:00.000Z",
  "updated_at": "2026-09-11T12:00:00.000Z"
}
```

## POST /api/v1/templates/:id/duplicate

Copy the draft into a new unpublished template.

- `id`: Public template id or alias

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/templates/:email_template_id/duplicate
```

```json response.json
{
  "id": "TpLmQr",
  "name": "Welcome copy",
  "alias": "welcome-copy",
  "from": "hello@mail.example.com",
  "reply_to": null,
  "subject": "Hi {{ name }}",
  "html": "<p>Hi {{ name }}</p>",
  "text": "Hi {{ name }}",
  "css": "p { color: #18181b; }",
  "sample_data": {
    "name": "Ada"
  },
  "published": false,
  "published_at": null,
  "has_unpublished_changes": false,
  "created_at": "2026-09-11T12:00:00.000Z",
  "updated_at": "2026-09-11T12:00:00.000Z"
}
```

## DELETE /api/v1/templates/:id

Delete a template.

- `id`: Public template id or alias

```bash request.sh
curl -sS -X DELETE \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/templates/:email_template_id
```
