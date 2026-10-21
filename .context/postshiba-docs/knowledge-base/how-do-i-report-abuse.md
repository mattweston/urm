# How do I report abuse?

> Open the X-Report-Abuse URL or the public abuse form.

Open the link in the message's `X-Report-Abuse` header, or go to [postshiba.com/abuse](https://www.postshiba.com/abuse) and fill in the form.

## Use the link in the message

Every message sent through PostShiba carries an `X-Report-Abuse` header with a link like this:

```text X-Report-Abuse.txt
https://www.postshiba.com/abuse/{token}?m={message_id}
```

The token tells us which sending domain sent the message, and `m` identifies the message when it is present. Opening the link fills both in for you. To see the header, use your mail app's "show original" or "view source" option.

## Use the form

If you do not have the header, open [postshiba.com/abuse](https://www.postshiba.com/abuse) and fill in:

| Field | Required |
| --- | --- |
| Your email | Yes |
| From address on the message | No, but it helps us find the sender |
| Message-ID | No |
| What happened | Yes |
| Original headers | No, but paste them if you can |

## What happens next

We review the report. If it holds up, we can pause the sender or the whole account behind it. A paused sender cannot send until we resume it.

If you only want to stop getting mail, use the unsubscribe link in the message instead. See [How do recipients unsubscribe?](/docs/knowledge-base/how-do-recipients-unsubscribe).

## Next steps

- [How do recipients unsubscribe?](/docs/knowledge-base/how-do-recipients-unsubscribe)
- [Custom headers](/docs/dashboard/emails/custom-headers)
- [Why did sending stop?](/docs/support/why-did-sending-stop)
