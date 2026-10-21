# Introduction

> PostShiba is an email API for SaaS platforms that send and receive email on behalf of their customers.

Send from your customers' domains, give each customer their own sending controls, and trace every delivery problem from one place. You send over SMTP, HTTP inject, or the REST API, and receive mail into hosted or domain-bound inboxes.

## Quickstart

1. [Create an API key](/docs/create-an-api-key) in the dashboard.
2. [Add and verify a domain](/docs/add-a-domain). Sending waits until DKIM verifies.
3. [Choose a send path](/docs/sending-emails) and send your first message with [HTTP](/docs/send-with-http), [SMTP](/docs/send-with-smtp), or an [SDK](/docs/sdks).

Until your account is approved for production, you can send only to your team members' emails, your live inbox addresses, and inbox forward-to addresses. See [Does PostShiba require production approval?](/docs/knowledge-base/does-capsule-require-production-approval)

## Core concepts

| Concept | What it is |
| --- | --- |
| [Cluster](/docs/dashboard/clusters/introduction) | A named sending environment with a shared sending IP, a monthly capacity plan, an SMTP host, and an HTTP inject URL. Keep transactional and bulk mail on separate clusters. |
| [Domain](/docs/dashboard/domains/introduction) | A sending domain you verify with DKIM. You can send from any address on it. |
| [Tenant](/docs/dashboard/tenants/introduction) | One of your customers. Tenants isolate domains, SMTP credentials, inboxes, suppressions, and webhooks. |
| [Inbox](/docs/dashboard/receiving/introduction) | An address that receives mail and forwards it or POSTs it to your webhook. |
| [Suppression](/docs/dashboard/emails/email-suppressions) | An address PostShiba won't send to, after a hard bounce, a spam report, an unsubscribe, or a manual add. |
| [Webhook](/docs/webhooks/introduction) | A URL that receives delivery events such as `delivered` and `bounce`. |

## Build something

These guides combine the APIs into complete products.

- [Send basic transactional emails with PostShiba](/docs/guides/send-transactional-email)
- [Build an ESP on PostShiba](/docs/guides/build-an-esp)
- [Build an email support desk on PostShiba](/docs/guides/build-email-support-desk)
- [Build an AI agent inbox on PostShiba](/docs/guides/build-ai-agent-inbox)
- [Protect sign-ups with ShieldShiba](/docs/guides/protect-signups-with-shieldshiba)

## Next steps

- [REST API reference](/docs/api-reference/introduction)
- [Connect MCP](/docs/connect-mcp) to set up and query PostShiba from Cursor
- [Migration guides](/docs/migration-guides/sendgrid) for moving from another provider
