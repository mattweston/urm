# Email bounces

> Hard bounces suppress the address. Events stay on the cluster.

When a destination refuses a message, PostShiba records a `bounce` event on the cluster. A hard bounce also adds the address to your suppression list, so you stop sending to it.

## What each failure does

| Failure | Event | Adds a suppression? |
| --- | --- | --- |
| Hard bounce: the mailbox or host does not exist, or the mailbox has moved | `bounce` | Yes, reason **Bounce** |
| Soft failure, such as a full mailbox | `deferred` while PostShiba retries | No |
| Message expired before delivery | `bounce` with reason `expired` | No |
| Spam report from the recipient | `spamreport` | Yes, reason **Spam report** |

The suppression lands on the tenant that sent the message. Later sends skip that address. A send to only that address returns `403` `suppressed`. See [Errors](/docs/api-reference/errors).

## Read a bounce

Open **Activity** → **Events** in the sidebar, then open the event. The event page shows the SMTP code, the enhanced code, the bounce classification, the bounce reason, and a plain explanation you can paste to a customer. See [How do I read a bounce reason?](/docs/support/reading-a-bounce-reason).

## Where bounces arrive

Bounces and spam reports come back to the domain's return-path host. PostShiba matches them to the sending domain and stores the event on your team. See [Return-path](/docs/dashboard/domains/custom-return-path).

Event fields are on [Events](/docs/api-reference/events).

## Next steps

- [How to manage suppressions](/docs/dashboard/emails/email-suppressions)
- [Why did an address land on suppressions?](/docs/knowledge-base/why-are-my-emails-landing-on-the-suppression-list)
- [Bounce explanations](/docs/support/bounce-explanations)
- [Event types](/docs/webhooks/event-types)
