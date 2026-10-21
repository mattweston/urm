# Why did an address land on suppressions?

> Hard bounce, spam report, unsubscribe, or a manual add.

An address is suppressed after a hard bounce, a spam report, a one-click unsubscribe, or when someone on your team adds it. PostShiba then refuses to send to it, so you stop mailing people who cannot or do not want to receive your mail.

## Reasons

| Reason | What added it |
| --- | --- |
| Bounce | The destination said the address does not exist. Temporary failures, such as a full mailbox, and blocks for spam or policy reasons do not suppress. |
| Spam report | The recipient marked a message as spam. |
| Unsubscribe | The recipient used one-click List-Unsubscribe. |
| Manual | Someone added the address in the dashboard or with the API, including imports. |

A suppression applies to one team and one tenant. The next send from the same tenant skips that address. A send where every recipient is suppressed is refused before it is queued. The replies for REST, SMTP, and HTTP inject are on [Errors](/docs/api-reference/errors).

Plus tags count as the same address. Suppressing `ada@example.com` also covers `ada+news@example.com`.

## Find out why

Type the address into the search box in the top bar and open the recipient. The **Suppressions** section shows the reason, with a link to the event that caused it when there is one.

## Remove a suppression

Remove an address only when the recipient has asked to receive mail again. A bounce usually means the mailbox is gone, and sending to it again hurts your reputation.

1. Open **Suppressions**, or look up the address from the top bar.
2. Click **Remove** next to the address and confirm.

With the API, call `DELETE /api/v1/suppressions/:suppression_id`. Support and Team Administrators can remove a suppression. Viewers cannot.

## Next steps

- [How to manage suppressions](/docs/dashboard/emails/email-suppressions)
- [Email bounces](/docs/dashboard/emails/email-bounces)
- [How do recipients unsubscribe?](/docs/knowledge-base/how-do-recipients-unsubscribe)
- [Suppressions API](/docs/api-reference/suppressions)
