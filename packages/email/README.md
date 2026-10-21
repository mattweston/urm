# URM email

`@urm/email` provides the Cloudflare REST and SMTP transports, message
templates, attachment validation, and the Alchemy stacks for outbound sending
and inbound routing. `@urm/auth` owns account authorization and `@urm/db` owns
the database schema and connection; this package's `src/postgres/` modules own
email delivery persistence and reconciliation.

## Delivery lifecycle

The newsletter ledger distinguishes work that has never been attempted from a
claimed delivery whose provider outcome may be unknown. Recovery and provider
events resolve that ledger without automatically resending claimed messages.
The implementation contracts live beside their owners:

- [Newsletter dispatch](src/postgres/newsletter.ts) owns recipient preparation,
  claims and provider submission.
- [Recovery](src/postgres/recovery.ts) explains the grace period and why an
  interrupted request cannot be treated as a safe retry.
- [Provider events](src/postgres/provider-events.ts) owns durable correlation,
  duplicate handling, outcome ordering and subscriber suppression.

## Development sender setup

First confirm that `mail.urm.dev` is enabled in Cloudflare Email Service and
that the API token has the Email Sending permission, then set the variables
below in the server's environment:

### Cloudflare account ID

In the Cloudflare dashboard, press `Cmd/Ctrl+K`, search for **Copy account ID**,
and select the result. The Account ID is also shown under **Workers & Pages →
Account Details** and in the API section of the `urm.dev` Overview page. Do not
use the Zone ID.

### Cloudflare API token

For a durable application credential, go to **Manage Account → Account API
Tokens → Create Token**. Account-owned tokens require the appropriate account
administrator role. Alternatively, create a user-owned token from **My Profile
→ API Tokens → Create Token**.

Create a custom token named for the URM email sender and grant only **Account →
Email Sending → Edit** for the account that owns `urm.dev`. Copy the token when
Cloudflare displays it; its secret is shown only once. Do not paste the token
into source files, documentation, chat, or a shell command.

Cloudflare references:

- [Find account and zone IDs](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/)
- [Create an API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [Email Service authentication](https://developers.cloudflare.com/email-service/api/send-emails/rest-api/#authentication)

### Environment configuration

`CloudflareEmailConfig` in `@urm/env/server` reads these through Effect `Config`,
so they come from the server process environment. `packages/env/.env.example`
lists them with their defaults:

```
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_EMAIL_API_TOKEN=
CLOUDFLARE_EMAIL_FROM="notifications@mail.urm.dev"
CLOUDFLARE_EMAIL_TRANSPORT=rest
CLOUDFLARE_EMAIL_ENABLED=true
```

Set the enable flag last so a partially configured server cannot send. Never
expose the API token through a `VITE_` or `PUBLIC_` variable, and restart the
server after changing any of them.

The `/mail/send` page sends transactional messages through these transports.
`support@urm.dev` must have a verified Cloudflare Email Routing destination
before it is used as the reply address.

## Infrastructure

Preview sending-domain changes before applying them:

```bash
pnpm --filter @urm/email exec alchemy plan alchemy.run.ts --stage production --profile default
pnpm --filter @urm/email deploy:email -- --stage production --profile default
```

Preview and deploy inbound routing after replacing the forwarding address:

```bash
URM_EMAIL_FORWARD_TO=you@example.com pnpm --filter @urm/email exec alchemy plan alchemy.routing.run.ts --stage production --profile default
URM_EMAIL_FORWARD_TO=you@example.com pnpm --filter @urm/email deploy:email-routing -- --stage production --profile default
```

Review each Alchemy plan and confirm the Cloudflare account and `urm.dev` zone
before deployment.

## Verification

```bash
pnpm --filter @urm/email typecheck
pnpm --filter @urm/email test
```

## Sending streams and event rollout

Transactional and newsletter sending use separate domains to isolate their
reputation. The infrastructure stacks and newsletter stream validation own the
configured hostnames; a stream must be verified before bulk dispatch.

The event consumer is separate from submission. Configure its account, queue and
subscription allowlist through the server's typed configuration. Before enabling
it in a hosted environment, verify that a live send's provider message id matches
its event message id. A missing match must remain pending rather than trigger a
resend. See [cloudflare-events.ts](src/cloudflare-events.ts) and
[provider-events.ts](src/postgres/provider-events.ts).

Inbound routing is separate infrastructure: confirm the forwarding destination
and verify it before relying on reply delivery. Provider pricing and quotas are
external operational inputs; consult the provider's current documentation rather
than treating historical numbers as repository constants.
