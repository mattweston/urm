# Why did the firewall block a send?

> A recipient failed a team firewall check before queue.

The recipient matched one of your team's firewall rules, so PostShiba refused the send before it was queued. Nothing was delivered, and the address was not suppressed.

## Which rule matched

The rule name is in the send error and on the `dropped` event, for example `firewall (free_providers)`. You can also look up the address from the top bar and read its **Firewall** section.

| Rule | Dashboard label | Blocks |
| --- | --- | --- |
| `temp_providers` | Temp email providers | Disposable and throwaway domains. The list refreshes daily. |
| `free_providers` | Free email providers | Gmail, Yahoo, Outlook, iCloud, and other consumer mailboxes. |
| `plus_addressing` | Plus addressing | Addresses with a plus tag, such as `ada+test@example.com`. |
| `denied_domain` | Never send to | A domain or address on your deny list. Subdomains match too. |

The three checks are off until a Team Administrator turns them on. The replies for REST, SMTP, and HTTP inject are on [Errors](/docs/api-reference/errors).

## Let the recipient through

A Team Administrator makes the change on the **Firewall** page, or with the firewall API. Pick one:

- Turn off the check that matched.
- Add the address or domain to **Always allow**. Allow entries skip every check, including the deny list.
- Remove the matching entry from **Never send to**.

Then send again. The firewall does not retry blocked sends.

## Next steps

- [How to set the email firewall](/docs/dashboard/emails/email-firewall)
- [Why did an address land on suppressions?](/docs/knowledge-base/why-are-my-emails-landing-on-the-suppression-list)
- [Firewall API](/docs/api-reference/firewall)
