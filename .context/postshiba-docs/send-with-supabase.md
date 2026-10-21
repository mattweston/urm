# Send emails with Supabase

> Point Supabase Auth SMTP at PostShiba.

## What you'll build

A Supabase project whose Auth emails, such as sign-up confirmations and magic links, go through PostShiba over SMTP.

## Before you start

- An SMTP username and password. Open your cluster in the dashboard, go to its SMTP credentials, and choose **Create SMTP credential**. Copy the password right away, because it is shown once. You can also use the [SMTP credentials API](/docs/api-reference/smtp-credentials).
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). The sender address must be on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).

## Install

Nothing to install. Supabase Auth has custom SMTP built in.

## Send your first email

1. For a hosted project, open the SMTP settings under Authentication in the Supabase dashboard and enable custom SMTP. Use these values.

| Field | Value |
| --- | --- |
| Sender email | An address on your verified domain |
| Host | `smtp.postshiba.com` |
| Port | `587` |
| Username | Your username, which starts with `smtp_` |
| Password | Your password |

For local development with the Supabase CLI, put the same values in `supabase/config.toml`.

```toml supabase.toml
[auth.email.smtp]
enabled = true
host = "smtp.postshiba.com"
port = 587
user = "smtp_9"
pass = "YOUR_PASSWORD"
admin_email = "hello@mail.example.com"
sender_name = "Acme"
```

2. Sign up a test user or request a magic link. The Auth email goes through PostShiba and shows under Events in the dashboard.

Port 587 uses STARTTLS and `AUTH PLAIN`. Every SMTP setting is on [Send emails with SMTP](/docs/send-with-smtp).

## Troubleshooting

When the cluster reaches its hourly throttle or 24-hour cap, SMTP answers `451 4.7.0 hourly send limit reached` or `451 4.7.0 daily send limit reached` and does not keep the message. Retry once the cap has room. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap).

| What the Auth logs show | What to do |
| --- | --- |
| Authentication fails | Check the username and password. PostShiba accepts `AUTH PLAIN` only. After 20 failed logins in 10 minutes, attempts are blocked until the window ends. |
| `550 unverified domain` or `550 from header not aligned with verified domain` | Set the sender email to an address on your verified domain. |
| `550 domain_suspended` | The From domain is paused. Resume it from [Managing domains](/docs/dashboard/domains/manage-domains). |
| `550 kyc_required` | Your team is pending production approval. Until then, send only to team members, live inbox addresses, and inbox forward-to addresses. |
| `550 suppressed` or `550 firewall: <rule>` | The recipient is on the [suppression list](/docs/dashboard/emails/email-suppressions) or failed an [email firewall](/docs/dashboard/emails/email-firewall) check. |

## Next steps

- [Send emails with SMTP](/docs/send-with-smtp) for every setting and reply.
- [AUTH PLAIN, not AUTH LOGIN](/docs/knowledge-base/auth-plain)
- [Managing webhooks](/docs/webhooks/introduction) to receive delivery events.
