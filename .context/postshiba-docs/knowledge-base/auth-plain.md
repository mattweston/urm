# AUTH PLAIN, not AUTH LOGIN

> Port 587 after STARTTLS. AUTH LOGIN fails.

PostShiba SMTP accepts `AUTH PLAIN` only. If your client is set to `AUTH LOGIN`, authentication fails, so switch it to PLAIN.

## SMTP settings

| Setting | Value |
| --- | --- |
| Host | The SMTP host on your cluster page |
| Port | `587` |
| Encryption | STARTTLS |
| Authentication | `AUTH PLAIN` |
| Username | Your SMTP username, which starts with `smtp_` |
| Password | The SMTP password shown once when the credential was issued |

Most libraries pick the method for you. If yours has a setting such as `authentication`, `auth_type`, or `AuthMechanism`, set it to `plain`.

## Test from the command line

```bash test-smtp.sh
swaks --server smtp.postshiba.com:587 --tls \
  --auth PLAIN --auth-user smtp_9 --auth-password YOUR_PASSWORD \
  --from hello@mail.example.com --to you@example.com \
  --header "Subject: PostShiba test" \
  --body "hello from PostShiba"
```

The full walkthrough is on [Send emails with SMTP](/docs/send-with-smtp).

## HTTP inject uses the same credentials

HTTP inject takes the same SMTP username and password as HTTP Basic auth. See [Send emails with HTTP](/docs/send-with-http).

## Next steps

- [Send emails with SMTP](/docs/send-with-smtp)
- [SMTP credentials API](/docs/api-reference/smtp-credentials)
- [Errors](/docs/api-reference/errors)
