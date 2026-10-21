# How to manage suppressions

> Look up, add, import, or remove an address PostShiba will not send to.

The suppression list holds addresses PostShiba will not send to. This guide shows how to check an address, add or import addresses, and remove one.

## How the list works

- Rows are unique per team and tenant. With extra tenants, each tenant has its own list.
- Plus tags are ignored when matching, so `user+promo@example.com` matches `user@example.com`.
- A send skips suppressed addresses, goes to the other recipients, and lists the skipped addresses in `suppressed` on the response. If every recipient is suppressed, it returns `403` `suppressed`. SMTP refuses each suppressed address with `550 suppressed` and delivers to the rest.

| Reason | How the row got there |
| --- | --- |
| Bounce | A hard bounce. See [Email bounces](/docs/dashboard/emails/email-bounces). |
| Spam report | The recipient reported the message as spam. |
| Unsubscribe | The recipient used one-click unsubscribe. See [How do recipients unsubscribe?](/docs/knowledge-base/how-do-recipients-unsubscribe). |
| Manual | You added or imported the address. |

## Look up an address

1. Type the address into the search box in the top bar (placeholder `Search anything ...`, shortcut ⌘K or Ctrl K).
2. Pick the recipient result to open **Recipient lookup**.

Recipient lookup shows recent sends, whether the address is suppressed, and whether the [firewall](/docs/dashboard/emails/email-firewall) blocks it. Selecting an address on the **Suppressions** page opens the same view.

## Add an address

1. In the sidebar, open **Controls** → **Suppressions**, then select **Suppress address**.
2. Enter the **Email**. If your team has extra tenants, choose the **Tenant**.
3. Select **Suppress address**.

## Import a list

Import bounce, complaint, and unsubscribe lists from your old provider before you send. See [Switching from SendGrid](/docs/migration-guides/sendgrid) for an example.

1. On **Suppressions**, select **Import CSV**.
2. Choose a **CSV file**. Use one address per line, or a column named `email`, `address`, or `recipient`.
3. If your team has extra tenants, choose the **Tenant**.
4. Select **Import addresses**.

An import takes up to 10,000 addresses and 2 MB. The notice says how many were added, already listed, and skipped. Imported rows use the reason **Manual**.

## Remove an address

Select **Remove** on the row, then confirm. Only remove an address when the recipient asked for mail again. Every removal is written to the [access log](/docs/support/access-log).

The same actions are on the [Suppressions](/docs/api-reference/suppressions) API.

## Next steps

- [Email bounces](/docs/dashboard/emails/email-bounces)
- [Why did an address land on suppressions?](/docs/knowledge-base/why-are-my-emails-landing-on-the-suppression-list)
- [Why did the firewall block a send?](/docs/knowledge-base/why-did-the-firewall-block-a-send)
- [Suppressions API](/docs/api-reference/suppressions)
