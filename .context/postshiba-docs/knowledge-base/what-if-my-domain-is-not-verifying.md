# What if my domain is not verifying?

> DKIM and return-path records must match exactly.

Usually one DNS record is missing, on the wrong host, or the wrong type. Compare each record on the domain page with what your DNS provider publishes, fix the one that differs, then click **Check DNS**.

## What has to verify before you can send

| Setup | Needs to verify |
| --- | --- |
| Default (PostShiba DKIM key) | The DKIM CNAME and the return-path CNAME. |
| Imported DKIM key (`dkim_manual`) | The DKIM TXT record. Return-path can come later. Until `rp.` verifies, bounces use our return-path. |

DMARC is optional and never blocks sending.

## Check the records

| Record | Host | What we check |
| --- | --- | --- |
| DKIM CNAME | `ps1._domainkey.example.com` | A CNAME to the DKIM target shown on the domain page. |
| DKIM TXT | `ps1._domainkey.example.com` | With an imported key, a TXT whose value matches the public key shown on the domain page. |
| Return-path CNAME | `rp.example.com` | A CNAME to the return-path target shown on the domain page. |
| DMARC TXT | `_dmarc.example.com` | Optional. If it is missing here and on the parent domain, the domain shows DMARC as failed. Sending still works. |

`ps1` is the default DKIM selector. If you imported a key with another selector, use that selector instead.

## Fix and recheck

1. Open **Domains** and select the domain.
2. Compare each record with your DNS provider. Fix the host, the type, or the value.
3. Wait for your DNS provider to publish the change.
4. Click **Check DNS**. With the API, call `POST /api/v1/sending_domains/:sending_domain_id/verify`.

If a check misses, we check again after 30 seconds, 2 minutes, and 5 minutes. A send from a domain that has not verified also triggers a fresh check first.

## Common mistakes

- **The wrong record type.** A TXT where we asked for a CNAME, or the reverse.
- **The wrong host.** DKIM goes on `ps1._domainkey.example.com`, not on `example.com`. Return-path goes on `rp.example.com`.
- **A dropped subdomain.** For `mail.example.com`, the return-path host is `rp.mail.example.com`, not `rp.example.com`. Many DNS providers want the name relative to the zone, so you type `rp.mail`.
- **Swapped values.** The DKIM target belongs on the `_domainkey` host. The return-path target belongs on `rp.`.
- **An old DKIM record left in place.** Importing or refreshing a key resets DKIM until the new record is published.
- **MX on the sending domain.** Receiving uses its own host, `inbound.example.com` by default. See [How do I avoid MX conflicts?](/docs/knowledge-base/how-do-i-avoid-conflicting-with-my-mx-records).

**Check DNS** also looks for the value on common wrong hosts and types. When it finds one, the domain page tells you which record to move.

## Next steps

- [Add and verify a domain](/docs/add-a-domain)
- [Verified domains](/docs/dashboard/domains/introduction)
- [Return-path](/docs/dashboard/domains/custom-return-path)
- [Managing domains](/docs/dashboard/domains/manage-domains)
