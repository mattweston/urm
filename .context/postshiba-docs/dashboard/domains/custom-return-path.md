# Return-path

> MAIL FROM uses rp.your-domain when that CNAME verifies. Imported DKIM uses our zone until then.

The return-path is the envelope sender (MAIL FROM). Bounces and spam reports go to it. Publish the `rp` CNAME so that host is on your own domain.

## How the return-path works

Every sending domain has a return-path host at `rp.{name}`, such as `rp.mail.example.com`. You publish it as a CNAME to the PostShiba return-path zone. The domain page shows the exact target.

| `return_path_status` | Envelope host | Can the domain send? |
| --- | --- | --- |
| `verified` | `rp.{name}` | Yes, once DKIM verifies |
| Not verified, default DKIM | Not used yet | No. Default DKIM needs the return-path first. |
| Not verified, **Publish a TXT yourself** | The PostShiba return-path zone | Yes, once the DKIM TXT verifies |

Delivery status notifications and spam reports arrive at the return-path host. PostShiba matches them to the sending domain and stores the [bounce](/docs/dashboard/emails/email-bounces) or spam report on your team.

## You cannot set Return-Path on a send

PostShiba owns MAIL FROM. A `Return-Path` value in the send API `headers` object is ignored. See [Custom headers](/docs/dashboard/emails/custom-headers).

## Publish the record

Publish the CNAME from the domain page, then select **Check DNS**. The steps are in [Add and verify a domain](/docs/add-a-domain).

## Next steps

- [Verified domains](/docs/dashboard/domains/introduction)
- [Managing domains](/docs/dashboard/domains/manage-domains)
- [Email bounces](/docs/dashboard/emails/email-bounces)
- [Sending domains API](/docs/api-reference/domains)
