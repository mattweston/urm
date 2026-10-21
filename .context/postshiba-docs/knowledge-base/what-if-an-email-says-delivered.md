# Delivered but not in the inbox

> Delivered means the destination accepted the message.

`delivered` means the recipient's mail server accepted the message. It does not tell you where the server filed it, so a delivered message can still land in spam, a tab, or a folder chosen by a filter.

## What to check

1. **Spam and junk.** Ask the recipient to search spam, junk, and any tabs or folders for the subject.
2. **Filters and rules.** Company mail systems and personal rules can move or quarantine mail after it is accepted.
3. **The right address.** Look up the address from the top bar and confirm the send went where you expected.
4. **Later events.** Open **Events** on the cluster. A `spamreport` after `delivered` means the recipient marked it as spam.

A delivered event has no bounce explanation, because nothing bounced.

## What PostShiba does not report

PostShiba does not track opens or clicks, so it cannot tell you whether someone read the message. The events it does send are on [Event types](/docs/webhooks/event-types).

## Next steps

- [Event types](/docs/webhooks/event-types)
- [Did they get the email?](/docs/support/did-they-get-the-email)
- [Events API](/docs/api-reference/events)
