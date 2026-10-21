# What is written to the access log?

> Recipient lookups and suppression removals, from the dashboard, API, or assistant.

PostShiba records two actions in your team's access log: looking up a recipient and removing a suppression. It records them wherever they happen, whether in the dashboard, through the API, or through an AI assistant.

## What each entry holds

| Field | Example |
| --- | --- |
| Action | Recipient lookup, or Suppression removed |
| Subject | The email address that was looked up or removed |
| Via | Dashboard, API, or Assistant |
| Who | The teammate, or the teammate who owns the API key |
| When | The time of the action |

Browsing **Events**, reading analytics, and opening other pages are not logged.

## Who can see it

PostShiba keeps the log on your team. The dashboard does not display it right now.

## Next steps

- [Did they get the email?](/docs/support/did-they-get-the-email)
- [Create a Support key](/docs/support/create-a-support-key)
- [What can Support see?](/docs/support/what-support-can-see)
