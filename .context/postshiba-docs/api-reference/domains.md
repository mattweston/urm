# Sending domains

> Create, verify, import DKIM, refresh keys, suspend, resume, and delete domains.

A sending domain holds its DKIM, return-path, and DMARC records. Sending waits until DKIM verifies. By default DKIM is a CNAME to PostShiba, and the return-path CNAME at rp.{name} must verify too. To bring an existing key, for example when migrating from another provider, set dkim_manual and dkim_private_key and publish the TXT record yourself. A domain with an imported key can send before rp.{name} verifies. Your first domain becomes the account primary, and every outbound message is also DKIM-signed with the primary domain.

## GET /api/v1/teams/:obfuscated_team_id/sending_domains

List sending domains and their DNS records.

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/sending_domains
```

```json response.json
[
  {
    "id": "HsVtYk",
    "name": "mail.example.com",
    "tenant_id": "WbLcFd",
    "tenant": "default",
    "dkim_status": "pending",
    "return_path_status": "pending",
    "dmarc_status": "pending",
    "sending_allowed": false,
    "dkim_selector": "ps1",
    "dkim_manual": false,
    "dkim_txt": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA",
    "dkim_cname_host": "ps1._domainkey.mail.example.com",
    "dkim_cname_target": "HsVtYk.customers.capsule.test",
    "dmarc_host": "_dmarc.mail.example.com",
    "dmarc_record": "v=DMARC1; p=none;",
    "return_path_host": "rp.mail.example.com",
    "return_path_target": "rp.capsule.test",
    "last_verification_error": null,
    "suspended": false,
    "operator_held": false,
    "primary": false
  }
]
```

## GET /api/v1/sending_domains/:id

Get one domain, including DKIM CNAME, return-path, and DMARC.

- `id`: Public sending domain id

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/sending_domains/:sending_domain_id
```

```json response.json
{
  "id": "HsVtYk",
  "name": "mail.example.com",
  "tenant_id": "WbLcFd",
  "tenant": "default",
  "dkim_status": "pending",
  "return_path_status": "pending",
  "dmarc_status": "pending",
  "sending_allowed": false,
  "dkim_selector": "ps1",
  "dkim_manual": false,
  "dkim_txt": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA",
  "dkim_cname_host": "ps1._domainkey.mail.example.com",
  "dkim_cname_target": "HsVtYk.customers.capsule.test",
  "dmarc_host": "_dmarc.mail.example.com",
  "dmarc_record": "v=DMARC1; p=none;",
  "return_path_host": "rp.mail.example.com",
  "return_path_target": "rp.capsule.test",
  "last_verification_error": null,
  "suspended": false,
  "operator_held": false,
  "primary": false
}
```

## POST /api/v1/teams/:obfuscated_team_id/sending_domains

Create a domain. Name must be a fully qualified host such as mail.example.com. Optional tenant_id. Defaults to the team's default tenant. Optional dkim_selector, dkim_manual, and dkim_private_key (PEM) to import an existing key. dkim_manual skips our CNAME and checks the TXT at the selector instead. Queues a DNS check.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"sending_domain":{"name":"mail.example.com","tenant_id":"WbLcFd"}}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/sending_domains
```

```json response.json
{
  "id": "HsVtYk",
  "name": "mail.example.com",
  "tenant_id": "WbLcFd",
  "tenant": "default",
  "dkim_status": "pending",
  "return_path_status": "pending",
  "dmarc_status": "pending",
  "sending_allowed": false,
  "dkim_selector": "ps1",
  "dkim_manual": false,
  "dkim_txt": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA",
  "dkim_cname_host": "ps1._domainkey.mail.example.com",
  "dkim_cname_target": "HsVtYk.customers.capsule.test",
  "dmarc_host": "_dmarc.mail.example.com",
  "dmarc_record": "v=DMARC1; p=none;",
  "return_path_host": "rp.mail.example.com",
  "return_path_target": "rp.capsule.test",
  "last_verification_error": null,
  "suspended": false,
  "operator_held": false,
  "primary": false
}
```

## PATCH /api/v1/sending_domains/:id

Change the DKIM selector, switch dkim_manual, or import a PEM private key. Breaks authentication and sending until the new record verifies. Never returns dkim_private_key.

- `id`: Public sending domain id

```bash request.sh
curl -sS -X PATCH \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"sending_domain":{"dkim_selector":"s1","dkim_manual":true,"dkim_private_key":"YOUR_PEM"}}' \
  https://app.postshiba.com/api/v1/sending_domains/:sending_domain_id
```

```json response.json
{
  "id": "HsVtYk",
  "name": "mail.example.com",
  "tenant_id": "WbLcFd",
  "tenant": "default",
  "dkim_status": "pending",
  "return_path_status": "pending",
  "dmarc_status": "pending",
  "sending_allowed": false,
  "dkim_selector": "ps1",
  "dkim_manual": true,
  "dkim_txt": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA",
  "dkim_cname_host": "ps1._domainkey.mail.example.com",
  "dkim_cname_target": null,
  "dmarc_host": "_dmarc.mail.example.com",
  "dmarc_record": "v=DMARC1; p=none;",
  "return_path_host": "rp.mail.example.com",
  "return_path_target": "rp.capsule.test",
  "last_verification_error": null,
  "suspended": false,
  "operator_held": false,
  "primary": false
}
```

## POST /api/v1/sending_domains/:id/refresh

Issue new DKIM keys. Breaks authentication and sending until you publish the new CNAME or TXT and verify.

- `id`: Public sending domain id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/sending_domains/:sending_domain_id/refresh
```

```json response.json
{
  "id": "HsVtYk",
  "name": "mail.example.com",
  "tenant_id": "WbLcFd",
  "tenant": "default",
  "dkim_status": "pending",
  "return_path_status": "pending",
  "dmarc_status": "pending",
  "sending_allowed": false,
  "dkim_selector": "ps1",
  "dkim_manual": false,
  "dkim_txt": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA",
  "dkim_cname_host": "ps1._domainkey.mail.example.com",
  "dkim_cname_target": "HsVtYk.customers.capsule.test",
  "dmarc_host": "_dmarc.mail.example.com",
  "dmarc_record": "v=DMARC1; p=none;",
  "return_path_host": "rp.mail.example.com",
  "return_path_target": "rp.capsule.test",
  "last_verification_error": null,
  "suspended": false,
  "operator_held": false,
  "primary": false
}
```

## POST /api/v1/sending_domains/:id/verify

Run a DNS check now and return current statuses. A miss rechecks at 30 seconds, 2 minutes, and 5 minutes.

- `id`: Public sending domain id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/sending_domains/:sending_domain_id/verify
```

```json response.json
{
  "id": "HsVtYk",
  "name": "mail.example.com",
  "tenant_id": "WbLcFd",
  "tenant": "default",
  "dkim_status": "pending",
  "return_path_status": "pending",
  "dmarc_status": "pending",
  "sending_allowed": false,
  "dkim_selector": "ps1",
  "dkim_manual": false,
  "dkim_txt": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA",
  "dkim_cname_host": "ps1._domainkey.mail.example.com",
  "dkim_cname_target": "HsVtYk.customers.capsule.test",
  "dmarc_host": "_dmarc.mail.example.com",
  "dmarc_record": "v=DMARC1; p=none;",
  "return_path_host": "rp.mail.example.com",
  "return_path_target": "rp.capsule.test",
  "last_verification_error": null,
  "suspended": false,
  "operator_held": false,
  "primary": false
}
```

## POST /api/v1/sending_domains/:id/suspend

Pause sending for this domain.

- `id`: Public sending domain id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/sending_domains/:sending_domain_id/suspend
```

```json response.json
{
  "id": "HsVtYk",
  "name": "mail.example.com",
  "tenant_id": "WbLcFd",
  "tenant": "default",
  "dkim_status": "pending",
  "return_path_status": "pending",
  "dmarc_status": "pending",
  "sending_allowed": false,
  "dkim_selector": "ps1",
  "dkim_manual": false,
  "dkim_txt": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA",
  "dkim_cname_host": "ps1._domainkey.mail.example.com",
  "dkim_cname_target": "HsVtYk.customers.capsule.test",
  "dmarc_host": "_dmarc.mail.example.com",
  "dmarc_record": "v=DMARC1; p=none;",
  "return_path_host": "rp.mail.example.com",
  "return_path_target": "rp.capsule.test",
  "last_verification_error": null,
  "suspended": true,
  "operator_held": false,
  "primary": false
}
```

## POST /api/v1/sending_domains/:id/resume

Resume sending for this domain. Returns 422 {error: operator_held} while PostShiba support has turned the domain off, 403 {error: dbl_listed} while the domain is on the Spamhaus DBL, and 503 {error: dbl_unavailable} when the listing cannot be re-checked.

- `id`: Public sending domain id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/sending_domains/:sending_domain_id/resume
```

```json response.json
{
  "id": "HsVtYk",
  "name": "mail.example.com",
  "tenant_id": "WbLcFd",
  "tenant": "default",
  "dkim_status": "pending",
  "return_path_status": "pending",
  "dmarc_status": "pending",
  "sending_allowed": false,
  "dkim_selector": "ps1",
  "dkim_manual": false,
  "dkim_txt": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA",
  "dkim_cname_host": "ps1._domainkey.mail.example.com",
  "dkim_cname_target": "HsVtYk.customers.capsule.test",
  "dmarc_host": "_dmarc.mail.example.com",
  "dmarc_record": "v=DMARC1; p=none;",
  "return_path_host": "rp.mail.example.com",
  "return_path_target": "rp.capsule.test",
  "last_verification_error": null,
  "suspended": false,
  "operator_held": false,
  "primary": false
}
```

## POST /api/v1/sending_domains/:id/make_primary

Make this the account primary. Outbound mail is also DKIM-signed with this domain.

- `id`: Public sending domain id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/sending_domains/:sending_domain_id/make_primary
```

```json response.json
{
  "id": "HsVtYk",
  "name": "mail.example.com",
  "tenant_id": "WbLcFd",
  "tenant": "default",
  "dkim_status": "pending",
  "return_path_status": "pending",
  "dmarc_status": "pending",
  "sending_allowed": false,
  "dkim_selector": "ps1",
  "dkim_manual": false,
  "dkim_txt": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA",
  "dkim_cname_host": "ps1._domainkey.mail.example.com",
  "dkim_cname_target": "HsVtYk.customers.capsule.test",
  "dmarc_host": "_dmarc.mail.example.com",
  "dmarc_record": "v=DMARC1; p=none;",
  "return_path_host": "rp.mail.example.com",
  "return_path_target": "rp.capsule.test",
  "last_verification_error": null,
  "suspended": false,
  "operator_held": false,
  "primary": true
}
```

## POST /api/v1/sending_domains/:id/can_i_send_this

Mint a CanISendThis inbox and send a test from hello@domain.

- `id`: Public sending domain id

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  https://app.postshiba.com/api/v1/sending_domains/:sending_domain_id/can_i_send_this
```

```json response.json
{
  "token": "tok_cist",
  "email": "tok_cist@canisendthis.com",
  "poll_after_seconds": 2,
  "poll_path": "/api/v1/sending_domains/HsVtYk/can_i_send_this",
  "report_url": "https://canisendthis.com/tok_cist"
}
```

## GET /api/v1/sending_domains/:id/can_i_send_this

Poll the CanISendThis report for a minted token.

- `id`: Public sending domain id
- `token`: Inbox token from POST

```bash request.sh
curl -sS -X GET \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/sending_domains/:sending_domain_id/can_i_send_this
```

```json response.json
{
  "status": "ready",
  "report": {
    "subject": "Can I Send This check for mail.example.com",
    "from": "hello@mail.example.com",
    "score": {
      "pass": 8,
      "total": 10
    },
    "checks": [
      {
        "id": "spf",
        "kind": "pass",
        "detail": "SPF aligned"
      }
    ],
    "spf": {
      "kind": "pass",
      "detail": "aligned"
    },
    "dkim": {
      "kind": "pass",
      "detail": "valid"
    },
    "dmarc": {
      "kind": "none",
      "detail": ""
    },
    "spamassassin": {
      "score": 1.2
    },
    "report_url": "https://canisendthis.com/tok_cist"
  }
}
```

## DELETE /api/v1/sending_domains/:id

Remove a domain. Live inboxes block. Disabled inboxes do not.

- `id`: Public sending domain id

```bash request.sh
curl -sS -X DELETE \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  https://app.postshiba.com/api/v1/sending_domains/:sending_domain_id
```
