# Team roles

> Viewer, Support, and Team Administrator, and the actions each role allows.

Everyone on a PostShiba team has one of three roles. Viewer can look. Support can look and remove a suppression. Team Administrator can change everything.

If a button is missing for you, your role does not allow that action. Your role is shown on **Team Members**.

## What each role can do

| Action | Viewer | Support | Team Administrator |
| --- | --- | --- | --- |
| Read clusters, domains, tenants, templates, webhooks, inboxes, received mail, and usage | Yes | Yes | Yes |
| Read events, analytics, suppressions, and the firewall | Yes | Yes | Yes |
| Look up a recipient | Yes | Yes | Yes |
| Open and reply to support tickets | Yes | Yes | Yes |
| Open the **AI** page and see Support prompts | Yes | Yes | Yes |
| Remove a suppression | No | Yes | Yes |
| Add or import suppressions | No | No | Yes |
| Create or change clusters, domains, tenants, templates, webhooks, inboxes, and the firewall | No | No | Yes |
| See SMTP passwords, webhook secrets, and API keys | No | No | Yes |
| See the raw event payload | No | No | Yes |
| Create API keys | No | No | Yes |
| Invite teammates and change roles | No | No | Yes |

## Viewer

For people who need to see what is happening but should not change anything. Viewers see message subjects and bodies with long numbers hidden. Any run of four or more digits is replaced with dots, which keeps codes and account numbers out of view.

## Support

For help desk teammates. Support can do everything a Viewer can, plus remove an address from suppressions when a customer asks to receive mail again. Support sees the same hidden digits as a Viewer.

## Team Administrator

For the people who own the account. Team Administrators can create and change every resource, see secrets, create API keys, invite teammates as Support or Team Administrator, and change anyone's role.

## Next steps

- [Invite a Support teammate](/docs/support/invite-a-support-teammate)
- [What can Support see?](/docs/support/what-support-can-see)
- [Did they get the email?](/docs/support/did-they-get-the-email)
