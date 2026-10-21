# What can Support see?

> Delivery and ops. Not secrets. Not raw bounce dumps.

Support teammates see everything they need to answer "did they get the email?", and nothing that would let them take over the account. They can read delivery data, look up recipients, and remove a suppression. They cannot see secrets or change your setup.

## What Support sees

- Clusters, domains, tenants, templates, webhooks, inboxes, and received mail.
- **Events**, analytics, usage, suppressions, and the firewall.
- Recipient lookup, including the plain explanation for each bounce.
- Support tickets.

## What is hidden from Support

- **Secrets.** SMTP passwords, webhook secrets, and API keys stay with Team Administrators.
- **Raw event payloads.** Support sees the plain explanation instead of the full technical record.
- **Long numbers.** In message subjects and bodies, any run of four or more digits is replaced with dots. This keeps one-time codes and account numbers out of view.

Viewers see the same things as Support, with the same parts hidden. The only difference is that Support can remove a suppression.

## Support keys

A Support key for the API or an AI assistant follows the same rules. It can look up a recipient, read events, analytics, and sending status, and list or remove suppressions. It cannot send mail, create resources, or read raw payloads. See [Create a Support key](/docs/support/create-a-support-key).

## The AI page

Everyone on the team can open **AI**. Viewers and Support teammates see the Support questions and the names of Support keys, but not the keys themselves. Team Administrators also see the Full access setup and can copy keys.

## What gets recorded

Every recipient lookup and suppression removal is written to the access log, whoever does it. See [What is written to the access log?](/docs/support/access-log).

## Next steps

- [Team roles](/docs/support/roles)
- [How do I read a bounce reason?](/docs/support/reading-a-bounce-reason)
- [Create a Support key](/docs/support/create-a-support-key)
