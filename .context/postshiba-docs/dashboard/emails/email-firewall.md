# How to set the email firewall

> Block temp mail, free mailboxes, plus-addresses, and listed domains before send.

The email firewall checks every recipient before a message is queued, including on SMTP. This guide shows how to turn checks on and how to block or allow specific domains and addresses.

## Before you start

- Every check starts off. Nothing is blocked until you change it.
- You need the Team Administrator role to change the firewall.

## Turn on checks

1. In the sidebar, open **Controls** → **Firewall**.
2. Check the rules you want.
3. Select **Save firewall**. The button appears once you change a check.

| Check | What it blocks |
| --- | --- |
| Temp email providers | Disposable and throwaway domains. The list refreshes daily. |
| Free email providers | Gmail, Yahoo, Outlook, iCloud, and other consumer mailboxes. |
| Plus addressing | Recipients whose local part has a plus tag, such as `user+promo@example.com`. |

## Block or allow addresses

The page has two lists.

| List | What it does |
| --- | --- |
| Never send to | Blocks these domains or addresses. Subdomains match. A TLD such as `xyz` blocks every `*.xyz` address. |
| Always allow | Exceptions that skip every firewall check. Allow wins over every other rule. |

1. Select **Add** on the list you want.
2. Enter addresses or domains, one per line or separated by commas or semicolons. You can add up to 500 at once.
3. Select **Add**.

To take an entry off a list, select **Remove** on its row.

## What a blocked send returns

A blocked REST send returns `403` `firewall` with the rule that matched. SMTP returns `550 firewall: <rule>`. A sandbox send on `POST /sends` still runs the checks, then skips inject. See [Sending](/docs/api-reference/sending).

Why a send failed, and how allow and deny match, are on [Why did the firewall block a send?](/docs/knowledge-base/why-did-the-firewall-block-a-send). The same settings are on the [Firewall](/docs/api-reference/firewall) API.

## Next steps

- [Why did the firewall block a send?](/docs/knowledge-base/why-did-the-firewall-block-a-send)
- [How to manage suppressions](/docs/dashboard/emails/email-suppressions)
- [Firewall API](/docs/api-reference/firewall)
- [Errors](/docs/api-reference/errors)
