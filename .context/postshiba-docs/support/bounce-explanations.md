# Bounce explanations

> Classified pasteable sentences from Events.

Every sentence on this page is one we show on the event page, in recipient lookup, and on the API. Each is written so you can paste it to a customer as it is. Below each sentence is its classification and, where there is one, the next step to suggest.

## What the classifications mean

| Classification | In plain words | Is the address suppressed? |
| --- | --- | --- |
| Invalid Address | The address is wrong, closed, or already on your suppression list. | Usually yes. The sentence says so. |
| Mailbox Unavailable | The mailbox could not take the message, for example because it is full, disabled, or filtered it. | No. We retry when the sentence says so. |
| Reputation | The receiving provider blocked or rejected the sender, or the recipient reported spam. | Only for spam reports. |
| Content | The message itself was refused, for example for its size or an attachment. | No |
| Frequency/Volume | Too much mail too fast, from the provider's side or because the cluster reached its limit. | No |
| Technical | A network, DNS, or server problem. We retry. | No |
| Unclassified | Anything else, including sends we refused before they left, such as a firewall block or a paused domain. | No |

## All explanations

<!-- bounce-reasons:start -->
This mailbox does not exist. We added the address to your suppression list.

Classification: Invalid Address.

Next: Ask the customer for a current address.

Gmail says this mailbox does not exist. We added the address to your suppression list.

Classification: Invalid Address.

Next: Ask the customer for a current address.

Outlook says this mailbox does not exist. We added the address to your suppression list.

Classification: Invalid Address.

Next: Ask the customer for a current address.

Yahoo says this mailbox does not exist. We added the address to your suppression list.

Classification: Invalid Address.

Next: Ask the customer for a current address.

iCloud says this mailbox does not exist. We added the address to your suppression list.

Classification: Invalid Address.

Next: Ask the customer for a current address.

The destination host does not exist. We added the address to your suppression list.

Classification: Invalid Address.

Next: Ask the customer to confirm the domain.

This mailbox has moved. We added the address to your suppression list.

Classification: Invalid Address.

Next: Ask the customer for the new address.

The destination accepted this message. A forward or alias behind this mailbox then bounced it. We suppress the address only if that happens on three separate days.

Classification: Mailbox Unavailable.

Next: Open the payload to see which address bounced. Ask the customer to fix or remove that forward.

The mailbox is full. This is a soft failure. We will retry for up to two days.

Classification: Mailbox Unavailable.

Next: Wait, then send again. Ask the customer to free space if it keeps failing.

Gmail says this inbox is out of storage. We will retry for up to two days.

Classification: Mailbox Unavailable.

Next: Ask the customer to free space in Gmail.

Outlook says this mailbox is full. We will retry for up to two days.

Classification: Mailbox Unavailable.

Next: Ask the customer to free space in Outlook.

Yahoo says this mailbox is full. We will retry for up to two days.

Classification: Mailbox Unavailable.

Next: Ask the customer to free space in Yahoo Mail.

iCloud says this mailbox is full. We will retry for up to two days.

Classification: Mailbox Unavailable.

Next: Ask the customer to free space in iCloud.

The destination treated this as spam. The address was not suppressed.

Classification: Reputation.

Next: Check the content, links, and the sending domain's reputation.

Gmail treated this as spam. The address was not suppressed.

Classification: Reputation.

Next: Check the content and Gmail postmaster tools for the sending domain.

Outlook treated this as spam. The address was not suppressed.

Classification: Reputation.

Next: Check recent spam reports and the sending domain's reputation at Outlook.

Yahoo treated this as spam. The address was not suppressed.

Classification: Reputation.

Next: Check Yahoo complaint rates for the sending domain.

iCloud treated this as spam. The address was not suppressed.

Classification: Reputation.

Next: Check the content and the sending domain's reputation.

The destination blocked this send. The address was not suppressed.

Classification: Reputation.

Next: Check the sending IP reputation and recent complaint volume.

Gmail blocked this send. The address was not suppressed.

Classification: Reputation.

Next: Check Gmail postmaster tools for the sending IP and domain.

Outlook blocked this send. The sending IP is on a block list.

Classification: Reputation.

Next: Check recent spam reports and the sending IP reputation at Outlook.

Yahoo deferred or blocked this send after user complaints.

Classification: Reputation.

Next: Slow down and check Yahoo complaint volume for the sending IP.

iCloud blocked this send. The address was not suppressed.

Classification: Reputation.

Next: Check iCloud filtering and the sending IP reputation.

The destination rejected the sender. The address was not suppressed.

Classification: Reputation.

Next: Confirm SPF, DKIM, and that MAIL FROM is a verified domain.

Gmail rejected the sender. The address was not suppressed.

Classification: Reputation.

Next: Confirm SPF and DKIM for the sending domain.

Outlook rejected the sender. The address was not suppressed.

Classification: Reputation.

Next: Confirm SPF, DKIM, and DMARC for the sending domain.

Yahoo rejected the sender. The address was not suppressed.

Classification: Reputation.

Next: Confirm SPF and DKIM for the sending domain.

iCloud rejected the sender. The address was not suppressed.

Classification: Reputation.

Next: Confirm SPF and DKIM for the sending domain.

The destination refused this message for a policy reason.

Classification: Reputation.

Next: Check attachments, From headers, and the destination's sending policy.

Gmail refused this message for a policy reason.

Classification: Reputation.

Next: Check attachments and Google Workspace sending policy.

Outlook refused this message for an organization policy.

Classification: Reputation.

Next: Ask the customer whether their tenant blocks this sender or content.

Yahoo refused this message for a policy reason.

Classification: Reputation.

Next: Check the content and Yahoo's sending policy.

iCloud refused this message for a policy reason.

Classification: Reputation.

Next: Check attachments and iCloud filtering.

The destination rejected the message format or an attachment.

Classification: Content.

Next: Remove the attachment or fix the headers and send again.

The destination asked us to send more slowly. We will retry.

Classification: Frequency/Volume.

Next: Lower the send rate.

Gmail is receiving mail for this user faster than it will accept. We will retry.

Classification: Frequency/Volume.

Next: Slow down to this recipient. Gmail will take more mail once the rate drops.

Outlook asked us to send more slowly. We will retry automatically.

Classification: Frequency/Volume.

Next: Wait. If it keeps happening, check recent spam reports at Outlook.

Yahoo asked us to send more slowly. We will retry automatically.

Classification: Frequency/Volume.

Next: Wait. If it keeps happening, check Yahoo complaint rates for the sending domain.

iCloud asked us to send more slowly. We will retry automatically.

Classification: Frequency/Volume.

Next: Wait. If it keeps happening, check iCloud filtering and the sending IP reputation.

The destination is out of storage. We will retry.

Classification: Mailbox Unavailable.

Next: Wait. This is the provider's system, not the mailbox size.

We could not reach the destination. We will retry.

Classification: Technical.

Next: Wait. This is a network or DNS failure, not a bad address.

We stopped retrying. The message expired before the destination accepted it.

Classification: Mailbox Unavailable.

Next: Send again. If it keeps expiring, check deferrals for the same recipient.

This mailbox is disabled. The destination will not accept mail for it right now.

Classification: Mailbox Unavailable.

Next: Ask the customer whether the mailbox is still active.

Gmail says this mailbox is disabled.

Classification: Mailbox Unavailable.

Next: Ask the customer whether the Google account is still active.

Outlook says this mailbox is disabled.

Classification: Mailbox Unavailable.

Next: Ask the customer whether the Microsoft account is still active.

iCloud says this mailbox is disabled.

Classification: Mailbox Unavailable.

Next: Ask the customer whether the iCloud account is still active.

The destination filtered this message. The address was not suppressed.

Classification: Mailbox Unavailable.

Next: Ask the customer to check junk and any inbound rules.

Gmail filtered this message. The address was not suppressed.

Classification: Mailbox Unavailable.

Next: Ask the customer to check Gmail spam and filters.

Outlook filtered this message. The address was not suppressed.

Classification: Mailbox Unavailable.

Next: Ask the customer to check junk email and inbox rules.

Yahoo filtered this message. The address was not suppressed.

Classification: Mailbox Unavailable.

Next: Ask the customer to check Yahoo spam.

iCloud filtered this message. The address was not suppressed.

Classification: Mailbox Unavailable.

Next: Ask the customer to check iCloud junk.

The destination refused this send for a security check.

Classification: Reputation.

Next: Confirm TLS, SPF, DKIM, and that the sending IP is not listed.

Gmail refused this send for a security check.

Classification: Reputation.

Next: Confirm SPF, DKIM, and alignment for the sending domain.

Outlook rejected this as spam. Earlier mail from you was reported by this recipient or their filter.

Classification: Reputation.

Next: Check recent spam reports and pause similar campaigns.

Yahoo refused this send for a security check.

Classification: Reputation.

Next: Confirm SPF, DKIM, and Yahoo postmaster status.

iCloud refused this send for a security check.

Classification: Reputation.

Next: Confirm SPF, DKIM, and that the sending IP is not listed.

The destination could not authenticate this message.

Classification: Reputation.

Next: Fix SPF, DKIM, or DMARC for the sending domain, then send again.

Gmail could not authenticate this message.

Classification: Reputation.

Next: Fix SPF, DKIM, and DMARC for the sending domain.

Outlook could not authenticate this message.

Classification: Reputation.

Next: Fix SPF, DKIM, and DMARC for the sending domain.

Yahoo could not authenticate this message.

Classification: Reputation.

Next: Fix SPF, DKIM, and DMARC for the sending domain.

iCloud could not authenticate this message.

Classification: Reputation.

Next: Fix SPF, DKIM, and DMARC for the sending domain.

The destination will not relay this message.

Classification: Reputation.

Next: Confirm the recipient domain accepts mail from the internet.

The destination is not accepting mail right now.

Classification: Technical.

Next: Wait and send again.

The destination refused this address from a suppression list on its side. The address was not suppressed on yours.

Classification: Invalid Address.

Next: Ask the customer for a current address.

The destination rejected the address as malformed. The address was not suppressed.

Classification: Invalid Address.

Next: Check the address for typos, stray spaces, or unsupported characters.

The destination did not give a clear reason. Open the event for the raw SMTP text.

Classification: Mailbox Unavailable.

Next: Read the raw response on the event and match it against the destination's postmaster docs.

The message is too large for the destination.

Classification: Content.

Next: Reduce attachments or the message size, then send again.

The destination rejected the message because its headers do not follow the email standard.

Classification: Content.

Next: Fix duplicate or missing headers such as Message-ID and Date, then send again.

The destination refused this send because of the sending IP or domain reputation. The address was not suppressed.

Classification: Reputation.

Next: Slow down and check the sending IP and domain reputation.

The destination requires a reverse DNS record that matches the sending IP.

Classification: Reputation.

Next: Confirm the sending IP has a PTR record that resolves back to it.

The destination's scanner flagged the message or an attachment as malicious.

Classification: Reputation.

Next: Remove the attachment and scan the content before sending again.

The destination hit an internal error. We will retry.

Classification: Technical.

Next: Wait. This is the destination's system, not the address.

The destination's local delivery program failed. We will retry.

Classification: Technical.

Next: Wait. If it keeps failing, ask the customer to contact their mail administrator.

The destination requires TLS and the connection could not be secured. We will retry.

Classification: Technical.

Next: Wait and send again. If it keeps failing, ask the destination's administrator about their TLS setup.

The destination returned a response we could not classify. Open the event for the raw SMTP text.

Classification: Unclassified.

Next: Read the raw response on the event and match it against the destination's postmaster docs.

Gmail asked us to slow down. We will retry.

Classification: Unclassified.

Next: Lower the send rate if this keeps happening.

The destination rejected this as an invalid address.

Classification: Invalid Address.

Next: Ask the customer for a current address.

The mailbox could not accept this message.

Classification: Mailbox Unavailable.

Next: Wait if it is full. Ask the customer if the mailbox is disabled.

The destination refused this message for a policy or authentication reason.

Classification: Reputation.

Next: Check SPF, DKIM, content, and the sending IP reputation.

The destination asked us to wait. We will retry. Slow down if this keeps happening.

Classification: Unclassified.

We did not send this message because the address is on your suppression list.

Classification: Invalid Address.

Next: Remove the address from suppressions only if the customer asked to receive mail again.

We blocked this recipient before send because they failed a firewall check.

Classification: Unclassified.

Next: Adjust the firewall allow list if this recipient should receive mail.

We did not send this message because the account still needs production approval.

Classification: Unclassified.

Next: Request production approval. Until then, send only to team members and live inboxes.

We did not send this message because the From domain is suspended.

Classification: Unclassified.

Next: Resume the domain. If resume says the name is still listed, clear the listing first.

We did not send this message because the From domain is not verified.

Classification: Unclassified.

Next: Verify DKIM and return-path, then send again.

We did not send this message because sending is disabled on this cluster or tenant.

Classification: Unclassified.

Next: Check whether the cluster, tenant, or account is paused.

We did not send this message because the cluster hit its hourly send limit.

Classification: Frequency/Volume.

Next: Wait for the hour to reset, or raise capacity.

We did not send this message because the cluster hit its daily send limit.

Classification: Frequency/Volume.

Next: Wait for the day to reset, or raise capacity.

The destination did not accept this message. Open the event for the raw SMTP text.

Classification: Unclassified.

The destination asked us to wait. We will retry.

Classification: Unclassified.

We did not send this message. Open the event for the local reason.

Classification: Unclassified.

This recipient reported the message as spam. We added the address to your suppression list.

Classification: Reputation.

Next: Do not send to this address again unless they ask.

We could not classify this event. Open the payload for the raw response.

Classification: Unclassified.
<!-- bounce-reasons:end -->

## Next steps

- [How do I read a bounce reason?](/docs/support/reading-a-bounce-reason)
- [Did they get the email?](/docs/support/did-they-get-the-email)
- [Why did sending stop?](/docs/support/why-did-sending-stop)
