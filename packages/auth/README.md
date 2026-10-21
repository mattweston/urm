# @urm/auth

- [Auth - Effect](https://github.com/Effect-TS/auth)
- [Yielded](https://yielded.dev)


Account authentication and workspace authorization for the PostgreSQL server.
The canonical implementation lives in [account/service.ts](src/account/service.ts);
retained contact-based APIs are exposed separately through the legacy surface.

## Identity and authority

Accounts own credentials, sessions and organization memberships. Contacts are CRM
records: importing a contact or matching its email does not grant an account
access or establish an identity link. Account/contact linkage must be explicit.

HTTP and RPC entrypoints derive identity from the request's actual session.
A caller-supplied account, domain or role is a requested scope, never authority.
`require_account_domain` rechecks the live session, account, organization and
membership and applies write and module requirements. Hiding a route or retaining
a signed-in client profile cannot replace these checks.

Login uses a shared global admission limit before per-email state and password
work. Session authentication checks idle and absolute expiry; logout revokes the
session. The implementation's TSDoc owns the detailed limits and lifecycle.

Public customer or member APIs need their own actor/session boundary; staff
workspace permission must not be reused as public-site authorization.

## Random identifiers in development and production

Browser `crypto.randomUUID()` requires a secure context. When the client is
opened over plain HTTP on a remote development hostname such as `urm.test`,
the browser can withhold that API. The restriction depends on the page origin,
not the Linux host or whether the connection travels through Tailscale. HTTPS
production supports the API in compatible browsers; Node's `node:crypto`
implementation is independent of browser origin restrictions.

**Outstanding compatibility issue:** many client call sites still invoke
`crypto.randomUUID()` directly, including module initialization in
[session.ts](../../apps/client/src/auth/session.ts) and
[contacts/model.ts](../../apps/client/src/contacts/model.ts). These calls can
prevent startup on the plain-HTTP development origin. Documenting the issue
does not fix those call sites.

Production does not require this specific UUID API. Choose the identifier format
and randomness for its purpose: `crypto.getRandomValues()` also supplies
cryptographic randomness and is available in insecure contexts. Its availability
does not make an HTTP connection secure or its output automatically a UUID.

[randomHexId](../utils/src/rand.ts) uses `getRandomValues` when available but
falls back to `Math.random()` when it is unavailable. It therefore cannot promise
unguessability. Never use this helper for session tokens, reset tokens, secrets,
or capability identifiers whose security depends on being unguessable, in any
environment. Those paths must use a cryptographic source and fail if it is
unavailable; a development fallback must not silently weaken that requirement.

API references: [randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
and [getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues).

## Hostnames

A domain (tenant) is reached by a **generated host** — `<name>.<suffix>` — or by
a **custom domain** it owns. `generated-hosts.ts` holds the suffixes:
`.localhost` when the browser and the servers share a machine, `.urm.dev` in
production, plus one derived from `TAILSCALE_URL` when dev runs on a box browsed
by name.

### Why the dev suffix uses `.test`

The dev hosts live under `.test` (`urm.test`, `test.urm.test`), **not** `.local`.
They are reserved by different RFCs for different jobs, and only one of them is
meant for this:

| TLD                    | RFC                                                        | Reserved for                              |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `.test`                | [6761](https://www.rfc-editor.org/rfc/rfc6761#section-6.2) | testing and development                   |
| `.localhost`           | [6761](https://www.rfc-editor.org/rfc/rfc6761#section-6.3) | the loopback host                         |
| `.example`, `.invalid` | [6761](https://www.rfc-editor.org/rfc/rfc6761)             | documentation, deliberately-invalid names |
| `.local`               | [6762](https://www.rfc-editor.org/rfc/rfc6762#section-3)   | **multicast DNS** (Bonjour / Zeroconf)    |

`.local` reads nicer, which is why it is a common choice — but it is not a
generic "local development" TLD. It belongs to mDNS, and on macOS, and on Linux
running Avahi or systemd-resolved, a `.local` lookup is short-circuited to
multicast on `224.0.0.251:5353` and **never reaches the configured resolver**.
A dnsmasq wildcard for `*.urm.local` would therefore be ignored, and a Tailscale
split-DNS route for the same suffix would be competing with mDNS for it.

`.test`, by contrast, is guaranteed never to be delegated in the public DNS root,
so it cannot collide with a real domain and resolvers treat it as local by
construction. That is exactly the property a dev suffix needs.

### Central hosts are not tenants

A generated host and a central host have the same shape — `urm.urm.dev` parses
as "tenant named `urm`" under the `.urm.dev` suffix, just as `test.urm.dev`
parses as "tenant named `test`". Central hosts escape that only by being listed
explicitly, in `central_hostnames` and `generatedHostSuffixForCentralHostname`.

Two consequences worth knowing:

- Every central subdomain **reserves the matching tenant name**. Nothing enforces
  this — `Domain.name` is an unconstrained `Schema.String` with no reserved-name
  list — so a tenant could be created that collides with a central host.
- Cookies scoped to the tenant suffix are refused on purpose. `cookie-opts.ts`
  throws on `Domain=urm.dev`, because a cookie there would be sent to every
  tenant beneath it. A central session therefore cannot be shared sideways to a
  tenant host, which is why `createDomainSessionHandoff` mints a one-time code
  instead.

---

title: Auth Checklist
description: A concise reference for choosing identity, provisioning, and access-grant mechanisms.

---

Authentication establishes who or what is making a request. Authorization determines the access that identity or client receives. Provisioning decides who should have an account before either occurs.

## Mechanisms by question answered

| Mechanism               | Category                  | Question it answers                                               |
| ----------------------- | ------------------------- | ----------------------------------------------------------------- |
| SCIM                    | Enterprise provisioning   | Who should have an account?                                       |
| Passkey                 | Authentication            | Does the user control the registered private key?                 |
| Password                | Authentication            | Does the user know the registered secret?                         |
| Email one-time passcode | Authentication            | Can the user verify control of this email address?                |
| TOTP                    | Authentication            | Does the user have the current authenticator code?                |
| OpenID Connect          | Enterprise authentication | Which identity provider authenticated the user?                   |
| SAML                    | Enterprise authentication | Which legacy enterprise identity provider authenticated the user? |
| OAuth                   | Delegated authorization   | What may this client do on a user's behalf?                       |
| API key                 | Client authorization      | What may this key access?                                         |
| Mutual TLS              | Service authentication    | Does this service control a trusted private key?                  |
| Wallet signature        | Transaction authorization | Does the holder approve this specific transaction?                |

## Selection rules

- Use SCIM to provision and deprovision enterprise accounts; it does not authenticate browser requests.
- Use passkeys, OIDC, email OTP, or passwords to establish a user session. Require a second factor or recent authentication for high-risk actions.
- Use OAuth scopes, API-key restrictions, and server-side capability checks to authorize clients. An OAuth grant or API key is not a substitute for a user session unless the route is explicitly designed for it.
- Use mutual TLS for service-to-service identity and wallet signatures only where the signed payload, chain, nonce, and expiry are verified server-side.

In URM, `@urm/auth` verifies PostgreSQL account sessions and workspace authority.
The browser treats identity and capabilities as presentation data; server checks
remain authoritative. See [account/service.ts](src/account/service.ts).
