# Managing received emails

> Poll stored mail or open it in the inbox.

Read mail that landed in an inbox, either in the dashboard or over the API.

## Read mail in the dashboard

1. In the sidebar, open **Inbound** → **Inboxes**, then select an inbox.
2. The **Mail** list shows messages newest first. Select one to read it next to the list.
3. Press J or the down arrow for the next message, and K or the up arrow for the previous one.

Each message shows its Text and HTML bodies, attachments with **Download**, SPF, DKIM, DMARC, and ARC results, the thread, and when it expires.

HTML opens in a sandboxed frame. Scripts and remote images are blocked.

## List messages with the API

The list returns stored messages, newest first, up to 200. List rows carry attachment metadata only.

```bash poll.sh
curl -sS -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/inboxes/PqRzMn/inbound_messages
```

## Get one message

Show returns the raw MIME and the attachment bytes. Fields are on [Inbound messages](/docs/api-reference/messages).

```bash show-message.sh
curl -sS -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/inboxes/PqRzMn/inbound_messages/GxTyVu
```

## Download an attachment

Attachments are numbered from `1`.

```bash download-attachment.sh
curl -sS -H 'Authorization: Bearer YOUR_API_KEY' \
  --output photo.png \
  https://app.postshiba.com/api/v1/inboxes/PqRzMn/inbound_messages/GxTyVu/attachments/1
```

Every message uses the same [payload](/docs/dashboard/receiving/get-email-content) as the JSON webhook.

## Next steps

- [Get email content](/docs/dashboard/receiving/get-email-content)
- [Receiving attachments](/docs/dashboard/receiving/attachments)
- [Receiving webhooks](/docs/dashboard/receiving/create-receiving-webhook)
- [Inbound messages API](/docs/api-reference/messages)
