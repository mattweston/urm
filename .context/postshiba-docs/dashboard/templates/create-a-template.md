# Create a template

> Create a draft in the dashboard or with the API.

Create a template draft, then publish it so it can send. You can do both in the dashboard or over the API.

## Before you start

- You need the Team Administrator role to create or change templates.

## Create a template in the dashboard

1. In the sidebar, open **Controls** → **Templates**, then select **Add template**.
2. Enter a **Name**, such as `Welcome`.
3. Enter an **Alias**, or leave it blank. PostShiba builds one from the name, so `Welcome` becomes `welcome`. The alias is the `template.id` you pass when you send.
4. Select **Add template**.

The editor opens on a starter draft. It greets `{{ name }}`, prints `{{ body }}` with a default, shows a **Continue** button when `action_url` is set, and includes global CSS. Edit it, then select **Save** and **Publish**. See [Template editor](/docs/dashboard/templates/editor).

Aliases use lowercase letters, numbers, and hyphens, and are unique within your team.

## Create a template with the API

POST a draft to `/api/v1/teams/:obfuscated_team_id/templates`.

```bash create-template.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email_template": {
      "name": "Welcome",
      "alias": "welcome",
      "from": "hello@mail.example.com",
      "subject": "Hi {{ name }}",
      "html": "<p>Hi {{ name }}</p>",
      "text": "Hi {{ name }}",
      "css": "p { color: #18181b; }",
      "sample_data": {"name": "Ada"}
    }
  }' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/templates
```

`sample_data` is what the dashboard shows as **Variables**. The template stays a draft until you call publish. Publish, duplicate, and field rules are on [Templates](/docs/api-reference/templates). Member routes take the public id or the alias.

## Duplicate a template

Open a template, select **More**, then **Duplicate**. The copy is a new unpublished draft named `<name> copy`, with its own alias. Use it for a variant subject or a seasonal layout.

To delete a template, select **More**, then **Remove**.

## Next steps

- [Template editor](/docs/dashboard/templates/editor)
- [Liquid](/docs/dashboard/templates/liquid)
- [Send with a template](/docs/dashboard/templates/send-with-a-template)
- [Templates API](/docs/api-reference/templates)
