# How do I avoid MX conflicts?

> Default to inbound.your-domain. We refuse a host that already has MX.

Receive on a subdomain that has no mail today, such as `inbound.example.com`. Leave the MX records on your root domain with Google, Microsoft, or whoever hosts your mailboxes.

PostShiba checks for you. When you create a domain-bound inbox, we refuse any host that already has MX records, so you cannot take over a live mailbox by accident. Hosted inboxes on the PostShiba inbound zone need no MX at all.

## Pick a host

| Host | Use it when |
| --- | --- |
| `inbound.example.com` | Default. Pick this unless you have a reason not to. |
| `support.example.com` | You want a friendlier address and that host has no MX yet. |
| `example.com` | Only when the root has no MX, for example when PostShiba will receive all mail for it. |

## Publish the record

1. Create the inbox and pick the host.
2. Copy the MX record shown on the inbox. It points the host at the PostShiba inbound server with priority 10.
3. Publish it at your DNS provider on that host only.
4. Verify the inbox.

Address formats and the hosted zone are on [Custom receiving domains](/docs/dashboard/receiving/custom-domains).

## When mail still goes to your old mailbox host

Some mailbox hosts treat every subdomain as their own. Fastmail does this by default. A sender on the same host then gets `User unknown in virtual mailbox table`, and the message never reaches PostShiba. Senders on other hosts follow your MX record and succeed.

On Fastmail, edit the domain, open **Routing**, and set it to reject mail to subdomains. Fastmail then follows the subdomain MX. Other mailbox hosts have a similar "this domain only" setting.

## Next steps

- [Custom receiving domains](/docs/dashboard/receiving/custom-domains)
- [Receiving emails](/docs/dashboard/receiving/introduction)
- [Inbox forwarding](/docs/dashboard/receiving/forwarding)
- [Subdomain or root domain?](/docs/knowledge-base/is-it-better-to-send-emails-from-a-subdomain)
