# How do recipients unsubscribe?

> One-click List-Unsubscribe suppresses that address on the sending tenant.

On bulk clusters, PostShiba adds a one-click unsubscribe header to each message. When a recipient uses it, we suppress their address for the tenant that sent the message, so later sends to them from that tenant are refused.

## When we add the header

We add `List-Unsubscribe` and `List-Unsubscribe-Post` when all of these are true:

- The message is sent on a bulk cluster. Transactional clusters never get it.
- The message has exactly one recipient.
- The message does not already have its own `List-Unsubscribe` or `List-Unsubscribe-Post` header.

If you set your own header, we leave both alone and your unsubscribe handling applies instead.

## What the recipient sees

Many mail apps show an **Unsubscribe** button next to the sender when this header is present. The link goes to `https://www.postshiba.com/unsubscribe/{token}`.

- Clicking the button in the mail app sends a one-click request. We suppress the address right away.
- Opening the link in a browser shows a confirmation page first. Nothing changes until the recipient confirms.

## Add a link to the message body

To also put an unsubscribe link at the bottom of the message, send the header `X-Include-Unsubscribe: true`. We remove that header before delivery. It only has an effect on messages that get the one-click header.

## What you see

- An `unsubscribe` event on the cluster and on your webhook, if the endpoint subscribes to it. See [Event types](/docs/webhooks/event-types).
- A suppression with the reason **Unsubscribe** on the tenant that sent the message.
- The next send from the same tenant skips that address with `suppressed`. See [Errors](/docs/api-reference/errors).

## Next steps

- [How to manage suppressions](/docs/dashboard/emails/email-suppressions)
- [Custom headers](/docs/dashboard/emails/custom-headers)
- [Event types](/docs/webhooks/event-types)
- [How do I report abuse?](/docs/knowledge-base/how-do-i-report-abuse)
