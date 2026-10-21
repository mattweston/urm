# Inbox forwarding

> Resign inbound mail and send it to an address on a sending domain.

Forwarding sends a copy of each inbound message to another address. PostShiba writes a new message and signs it with your domain, so the copy passes authentication checks at the destination.

## How the copy is built

An inbound message's original From may be a domain PostShiba cannot sign for. So the copy is a new message:

| Header | Value on the copy |
| --- | --- |
| From | The inbox mailbox at the forward address's domain, such as `support@example.com` |
| Reply-To | The original sender |
| `X-Original-From`, `X-Original-To` | The original sender and recipient |
| DKIM | Signed with the forward address's sending domain |

The copy keeps the subject, both bodies, and the attachments. Replies from the destination go back to the original sender.

The copy is sent on your first sending-ready cluster, with an SMTP credential for that domain's tenant. Its delivery webhooks carry the unique args `kind` `inbox_forward`, `inbox_id`, and `inbound_message_id`.

## Set a forward address

The forward address must be on one of your verified sending domains. It cannot loop back to the inbox's own host, and it cannot be another inbox.

- **New inbox.** Fill in **Forward to** on the **Issue inbox** form, or pass `forward_to` on API create.
- **Existing inbox.** Open the inbox, select the **Webhook** pill, change **Forward to**, then select **Save webhook**. The API has no inbox update, so this change is dashboard only.

## Forwarding before approval

Until your team has production approval, forward-to addresses count as allowed recipients, like teammates. See [Does PostShiba require production approval?](/docs/knowledge-base/does-capsule-require-production-approval).

## Next steps

- [Receiving emails](/docs/dashboard/receiving/introduction)
- [Custom receiving domains](/docs/dashboard/receiving/custom-domains)
- [Receiving webhooks](/docs/dashboard/receiving/create-receiving-webhook)
- [Inboxes API](/docs/api-reference/inboxes)
