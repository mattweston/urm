# Ask your assistant

> Connect a Support key to Cursor and ask whether they got the email.

Connect PostShiba to Cursor with a Support key, then ask questions in plain English, such as "Did they get the email?". The assistant reads the same recipient lookup you see in the dashboard, and a Support key keeps it from sending mail or changing your account.

## Before you start

- A Support key. Only a Team Administrator can create one and copy it. If you are not a Team Administrator, ask one to send you the key directly. See [Create a Support key](/docs/support/create-a-support-key).
- Cursor installed on your computer.

## Connect Cursor

1. Open **AI** in the dashboard.
2. Under **Set up for yourself**, copy the **Cursor mcp.json** config.
3. Replace `YOUR_API_KEY` in the config with your Support key.
4. In Cursor, open **Settings**, then **MCP**, and paste the config.

The same address and key work in other MCP clients that support streamable HTTP. See [Connect MCP](/docs/connect-mcp).

## Ask a question

The **AI** page lists ready-made questions under **Ask with a Support key**:

- **Did they get the email?**
- **Is a mailbox provider unhealthy?**

Copy one into Cursor and add the customer's email address.

## What the assistant can do

With a Support key, the assistant has five tools: confirm who it is connected as, look up a recipient, read analytics, read sending status, and remove a suppression. Bounce explanations come from the same text you see on **Events**. The assistant never sees SMTP passwords, webhook secrets, or raw event payloads.

Lookups and suppression removals through the assistant are written to the access log as **Assistant**. See [What is written to the access log?](/docs/support/access-log).

## Next steps

- [Create a Support key](/docs/support/create-a-support-key)
- [Did they get the email?](/docs/support/did-they-get-the-email)
- [Connect MCP](/docs/connect-mcp)
