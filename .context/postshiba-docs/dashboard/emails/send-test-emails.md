# Send test emails

> Use the cluster test-send form, the template editor, or the send API.

Send a real message to yourself or a teammate before you wire up your app. Dashboard test sends run through the same send checks as the API.

## Before you start

- The cluster must be ready to send, with a verified sending domain. See [Add and verify a domain](/docs/add-a-domain).
- Dashboard test sends go only to people on your team. This works before [production approval](/docs/knowledge-base/does-capsule-require-production-approval).
- You need the Team Administrator role.

## Send from a cluster

1. Open a cluster from **Sending** → **Clusters**, then select **Send test**.
2. Check **From**. It starts on an address at your first sending-ready domain.
3. Choose **To** from the people on your team.
4. Edit the **Subject** and the **HTML** body, or keep the defaults.
5. To test more, open **More**. It holds **Unique args**, **Headers**, **Plain text**, **Cc**, **Bcc**, and **Reply-To**. **Tenant** appears there when your team has extra tenants.
6. Select **Send test**.

PostShiba returns you to the cluster with `Queued. Message-ID <id>.` The delivery events show up under **Recent events** on the cluster page.

Cc and Bcc must also be people on your team.

## Send from the template editor

1. Open a template from **Controls** → **Templates**.
2. Select **Save** first. The test uses the last saved draft and its **Variables**.
3. Choose a teammate in the recipient menu at the bottom of the editor.
4. Select **Send test**.

The test goes out on your first sending-ready cluster. It does not need a published template, but REST sends do. See [Template editor](/docs/dashboard/templates/editor).

## Send from your app

To test the path your app will use, call the send API or SMTP. The **Sending Guide** on each cluster page has ready-made recipes. See [Send emails with HTTP](/docs/send-with-http) and [Send emails with SMTP](/docs/send-with-smtp).

To run every check without delivering, pass `"sandbox": true` on `POST /sends`. See [Sending](/docs/api-reference/sending).

Failures use the same error strings as the API. See [Errors](/docs/api-reference/errors).

## Next steps

- [Sending emails](/docs/dashboard/emails/introduction)
- [Using templates](/docs/dashboard/templates/introduction)
- [Send emails with HTTP](/docs/send-with-http)
- [How to set the email firewall](/docs/dashboard/emails/email-firewall)
