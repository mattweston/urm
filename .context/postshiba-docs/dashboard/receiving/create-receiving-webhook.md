# Receiving webhooks

> POST signed JSON or SendGrid Inbound Parse.

A receiving webhook POSTs each inbound message to your URL as soon as it is stored. It is optional. Without one, PostShiba stores the mail and you [poll](/docs/dashboard/receiving/manage-emails) for it.

## Before you start

- Your URL must be public. In production it must use `https`.

## Add a webhook

1. Open the inbox from **Inbound** → **Inboxes**.
2. Select the **Webhook** pill. It reads `store only` when no webhook is set.
3. Enter the **Webhook URL**.
4. Choose the **Webhook format**.
5. Select **Save webhook**.
6. Copy the **Signing secret** from the same dialog.

You can also set **Webhook URL** and **Webhook format** on the **Issue inbox** form. Over the API, pass `webhook_url` and `webhook_format` on create, and read `webhook_secret` from the create or show response. The API has no inbox update, so later changes are dashboard only.

| Webhook format | API value | Body |
| --- | --- | --- |
| PostShiba JSON | `json` (default) | The inbound [payload](/docs/dashboard/receiving/get-email-content) as JSON |
| SendGrid Inbound Parse | `sendgrid_parse` | SendGrid's multipart form fields |

## Verify each request

Check the signature on every POST with the signing secret. See [Verify webhook requests](/docs/webhooks/verify-webhooks-requests).

## Check delivery

The webhook dialog shows **Last success** and **Last failure**, so you can see whether your endpoint is accepting posts.

## Next steps

- [Verify webhook requests](/docs/webhooks/verify-webhooks-requests)
- [Get email content](/docs/dashboard/receiving/get-email-content)
- [Receiving attachments](/docs/dashboard/receiving/attachments)
- [Inboxes API](/docs/api-reference/inboxes)
