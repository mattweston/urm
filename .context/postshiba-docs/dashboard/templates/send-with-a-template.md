# Send with a template

> Pass template.id and variables instead of html.

Send a published template by naming it and passing its variables. PostShiba renders the published version for each message.

## Before you start

- [Publish](/docs/dashboard/templates/editor) the template. Drafts cannot send over REST.
- Have an [API key](/docs/dashboard/api-keys/introduction) and a verified sending domain.

## Send the template

1. POST to `/api/v1/emails`, or to `/api/v1/teams/:obfuscated_team_id/clusters/:obfuscated_cluster_id/sends` to target one cluster.
2. Set `template.id` to the alias or the public id.
3. Pass `template.variables`. Do not pass `html` or `text`.

```bash send-template.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "hello@mail.example.com",
    "to": ["you@example.com"],
    "template": {
      "id": "welcome",
      "variables": {
        "name": "Ada",
        "body": "Your account is ready.",
        "action_url": "https://example.com/start"
      }
    },
    "unique_args": {"campaign_id": "cmp_123"}
  }' \
  https://app.postshiba.com/api/v1/emails
```

```json response.json
{
  "queued": true,
  "message_id": "abc@capsule.test",
  "from": "hello@mail.example.com",
  "to": ["you@example.com"],
  "subject": "Hi Ada",
  "unique_args": {"campaign_id": "cmp_123"}
}
```

A body wrapped as `{"send": {...}}` works the same way.

## Override template fields

| Request field | Effect |
| --- | --- |
| `from` | Replaces the template From. Omit it to use the template From. |
| `subject` | Replaces the rendered subject. The override is not Liquid. |
| `reply_to` | Replaces the template Reply-To. |

`unique_args`, `attachments`, `headers`, and `tenant` work as on any send. See [Unique args](/docs/dashboard/emails/unique-args), [Attachments](/docs/dashboard/emails/attachments), and [Custom headers](/docs/dashboard/emails/custom-headers).

## Template errors

Each returns `422` with `{"error": "invalid", "field": "template"}`.

| Message | Cause |
| --- | --- |
| `is unknown` | No template has that alias or id on your team. |
| `is not published` | The template has never been published. |
| `cannot be combined with html or text` | The request passed `html` or `text` with `template`. |
| A Liquid error | The published version failed to render with these variables. |

Other send failures are on [Errors](/docs/api-reference/errors).

## Next steps

- [Liquid](/docs/dashboard/templates/liquid)
- [Using templates](/docs/dashboard/templates/introduction)
- [Sending](/docs/api-reference/sending)
- [Templates API](/docs/api-reference/templates)
