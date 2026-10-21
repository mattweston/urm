# Send emails with Joomla

> Point Joomla SMTP at PostShiba.

## What you'll build

A Joomla site that sends all of its mail through PostShiba over SMTP.

## Before you start

- An SMTP username and password. Open your cluster in the dashboard, go to its SMTP credentials, and choose **Create SMTP credential**. Copy the password right away, because it is shown once. You can also use the [SMTP credentials API](/docs/api-reference/smtp-credentials).
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). The from address must be on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).

## Install

Nothing to install. Joomla has SMTP support built in.

## Send your first email

1. Open **System → Global Configuration**, then the **Server** tab. Under **Mail**, set Mailer to SMTP and fill in the settings below. Joomla's [SMTP guide](https://guide.joomla.org/user-manual/configuration/configuration-smtp-mail-gmail) shows the same form.

| Field | Value |
| --- | --- |
| Mailer | SMTP |
| From Email | An address on your verified domain |
| SMTP Host | `smtp.postshiba.com` |
| SMTP Port | `587` |
| SMTP Security | STARTTLS |
| SMTP Authentication | Yes |
| SMTP Username | Your username, which starts with `smtp_` |
| SMTP Password | Your password |

The same settings in `configuration.php`:

```php configuration.php
public $mailer = 'smtp';
public $mailfrom = 'hello@mail.example.com';
public $smtphost = 'smtp.postshiba.com';
public $smtpport = 587;
public $smtpsecure = 'tls';
public $smtpauth = true;
public $smtpuser = 'smtp_9';
public $smtppass = 'YOUR_PASSWORD';
```

2. Save, then choose **Send Test Mail**. The message shows under Events in the dashboard.

Every SMTP setting is on [Send emails with SMTP](/docs/send-with-smtp).

## Troubleshooting

When the cluster reaches its hourly throttle or 24-hour cap, SMTP answers `451 4.7.0 hourly send limit reached` or `451 4.7.0 daily send limit reached` and does not keep the message. Retry once the cap has room. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap).

| What Joomla reports | What to do |
| --- | --- |
| SMTP authentication failed | Check the username and password. PostShiba accepts `AUTH PLAIN` only. After 20 failed logins in 10 minutes, attempts are blocked until the window ends. |
| `550 unverified domain` or `550 from header not aligned with verified domain` | Set From Email to an address on your verified domain. |
| `550 domain_suspended` | The From domain is paused. Resume it from [Managing domains](/docs/dashboard/domains/manage-domains). |
| `550 kyc_required` | Your team is pending production approval. Until then, send only to team members, live inbox addresses, and inbox forward-to addresses. |
| `550 suppressed` or `550 firewall: <rule>` | The recipient is on the [suppression list](/docs/dashboard/emails/email-suppressions) or failed an [email firewall](/docs/dashboard/emails/email-firewall) check. |

## Next steps

- [Send emails with SMTP](/docs/send-with-smtp) for every setting and reply.
- [AUTH PLAIN, not AUTH LOGIN](/docs/knowledge-base/auth-plain)
- [Managing webhooks](/docs/webhooks/introduction) to receive delivery events.
