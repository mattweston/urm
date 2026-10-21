# Create a Support key

> Mint a Bearer token that can look up recipients, read analytics, and remove a suppression.

A Support key is an API key that can answer delivery questions and nothing more. Give it to a help desk tool or an AI assistant so they can look up a recipient without being able to send mail or change your account.

## Before you start

- You are a Team Administrator. Only Team Administrators can create API keys.

## Create the key

1. Open **API keys**.
2. Click **Create API key**.
3. Under **Access**, choose **Support**.
4. Copy the Bearer token and store it somewhere safe.

A key's access cannot be changed later. If someone needs more, create a separate **Full access** key.

You can also create one from the **AI** page. Choose **Create Support key** under **Generate a key for support**.

## What a Support key can do

| Can | Cannot |
| --- | --- |
| Look up a recipient | Send mail |
| Read events and analytics | Create or change clusters, domains, or tenants |
| Read sending status | Issue SMTP credentials or see their passwords |
| List suppressions and remove one | Add or import suppressions |
| Confirm which user the key belongs to | Read raw event payloads |

Any other request with a Support key returns `403` with `{"error": "forbidden"}`. Recipient lookups and suppression removals made with the key are written to the access log. See [What is written to the access log?](/docs/support/access-log).

## Share the key safely

Send the key directly to the person or tool that needs it. Do not paste it into a support ticket or a chat channel. If a key leaks, delete it from **API keys** and create a new one.

## Next steps

- [Ask your assistant](/docs/support/ask-your-assistant)
- [What can Support see?](/docs/support/what-support-can-see)
- [Create an API key](/docs/create-an-api-key)
