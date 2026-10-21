# Verified domains

> Why send waits on DKIM, and when an imported key can skip return-path.

A sending domain is the host you put in `From`. PostShiba will not send from it until its DKIM record verifies. This page explains what each record does and what can still stop a verified domain.

## What send waits on

PostShiba issues a DKIM keypair when you add a domain. The records you publish depend on how you set up DKIM.

| DKIM setup | Records to publish | Send starts when |
| --- | --- | --- |
| Default | DKIM CNAME at `{selector}._domainkey` (selector `ps1` unless you change it) and the return-path CNAME at `rp` | Both verify |
| **Publish a TXT yourself** | DKIM TXT with the public key, plus the return-path CNAME | The DKIM TXT verifies |

With **Publish a TXT yourself**, you can also paste an existing private key to import it. Until `rp.{name}` verifies, PostShiba uses its own return-path host, so bounces land on our zone instead of yours. See [Return-path](/docs/dashboard/domains/custom-return-path).

A DMARC TXT at `_dmarc` is optional. The domain page shows a recommended record if you do not have one.

## What stops a verified domain

- **Suspended domain.** A suspended domain cannot send, even when DNS still passes. Sends return `domain_suspended` on REST, SMTP, and HTTP inject.
- **Suspended tenant.** Every domain on a suspended [tenant](/docs/dashboard/tenants/introduction) stops sending.
- **Spamhaus listing.** A domain on the Spamhaus Domain Block List stays paused until the listing clears.

Resume a domain from [Managing domains](/docs/dashboard/domains/manage-domains).

## The primary domain

The first domain you add becomes the account primary. Outbound mail from any other domain is also DKIM-signed with the primary. Select **Make primary** on another verified domain to move that second signature.

## Next steps

- [Add and verify a domain](/docs/add-a-domain)
- [Managing domains](/docs/dashboard/domains/manage-domains)
- [Return-path](/docs/dashboard/domains/custom-return-path)
- [What if my domain is not verifying?](/docs/knowledge-base/what-if-my-domain-is-not-verifying)
- [Sending domains API](/docs/api-reference/domains)
