# Send emails with SMTP

> STARTTLS on port 587 with AUTH PLAIN.

## What you'll build

One test message sent over SMTP with `swaks`. Any SMTP client or framework mailer works with the same settings.

## Before you start

- An SMTP username and password. Open your cluster in the dashboard, go to its SMTP credentials, and choose **Create SMTP credential**. Copy the password right away, because it is shown once. You can also use the [SMTP credentials API](/docs/api-reference/smtp-credentials).
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain).
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).

## SMTP settings

| Setting | Value |
| --- | --- |
| Host | `smtp.postshiba.com` |
| Port | `587` |
| Encryption | STARTTLS. Port 465 and implicit TLS are not offered. |
| Authentication | `AUTH PLAIN` after STARTTLS. `AUTH LOGIN` fails. |
| Username | The username you issued. It starts with `smtp_`. |
| Password | The password shown when you issued the credential. |
| Message size | 25 MB or less. |

The envelope sender (MAIL FROM) and the `From` header must both use a verified domain.

## Install

Install [swaks](https://github.com/jetmore/swaks) to send a test from your terminal.

```sh install.sh
brew install swaks        # macOS
sudo apt install swaks    # Debian and Ubuntu
```

## Send your first email

Replace `YOUR_PASSWORD` with the password you copied.

```bash send.sh
swaks --server smtp.postshiba.com:587 --tls \
  --auth PLAIN --auth-user smtp_9 --auth-password YOUR_PASSWORD \
  --from hello@mail.example.com --to you@example.com \
  --header "Subject: Your receipt" \
  --header 'X-Capsule-Unique-Args: {"order_id":"ord_123"}' \
  --body "Thanks for your order."
```

The server replies `250` to `DATA` once the message is queued. The message then shows under Events in the dashboard.

`X-Capsule-Unique-Args` is optional. PostShiba strips it from the sent mail and returns its keys on every delivery webhook. See [Unique args](/docs/dashboard/emails/unique-args).

## Attachments

SMTP takes standard multipart MIME. Attachments are delivered as sent, and the whole message must be 25 MB or less.

```bash send-attachment.sh
swaks --server smtp.postshiba.com:587 --tls \
  --auth PLAIN --auth-user smtp_9 --auth-password YOUR_PASSWORD \
  --from hello@mail.example.com --to you@example.com \
  --header "Subject: Your receipt" \
  --body "See attached." \
  --attach-name note.txt \
  --attach-type text/plain \
  --attach-body "hello"
```

Hosted templates work on the REST API, not over SMTP. See [Send with a template](/docs/dashboard/templates/send-with-a-template).

## Troubleshooting

When the cluster reaches its hourly throttle or 24-hour cap, SMTP answers `451 4.7.0 hourly send limit reached` or `451 4.7.0 daily send limit reached` and does not keep the message. Retry once the cap has room. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap).

| What you see | What to do |
| --- | --- |
| `AUTH` is rejected | Check the username and password, and use `AUTH PLAIN`, not `AUTH LOGIN`. |
| `454 4.7.0 too many failed logins, try again later` | Too many wrong passwords in the last minute. Fix the password. The right password still logs in. |
| `530 5.7.0 Authentication required` | The client sent `MAIL FROM` without logging in. Turn on authentication and log in with `AUTH PLAIN` after STARTTLS. |
| `550 unverified domain` | The MAIL FROM domain is not verified on this tenant. Finish [Add and verify a domain](/docs/add-a-domain). |
| `550 from header not aligned with verified domain` | The `From` header uses a different domain. Use an address on your verified domain. |
| `550 domain_suspended` | The From domain is paused. Resume it from [Managing domains](/docs/dashboard/domains/manage-domains). |
| `550 kyc_required` | Your team is pending production approval. Until then, send only to team members, live inbox addresses, and inbox forward-to addresses. |
| `550 suppressed` or `550 firewall: <rule>` | A recipient is on the [suppression list](/docs/dashboard/emails/email-suppressions) or failed an [email firewall](/docs/dashboard/emails/email-firewall) check. |
| `451 4.4.5 too many sessions, slow down` | Too many new sessions on one username. Reuse connections and send several messages per session. |
| `451 4.7.0 hourly send limit reached` or `451 4.7.0 daily send limit reached` | The cluster is at its cap. Retry later, or raise the cap. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap). |

## Next steps

- [AUTH PLAIN, not AUTH LOGIN](/docs/knowledge-base/auth-plain)
- [Attachments](/docs/dashboard/emails/attachments) for HTTP inject and REST.
- [Send emails with HTTP](/docs/send-with-http) for the REST API.
- [Managing webhooks](/docs/webhooks/introduction) to receive delivery events.
