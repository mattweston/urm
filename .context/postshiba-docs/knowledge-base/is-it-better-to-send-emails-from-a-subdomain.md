# Subdomain or root domain?

> A sending subdomain keeps root MX free for inbound.

Send from a subdomain such as `mail.example.com`. Your root domain's MX records stay with Google, Microsoft, or whoever hosts your mailboxes, and your sending setup stays separate from your everyday mail.

## How it works

The sending domain is the host you verify. Once `mail.example.com` verifies, you can send from any address on it, such as `hello@mail.example.com` or `receipts@mail.example.com`. There is nothing else to create.

If you also want to receive mail, the default receiving host is `inbound.mail.example.com`. You can pick another host under the sending domain, or the sending domain itself, as long as that host has no MX records.

## Sending from the root domain

Verifying `example.com` works too. You then send from addresses like `hello@example.com`. Receiving on the root is allowed only when the root has no MX records, which is rare for a domain that already has mailboxes.

## Next steps

- [Add and verify a domain](/docs/add-a-domain)
- [Sender email addresses](/docs/knowledge-base/how-do-i-create-an-email-address)
- [How do I avoid MX conflicts?](/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records)
