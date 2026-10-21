# Errors

> The status codes and error strings the REST API, SMTP, and HTTP inject return.

A failed REST request returns a JSON body with an `error` string. Match on `error`, not on the message text. Language clients raise an error carrying the same `error`, `field`, and `message`.

## Error shapes

Send endpoints return `error`, the `field` it applies to, and a short `message`. A `firewall` error also has `rule`. `throttled`, `inject_failed`, `inject_unavailable`, `inject_timeout_unknown`, and the `idempotency_in_progress`, `idempotency_outcome_unknown`, and `idempotency_unavailable` errors also have `retryable`, which is `true` only when nothing was sent and the same request can go again.

```json send-error-response.json
{
  "error": "domain_unverified",
  "field": "from",
  "message": "must be a verified sending domain"
}
```

Other endpoints return `{"error": "..."}`. Validation failures on create and update return a list instead:

```json validation-error-response.json
{
  "errors": ["Url must use https"]
}
```

## Authentication and access

| Status | `error` | Meaning |
| --- | --- | --- |
| `401` | `Invalid token or no user signed in` | The Bearer token is missing, invalid, or deleted. |
| `403` | `forbidden` | A Support key called an endpoint it can't use. See [Team roles](/docs/support/roles). |
| `403` | `team_suspended` | The account is suspended. Reads and deletes still work. Creating or changing clusters, domains, tenants, SMTP credentials, inboxes, webhooks, and templates doesn't. |
| `404` | `team_mismatch` | The team id in the path isn't the token's team. A cluster id, a malformed id, and another team's id all return this. |
| `404` | `Not found` | The record doesn't exist or belongs to another team. |

## Sending

| Status | `error` | Meaning |
| --- | --- | --- |
| `403` | `kyc_required` | Your account is pending production approval. Until then you can send only to team member emails, live inbox addresses, and inbox forward-to addresses. Also returned for a second cluster while pending. |
| `403` | `cluster_not_ready` | No cluster is `sending_ready`, or the one you chose isn't. |
| `403` | `domain_unverified` | `from` isn't on a verified sending domain. |
| `403` | `domain_suspended` | The From domain is paused. Resume it from [Managing domains](/docs/dashboard/domains/manage-domains) or with `POST /api/v1/sending_domains/:id/resume`. |
| `403` | `credential_missing` | The cluster has no live SMTP credential for that tenant. |
| `403` | `suppressed` | Every recipient is on the suppression list. If only some are, the send goes to the rest and lists the skipped addresses in `suppressed`. |
| `403` | `firewall` | A recipient failed a firewall check. `rule` names the check. |
| `409` | `idempotency_conflict` | An `Idempotency-Key` was reused with a different body, cluster, or `sandbox` flag on `POST /sends`. |
| `409` | `idempotency_in_progress` | A request with the same `Idempotency-Key` is still running. Retry in a few seconds. |
| `409` | `idempotency_outcome_unknown` | A request with the same `Idempotency-Key` timed out and may have been queued. PostShiba won't send it again with that key. Check the message's events before you use a new key. |
| `422` | `invalid` | A field is missing or wrong, for example no `to`, an unknown `tenant`, or `html` together with `template`. `field` names it. |
| `422` | `too_many_recipients` | `to`, `cc`, and `bcc` together have more than 50 addresses. Split the send, or use SMTP or HTTP inject for larger batches. |
| `429` | `rate_limited` | Over the REST request budget, per key or across the team. See [Rate limits](/docs/api-reference/introduction). |
| `429` | `throttled` | The cluster hit its hourly throttle or 24-hour cap, including any active boost. |
| `413` | `payload_too_large` | The request body is over 36 MB (`field` `body`), attachments are over 18 MB in total, or the composed message is over 25 MB. |
| `502` | `inject_failed` | The cluster didn't accept the message, or accepted no recipients. |
| `502` | `inject_timeout_unknown` | The cluster didn't answer in time. The message may have been queued, so a plain retry can send it twice. Retry with the same `Idempotency-Key` on `POST /sends`. |
| `503` | `inject_unavailable` | The cluster couldn't be reached. Nothing was sent. Retry. |
| `503` | `idempotency_unavailable` | `POST /sends` had an `Idempotency-Key`, and PostShiba couldn't store it. Nothing was sent. Retry. |

A `throttled` send stays rejected until the cluster has room again, so retrying straight away hits the same cap. Language clients raise the error and don't retry. SMTP answers `451 4.7.0` instead and does not keep the message. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap).

## Clusters, domains, and tenants

| Status | `error` | Meaning |
| --- | --- | --- |
| `403` | `payment_required` | The team has no payment method. Returned by cluster create, plan or size changes, capacity boosts, and paid IP adds. |
| `403` | `operator_hold` | Our abuse team paused the tenant. Contact support. |
| `403` | `dbl_listed` | The domain is on the Spamhaus Domain Block List. Resume it after the listing is removed. |
| `403` | `extensions_disabled` | Boost extensions are turned off. |
| `404` | `feature_disabled` | Capacity boosts aren't enabled for your team. |
| `422` | `archived` | The cluster is deprovisioned. |
| `503` | `dbl_unavailable` | The Spamhaus listing couldn't be rechecked. Try again shortly. |

## Network

| Status | `error` | Meaning |
| --- | --- | --- |
| `422` | `empty_inventory` | No IP of that class is available. |
| `422` | `class_mismatch` | The IP's class doesn't match the cluster's classification. |
| `422` | `cluster_required` | Shared IPs need a `cluster_id`. |
| `422` | `already_claimed` | Another team took that IP first. |
| `422` | `dedicated_taken` | The cluster already has a dedicated IP. |
| `422` | `not_dedicated` | Only dedicated IPs can be released. |
| `422` | `last_ip` | A cluster needs at least one sending IP. |
| `422` | `weights` | The traffic split across the cluster's IPs is invalid. |
| `422` | `sku_unprovisioned` | That IP product has no price yet. Contact support. |

## SMTP and HTTP inject

SMTP AUTH PLAIN on port 587 and HTTP Basic on HTTP inject use the same username and password. A correct password always logs in. After too many wrong passwords in a minute, SMTP answers further failures with `454 4.7.0 too many failed logins, try again later`.

SMTP replies with the codes below. HTTP inject runs the same checks.

| Reply | Meaning |
| --- | --- |
| AUTH fails | Wrong username or password, a disabled credential, or too many failed logins. HTTP inject returns `401`. |
| `530 5.7.0 Authentication required` | Port 587 got `MAIL FROM` before a successful login. |
| `550 authentication required` | The message was sent without logging in. |
| `550 sending disabled` | The cluster isn't allowed to send right now, for example because it's suspended. |
| `550 unverified domain` | The `MAIL FROM` domain isn't a verified domain for that credential's tenant. |
| `550 domain_suspended` | The `MAIL FROM` domain is paused. |
| `550 from header not aligned with verified domain` | The `From` header is missing or uses a domain that isn't verified. |
| `550 kyc_required` | Your account is pending production approval and the recipient isn't allowed yet. |
| `550 suppressed` | The recipient is on the suppression list. SMTP refuses it at `RCPT TO`, and the message still goes to the other recipients. |
| `550 firewall: <rule>` | The recipient failed a firewall check. See [Email firewall](/docs/dashboard/emails/email-firewall). |
| `550 5.7.1 spam score` | The content filter scored the message as spam. |
| `451 temporary filter delay` | The content filter wants a second look. Retry later. |
| `550 5.7.1 blocked using dbl.spamhaus.org` | The sending domain is on the Spamhaus Domain Block List. |
| `550 5.7.1 spam score` | The spam filter scored the message too high to send. |
| `451 temporary filter delay` | The spam filter wants another look. Retry later. |
| `550 5.7.1 blocked using dbl.spamhaus.org` | The From domain is on the Spamhaus Domain Block List. |
| `550 5.7.1 blocked using authbl.spamhaus.org` | The IP your app connects from is on the Spamhaus AuthBL. |
| `451 4.4.5 too many sessions, slow down` | Too many new sessions for one username. Reuse connections and retry. |
| `429 hourly send limit reached` | HTTP inject only. The cluster is at its hourly throttle. |
| `429 daily send limit reached` | HTTP inject only. The cluster is at its 24-hour cap. |
| `451 4.7.0 hourly send limit reached` | SMTP only. The cluster is at its hourly throttle. The message was not kept. |
| `451 4.7.0 daily send limit reached` | SMTP only. The cluster is at its 24-hour cap. The message was not kept. |
| `552 5.3.4 message too large` | HTTP inject only. The built message is over 25 MB. |

Inbound mail to your inboxes gets `451 hourly inbound limit reached` when the team is over its hourly receiving allowance. The sending server retries later.

## Next steps

- [REST API](/docs/api-reference/introduction)
- [Sending](/docs/api-reference/sending)
- [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap)
- [Why did sending stop?](/docs/support/why-did-sending-stop)
