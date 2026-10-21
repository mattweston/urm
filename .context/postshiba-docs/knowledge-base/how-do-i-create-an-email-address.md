# Sender email addresses

> You send from any address on a verified domain. Nothing to provision.

You do not create sender addresses. Verify a sending domain, then send from any address on it.

## How it works

We check the domain in `from`, not the part before the `@`. Once `mail.example.com` verifies, `hello@mail.example.com`, `billing@mail.example.com`, and any other address on that domain can send. There is no sender identity or mailbox to set up, and you do not need an inbox to send.

The domain must match exactly. Verifying `example.com` does not verify `mail.example.com`.

If you leave `from` out of a REST send, we use `hello@` your first verified domain. See [Choose a send path](/docs/sending-emails).

## Receiving replies

An inbox is for receiving mail, and it is separate from sending. If you want replies to reach you, create an inbox and set it as `reply_to`, or receive on the sending domain. See [Receiving emails](/docs/dashboard/receiving/introduction).

## Next steps

- [Add and verify a domain](/docs/add-a-domain)
- [Choose a send path](/docs/sending-emails)
- [Receiving emails](/docs/dashboard/receiving/introduction)
- [Subdomain or root domain?](/docs/knowledge-base/is-it-better-to-send-emails-from-a-subdomain)
