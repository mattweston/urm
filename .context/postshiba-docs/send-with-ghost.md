# Send emails with Ghost

> Point Ghost SMTP at PostShiba.

## What you'll build

A self-hosted Ghost site that sends its transactional mail, such as staff invites and member sign-in links, through PostShiba over SMTP. Newsletters stay on Ghost's bulk email provider.

## Before you start

- An SMTP username and password. Open your cluster in the dashboard, go to its SMTP credentials, and choose **Create SMTP credential**. Copy the password right away, because it is shown once. You can also use the [SMTP credentials API](/docs/api-reference/smtp-credentials).
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). The `from` address must be on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- Shell access to the Ghost install, so you can edit `config.production.json`.

## Install

Nothing to install. Ghost has SMTP support built in.

## Send your first email

1. Set the `mail` block in `config.production.json`. Port 587 with `secure` set to `false` upgrades the connection with STARTTLS. The keys follow [Ghost's mail config](https://ghost.org/docs/config/#mail).

```json config.production.json
{
  "mail": {
    "from": "hello@mail.example.com",
    "transport": "SMTP",
    "options": {
      "host": "smtp.postshiba.com",
      "port": 587,
      "secure": false,
      "auth": {
        "user": "smtp_9",
        "pass": "YOUR_PASSWORD"
      }
    }
  }
}
```

2. Restart Ghost so it reloads the config.

```sh restart.sh
ghost restart
```

3. In Ghost admin, invite a staff user from **Settings → Staff**. The invite goes through PostShiba and shows under Events in the dashboard.

Every SMTP setting is on [Send emails with SMTP](/docs/send-with-smtp).

## Troubleshooting

When the cluster reaches its hourly throttle or 24-hour cap, SMTP answers `451 4.7.0 hourly send limit reached` or `451 4.7.0 daily send limit reached` and does not keep the message. Retry once the cap has room. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap).

| What you see in the Ghost log | What to do |
| --- | --- |
| Authentication fails | Check `user` and `pass`. PostShiba accepts `AUTH PLAIN` only. After 20 failed logins in 10 minutes, attempts are blocked until the window ends. |
| `550 unverified domain` or `550 from header not aligned with verified domain` | Set `from` to an address on your verified domain. |
| `550 domain_suspended` | The From domain is paused. Resume it from [Managing domains](/docs/dashboard/domains/manage-domains). |
| `550 kyc_required` | Your team is pending production approval. Until then, send only to team members, live inbox addresses, and inbox forward-to addresses. |
| `550 suppressed` or `550 firewall: <rule>` | The recipient is on the [suppression list](/docs/dashboard/emails/email-suppressions) or failed an [email firewall](/docs/dashboard/emails/email-firewall) check. |

## Next steps

- [Send emails with SMTP](/docs/send-with-smtp) for every setting and reply.
- [AUTH PLAIN, not AUTH LOGIN](/docs/knowledge-base/auth-plain)
- [Managing webhooks](/docs/webhooks/introduction) to receive delivery events.
