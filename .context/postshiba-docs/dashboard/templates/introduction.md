# Using templates

> Design a message once, then send it with Liquid variables.

A template stores a reusable subject, HTML body, plain-text body, and [global CSS](/docs/dashboard/templates/css). You design it once in the dashboard, then send it by passing its alias and a `variables` object.

## How templates work

1. You edit a **draft** in the [template editor](/docs/dashboard/templates/editor), with a live preview.
2. **Publish** copies the draft into a published version.
3. A send names the template with `template.id` and passes `variables`. PostShiba renders the published version with [Liquid](/docs/dashboard/templates/liquid), injects the CSS, and inlines it for the inbox.

Later edits stay on the draft until you publish again. The header badge reads **Draft** while the draft differs from the published version, and **Published** when they match.

## When to use a template

Templates fit mail you send often with the same layout, such as welcome, receipt, or password-reset mail. For one-off mail, pass `html` and `text` on the send instead.

A send can use a template or `html` and `text`, not both. Only published templates can send over REST.

## Next steps

- [Create a template](/docs/dashboard/templates/create-a-template)
- [Template editor](/docs/dashboard/templates/editor)
- [Liquid](/docs/dashboard/templates/liquid)
- [Send with a template](/docs/dashboard/templates/send-with-a-template)
- [Templates API](/docs/api-reference/templates)
