# Sending

> SMTP, HTTP inject, POST /emails, and POST /sends.

Send through SMTP or HTTP inject on the cluster's host, or through the REST API. For high-volume sending, use SMTP or HTTP inject. POST /emails and POST /sends compose the message on the server and suit lower-volume transactional sends. POST /emails picks a cluster for you: the one named in the optional X-Capsule-Cluster-Id header, else a sending-ready cluster with a live credential for the tenant, else the first sending-ready cluster. POST /sends targets the cluster in its path. Every path needs a sending_ready cluster and a From address on a verified domain. To send a published Liquid template, pass template.id (alias or public id) and variables instead of html or text. Set unique_args to get your own fields back on every delivery webhook. Set the X-Capsule-Ip header to send one message from a specific sending IP on its cluster. Any other IP is rejected.

## SMTP smtp.postshiba.com:587

AUTH PLAIN after STARTTLS on port 587. Submit multipart MIME in DATA. Attachments in the body are delivered as sent. Messages over 25 MB are rejected. SMTP DATA is not rewritten and is not type-filtered. REST and the dashboard accept images (JPEG, PNG, GIF, WebP), PDF, Word .doc/.docx, and calendar invites (.ics) only.

- `username`: Issued on the cluster. Shown as smtp_…
- `password`: Shown once when you issue the credential
- `MAIL FROM`: Must be a verified sending domain
- `DATA`: RFC822. Multipart attachments pass through. 25 MB cap. Types are not rewritten on SMTP.
- `X-Capsule-Unique-Args`: JSON object. Comes back on every delivery webhook. Not added to the sent mail.
- `X-Capsule-Ip`: Optional. A sending IP on this cluster. The message leaves from that IP only. Any other IP is rejected with 550. Not added to the sent mail.

```bash request.sh
swaks --server smtp.postshiba.com:587 --tls \
  --auth PLAIN --auth-user smtp_9 --auth-password YOUR_PASSWORD \
  --from hello@mail.example.com --to you@example.com \
  --header "Subject: PostShiba test" \
  --header 'X-Capsule-Unique-Args: {"campaign_id":"cmp_123","site":"docs"}' \
  --body "see attached" \
  --attach-name note.txt \
  --attach-type text/plain \
  --attach-body "hello"
```

```json response.json
{
  "result": "250 2.0.0 Ok: queued"
}
```

## POST https://inject.postshiba.com/api/inject/v1

HTTP inject. HTTP Basic is the SMTP username and password.

- `envelope_sender`: Verified From domain
- `content`: RFC822 string or {text_body, html_body, headers, attachments}
- `recipients`: [{email}]
- `X-Capsule-Unique-Args`: JSON object on content.headers. Stripped before send. Echoed on delivery webhooks.
- `X-Capsule-Ip`: Optional, on content.headers. A sending IP on this cluster. The message leaves from that IP only. Any other IP is rejected. Stripped before send.

```bash request.sh
curl -sS -u 'smtp_9:YOUR_PASSWORD' \
  -H 'Content-Type: application/json' \
  -d '{"envelope_sender":"hello@mail.example.com","content":{"text_body":"hello from PostShiba","headers":{"From":"hello@mail.example.com","Subject":"PostShiba test","X-Capsule-Unique-Args":"{\"campaign_id\":\"cmp_123\",\"site\":\"docs\"}"},"attachments":[{"file_name":"photo.png","content_type":"image/png","data":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==","base64":true}]},"recipients":[{"email":"you@example.com"}]}' \
  https://inject.postshiba.com/api/inject/v1
```

```json response.json
{
  "success_count": 1,
  "fail_count": 0,
  "failed_recipients": [],
  "errors": []
}
```

## POST /api/v1/emails

Compose a message and queue it. Suits lower-volume transactional sends. For high-volume sending, use SMTP or HTTP inject. Takes the same body as POST /sends, flat or wrapped in {send:}. The cluster is the one in X-Capsule-Cluster-Id, else a sending-ready cluster with a live credential for the tenant, else the first sending-ready cluster. Returns 403 {error: cluster_not_ready, field: cluster} when none qualifies, and 404 for a cluster your team does not own. Leave from blank to send as hello@ on the tenant's first sending-ready domain. The whoami email is not a valid From. Omit tenant for the team's default tenant. An unknown tenant is 422 invalid.

- `from`: Optional. Blank sends as hello@ on the tenant's first sending-ready domain. The whoami email is not a valid From.
- `to`: Recipient list. to, cc, and bcc together hold at most 50 addresses. More is 422 {error: too_many_recipients, field: to}. Suppressed addresses are skipped and listed in suppressed on the response. If every recipient is suppressed, the send is 403 {error: suppressed}.
- `cc`: Cc addresses. Array or comma-separated string.
- `bcc`: Envelope recipients only. The composed mail omits the Bcc header.
- `html`: HTML body. Do not pass with template.
- `attachments`: Array of {filename, content_type, content}. filename is required and its extension must match the contents: .jpg, .png, .gif, .webp, .pdf, .doc, .docx, or .ics. content is base64. The file is sent with the type read from its bytes, not content_type. A file that cannot be identified is 422. An .ics must start with BEGIN:VCALENDAR. At most 10 files, each at most 18 MB. Over 18 MB in total is 413 {error: payload_too_large, field: attachments}.
- `headers`: Extra headers as a JSON object. Names must be RFC 5322 field names: printable ASCII with no space or colon. Any other name is 422 {error: invalid, field: headers}. Reserved names are ignored: From, Sender, To, Cc, Bcc, Reply-To, Subject, Date, Received, Return-Path, MIME-Version, DKIM-Signature, Authentication-Results, X-Tenant-Id, and any Content-*, Resent-*, or X-Capsule-* name other than X-Capsule-Ip. _ counts as -. List-Unsubscribe, List-Id, In-Reply-To, References, Message-ID, Precedence, and X-* headers are kept.
- `tenant`: Optional id or slug. Omitted is the default tenant. Unknown is 422. With no X-Capsule-Cluster-Id, picks a sending-ready cluster that has a live credential for that tenant.
- `unique_args`: JSON object. Set as X-Capsule-Unique-Args on the composed mail. At most 32 keys. Key at most 64 bytes. Value at most 256 bytes. Scalars only.
- `template`: Optional. {id, variables}. id is the template alias or public id. Mutually exclusive with html and text. The template must be published. variables can be at most 64 KB as JSON. A loop over more than 10,000 items, or output over about 1 MB, is 422 {error: invalid, field: template}.
- `X-Capsule-Cluster-Id`: Optional request header. Public cluster id the token's team owns. Overrides tenant and first-ready pick.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"from":"hello@mail.example.com","to":["you@example.com"],"cc":[],"bcc":[],"reply_to":"hello@mail.example.com","subject":"PostShiba test","text":"hello from PostShiba","html":"\u003cp\u003ehello from PostShiba\u003c/p\u003e","attachments":[{"filename":"photo.png","content_type":"image/png","content":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="}],"headers":{"X-Campaign":"cmp_123"},"unique_args":{"campaign_id":"cmp_123","site":"docs"},"tenant":"default"}' \
  https://app.postshiba.com/api/v1/emails
```

```json response.json
{
  "queued": true,
  "message_id": "abc@capsule.test",
  "from": "hello@mail.example.com",
  "to": [
    "you@example.com"
  ],
  "suppressed": [],
  "subject": "PostShiba test",
  "unique_args": {
    "campaign_id": "cmp_123",
    "site": "docs"
  }
}
```

## POST /api/v1/emails (emails-template)

Send a published template. Pass template.id (alias or public id) and Liquid variables. Do not pass html or text. from, subject, and reply_to on the request override the template. A subject override is not Liquid. html or text with template is 422 {error: invalid, field: template}. The template must be published.

- `from`: Optional. Overrides the template From. Blank falls back to the template From, then hello@ on the tenant's first sending-ready domain.
- `to`: Recipient list. to, cc, and bcc together hold at most 50 addresses. More is 422 {error: too_many_recipients, field: to}. Suppressed addresses are skipped and listed in suppressed on the response. If every recipient is suppressed, the send is 403 {error: suppressed}.
- `template`: {id, variables}. id is the alias or public template id. variables is the Liquid assign hash, at most 64 KB as JSON. A loop over more than 10,000 items, or output over about 1 MB, is 422 {error: invalid, field: template}.
- `subject`: Optional. Overrides the rendered template subject.
- `unique_args`: JSON object. Set as X-Capsule-Unique-Args on the composed mail.
- `X-Capsule-Cluster-Id`: Optional request header. Public cluster id the token's team owns.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"from":"hello@mail.example.com","to":["you@example.com"],"template":{"id":"welcome","variables":{"name":"Ada","body":"Your account is ready."}},"unique_args":{"campaign_id":"cmp_123","site":"docs"}}' \
  https://app.postshiba.com/api/v1/emails
```

```json response.json
{
  "queued": true,
  "message_id": "abc@capsule.test",
  "from": "hello@mail.example.com",
  "to": [
    "you@example.com"
  ],
  "suppressed": [],
  "subject": "Hi Ada",
  "unique_args": {
    "campaign_id": "cmp_123",
    "site": "docs"
  }
}
```

## POST /api/v1/teams/:obfuscated_team_id/clusters/:obfuscated_cluster_id/sends

Compose a message and queue it on the cluster in the path. For high-volume sending, use SMTP or HTTP inject. Set sandbox to run every check and compose the message without sending it. A sandbox send returns 200 with queued false. Send an Idempotency-Key to make retries safe: the same key and body return the first 201 for 24 hours, and the same key with a different body, cluster, or sandbox flag is 409 idempotency_conflict. While the first request is still running, the same key is 409 idempotency_in_progress. If that request timed out and may have been queued, the key is 409 idempotency_outcome_unknown for 24 hours and nothing is sent again. A request with a key is 503 idempotency_unavailable when keys cannot be stored, and nothing is sent. Leave from blank to send as hello@ on the tenant's first sending-ready domain. The whoami email is not a valid From. Omit tenant for the team's default tenant. Failures return {error, field, message}: 422 invalid, 422 too_many_recipients over 50 recipients, 403 cluster_not_ready, domain_unverified, domain_suspended, credential_missing, suppressed when every recipient is suppressed, firewall, or kyc_required, 429 rate_limited for the REST send budget (300 a minute per key, 600 a minute per team), 429 throttled for cluster capacity, 413 payload_too_large when the request body is over 36 MB or attachments or the composed message are too large, 502 inject_failed when the cluster did not accept the message or any of its recipients, 502 inject_timeout_unknown when the cluster did not answer in time and the message may have been queued, and 503 inject_unavailable when the cluster could not be reached and nothing was sent. throttled and inject errors carry retryable.

- `from`: Optional. Blank sends as hello@ on the tenant's first sending-ready domain. The whoami email is not a valid From.
- `to`: Recipient list. to, cc, and bcc together hold at most 50 addresses. More is 422 {error: too_many_recipients, field: to}. Suppressed addresses are skipped and listed in suppressed on the response. If every recipient is suppressed, the send is 403 {error: suppressed}.
- `cc`: Cc addresses. Array or comma-separated string.
- `bcc`: Envelope recipients only. The composed mail omits the Bcc header.
- `html`: HTML body. Do not pass with template.
- `attachments`: Array of {filename, content_type, content}. filename is required and its extension must match the contents: .jpg, .png, .gif, .webp, .pdf, .doc, .docx, or .ics. content is base64. The file is sent with the type read from its bytes, not content_type. A file that cannot be identified is 422. An .ics must start with BEGIN:VCALENDAR. At most 10 files, each at most 18 MB. Over 18 MB in total is 413 {error: payload_too_large, field: attachments}.
- `headers`: Extra headers as a JSON object. Names must be RFC 5322 field names: printable ASCII with no space or colon. Any other name is 422 {error: invalid, field: headers}. Reserved names are ignored: From, Sender, To, Cc, Bcc, Reply-To, Subject, Date, Received, Return-Path, MIME-Version, DKIM-Signature, Authentication-Results, X-Tenant-Id, and any Content-*, Resent-*, or X-Capsule-* name other than X-Capsule-Ip. _ counts as -. List-Unsubscribe, List-Id, In-Reply-To, References, Message-ID, Precedence, and X-* headers are kept.
- `tenant`: Optional id or slug. Omitted or blank is the team's default tenant. Unknown is 422 invalid.
- `unique_args`: JSON object. Set as X-Capsule-Unique-Args on the composed mail. At most 32 keys. Key at most 64 bytes. Value at most 256 bytes. Scalars only.
- `template`: Optional. {id, variables}. id is the template alias or public id. Mutually exclusive with html and text. The template must be published. variables can be at most 64 KB as JSON. A loop over more than 10,000 items, or output over about 1 MB, is 422 {error: invalid, field: template}.
- `sandbox`: true, "true", or 1 composes without inject. Success is 200 with queued false. Any other value is a live send.
- `Idempotency-Key`: Optional header, 1 to 256 characters. Same key and body returns the first 201 for 24 hours. Same key and a different body, cluster, or sandbox flag is 409 idempotency_conflict. 409 idempotency_in_progress while the first request runs. 409 idempotency_outcome_unknown after a timeout that may have queued the message. 503 idempotency_unavailable when keys cannot be stored.

```bash request.sh
curl -sS -X POST \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"from":"hello@mail.example.com","to":["you@example.com"],"cc":[],"bcc":[],"reply_to":"hello@mail.example.com","subject":"PostShiba test","text":"hello from PostShiba","html":"\u003cp\u003ehello from PostShiba\u003c/p\u003e","attachments":[{"filename":"photo.png","content_type":"image/png","content":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="}],"headers":{"X-Campaign":"cmp_123"},"unique_args":{"campaign_id":"cmp_123","site":"docs"},"tenant":"default"}' \
  https://app.postshiba.com/api/v1/teams/KjkAJW/clusters/:obfuscated_cluster_id/sends
```

```json response.json
{
  "queued": true,
  "message_id": "abc@capsule.test",
  "from": "hello@mail.example.com",
  "to": [
    "you@example.com"
  ],
  "suppressed": [],
  "subject": "PostShiba test",
  "unique_args": {
    "campaign_id": "cmp_123",
    "site": "docs"
  }
}
```

## HEADER X-Capsule-Unique-Args

Your own fields, returned on every delivery webhook for the message. PostShiba removes the header before sending. Each key is copied onto the event unless PostShiba already set that field, and the full object appears as unique_args. At most 32 keys, keys up to 64 bytes, and values up to 256 bytes. Scalars only. Objects and arrays are dropped. Over SMTP and HTTP inject you can also use X-SMTPAPI unique_args, X-Tenant-Id, X-Category, or X-Campaign-Id. Those headers are removed too, and X-Capsule-Unique-Args wins on a colliding key.

- `campaign_id`: Your campaign or broadcast id
- `category`: transactional, newsletter, and the rest
- `account`: Your team or account id
- `site`: Your site or project id
- `tenant_id`: On the webhook this stays the PostShiba tenant. Use account or site for your own id.
- `X-Capsule-Unique-Args`: JSON object. Wins on a colliding key.
- `X-SMTPAPI`: JSON object. Reads unique_args inside it.
- `X-Tenant-Id`: Sets tenant_id in unique args. The webhook still uses the PostShiba tenant slug.
- `X-Category`: Sets category.
- `X-Campaign-Id`: Sets campaign_id.

```json X-Capsule-Unique-Args.json
{
  "campaign_id": "cmp_123",
  "category": "transactional",
  "account": "team_1",
  "site": "docs"
}
```

```json response.json
{
  "event": "delivered",
  "email": "you@example.com",
  "campaign_id": "cmp_123",
  "category": "transactional",
  "account": "team_1",
  "site": "docs",
  "unique_args": {
    "campaign_id": "cmp_123",
    "category": "transactional",
    "account": "team_1",
    "site": "docs"
  }
}
```
