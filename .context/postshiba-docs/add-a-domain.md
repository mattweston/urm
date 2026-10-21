# Add and verify a domain

> Publish two DNS records so PostShiba can sign and send mail from your domain.

PostShiba sends only from verified domains. Add the domain, publish a DKIM record and a return-path record, and send from any address on it once they verify.

## Before you start

- Access to the DNS for the domain.
- A sending subdomain such as `mail.example.com` is recommended. It keeps the root domain's MX records free for your existing mailbox. See [Subdomain or root domain?](/docs/knowledge-base/is-it-better-to-send-emails-from-a-subdomain)

## 1. Add the domain

In the dashboard, open **Domains** and click **Add domain**. Enter a full host such as `mail.example.com`, not a single word.

You can also create it with `POST /api/v1/teams/{team_id}/sending_domains`. See [Sending domains](/docs/api-reference/domains).

## 2. Publish the DNS records

The domain page lists the exact values to copy.

| Type | Host | Value | Required |
| --- | --- | --- | --- |
| CNAME | `{selector}._domainkey.{domain}` | The DKIM target shown on the domain page | Yes |
| CNAME | `rp.{domain}` | The return-path target shown on the domain page | Yes |
| TXT | `_dmarc.{domain}` | `v=DMARC1; p=none;` | No |

The DKIM record lets PostShiba sign your mail. The return-path record makes bounces come back to `rp.{domain}`, so the envelope sender matches your domain. See [Return-path](/docs/dashboard/domains/custom-return-path).

DMARC is optional. A `_dmarc` record on your organizational domain, such as `_dmarc.example.com`, also counts.

Most DNS providers want the host without the zone. For `mail.example.com` in the `example.com` zone, enter `rp.mail`, not `rp`. The dashboard shows names in that form.

### Import with a BIND file

Click **Download BIND file** on the domain page to get the DKIM and return-path records in one file. It also adds DMARC unless we already found a DMARC record on your domain. In Cloudflare, import it under **DNS**, then **Import**. Leave **Proxy imported DNS records** unchecked, because mail CNAMEs must stay DNS-only. The file doesn't include MX or any other records.

## 3. Verify

Click **Check DNS** on the domain page. If a record is missing, PostShiba checks again after 30 seconds, 2 minutes, and 5 minutes, then every 5 minutes until the domain verifies. A send from a pending domain also runs a check first.

DNS changes can take a while to appear. If the domain still won't verify, see [What if my domain is not verifying?](/docs/knowledge-base/what-if-my-domain-is-not-verifying)

## Bring an existing DKIM key

Moving from another provider? You can import your current DKIM private key and keep your existing TXT record instead of the CNAME. An imported key can send before `rp.{domain}` verifies. See [Managing domains](/docs/dashboard/domains/manage-domains).

## Next steps

- [Choose a send path](/docs/sending-emails)
- [Sender email addresses](/docs/knowledge-base/how-do-i-create-an-email-address)
- [Managing domains](/docs/dashboard/domains/manage-domains)
- [Verified domains](/docs/dashboard/domains/introduction)
