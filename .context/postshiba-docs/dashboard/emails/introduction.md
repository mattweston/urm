# Sending emails

> What you can send today, and how it is queued.

A send is one message queued on a cluster. This page compares the three ways to send and lists the checks every send passes first.

## Pick a send path

| Path | Endpoint | Auth | Best for |
| --- | --- | --- | --- |
| SMTP | `smtp.postshiba.com:587`, STARTTLS | AUTH PLAIN with an SMTP credential | High volume, existing mail libraries |
| HTTP inject | `POST https://inject.postshiba.com/api/inject/v1` | HTTP Basic with an SMTP credential | High volume over HTTP |
| REST | `POST /api/v1/emails` or `POST /api/v1/teams/:obfuscated_team_id/clusters/:obfuscated_cluster_id/sends` | Bearer API key | Lower-volume transactional mail. PostShiba composes the MIME for you. |

`POST /api/v1/emails` picks a cluster for you. Set the `X-Capsule-Cluster-Id` header to pin one. `POST /sends` always targets the cluster in the path. Field details are on [Sending](/docs/api-reference/sending).

## Send a message

```bash send.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "hello@mail.example.com",
    "to": ["you@example.com"],
    "subject": "PostShiba test",
    "text": "hello from PostShiba"
  }' \
  https://app.postshiba.com/api/v1/emails
```

```json response.json
{
  "queued": true,
  "message_id": "abc@capsule.test",
  "from": "hello@mail.example.com",
  "to": ["you@example.com"],
  "subject": "PostShiba test",
  "unique_args": {}
}
```

To send a stored design instead of `html` and `text`, see [Send with a template](/docs/dashboard/templates/send-with-a-template).

## What every send must pass

PostShiba checks each send in this order. The first failure stops it.

1. The body has a From and at least one recipient (`invalid`). A blank From becomes `hello@` your first sending-ready domain.
3. The From address is on a verified sending domain that is not suspended (`domain_unverified`, `domain_suspended`).
4. The cluster has a live SMTP credential for the tenant (`credential_missing`).
5. At least one recipient is not [suppressed](/docs/dashboard/emails/email-suppressions) (`suppressed`). Suppressed recipients are skipped and listed in `suppressed` on the response.
6. Your team has production approval, or every recipient is a teammate, a live inbox, or an inbox forward-to address (`kyc_required`). See [Does PostShiba require production approval?](/docs/knowledge-base/does-capsule-require-production-approval).
7. No recipient fails the [email firewall](/docs/dashboard/emails/email-firewall) (`firewall`).
8. [Attachments](/docs/dashboard/emails/attachments) follow the REST rules (`invalid`).
9. The cluster is under its caps (`throttled`). See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap).

Status codes for each error are on [Errors](/docs/api-reference/errors).

## Next steps

- [Send test emails](/docs/dashboard/emails/send-test-emails)
- [Attachments](/docs/dashboard/emails/attachments)
- [Unique args](/docs/dashboard/emails/unique-args)
- [Send emails with HTTP](/docs/send-with-http)
- [Send emails with SMTP](/docs/send-with-smtp)
