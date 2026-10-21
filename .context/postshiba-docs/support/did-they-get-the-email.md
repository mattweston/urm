# Did they get the email?

> Look up a recipient from the top bar, read sends, suppressions, and firewall, and remove a suppression when the customer asked.

Type the customer's email address into the search box in the top bar and open the recipient. The page shows what we sent them, what happened to each message, and anything stopping new mail.

## Look up the address

1. Click the search box in the top bar, or press ⌘K (Ctrl K on Windows).
2. Type the full email address and choose the recipient result.
3. Read the three facts at the top:
   - **Last status** is what happened to the most recent message.
   - **Last seen** is when that happened.
   - **Can receive** is **No** when a suppression or a firewall rule will stop the next message.

## Read the sections

**Sends.** The latest 50 messages to this address, each with a plain explanation when something went wrong. Copy the explanation into your reply. You do not need the technical details. A `dropped` status means we never sent the message. The usual reasons are:

| Reason | What it means | What to do |
| --- | --- | --- |
| `suppressed` | The address is on the suppression list. | Read **Suppressions** below. |
| `firewall` | A firewall rule blocked the address. | Read **Firewall** below. |
| `kyc_required` | The account is not approved to send to customers yet. | See [Does PostShiba require production approval?](/docs/knowledge-base/does-capsule-require-production-approval). |
| `domain_suspended` | The sending domain is paused. | See [Why did sending stop?](/docs/support/why-did-sending-stop). |

**Suppressions.** Why the address is blocked, with a link to the message that caused it when there is one.

**Firewall.** **Blocked** or **Not blocked**, and which rule matched.

The meaning of each explanation is on [Bounce explanations](/docs/support/bounce-explanations).

## When to remove

Only click **Remove** on a suppression when the customer has asked to receive mail again.

| Reason | Remove it? |
| --- | --- |
| Bounce | Usually no. The mailbox did not exist. Ask the customer to confirm the address first. |
| Spam report | Rarely. They marked a message as spam. Remove it only if they clearly ask. |
| Unsubscribe | Only if the customer asks to subscribe again. |
| Manual | Yes, if the customer asks. Someone on the team added it. |

After you remove it, the next message to that address is no longer blocked for that reason. Messages that were already refused are not resent.

## Who can do this

Everyone on the team can look up a recipient. Support and Team Administrators can remove a suppression. Viewers can see the suppression but cannot remove it. Every lookup and removal is recorded. See [What is written to the access log?](/docs/support/access-log).

## Next steps

- [How do I read a bounce reason?](/docs/support/reading-a-bounce-reason)
- [Why did sending stop?](/docs/support/why-did-sending-stop)
- [Why did an address land on suppressions?](/docs/knowledge-base/why-are-my-emails-landing-on-the-suppression-list)
