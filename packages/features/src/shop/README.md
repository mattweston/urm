# Shop feature

Status snapshot: 2026-09-22

`@urm/features/shop` is the canonical Foldkit feature for domain-scoped shop
administration and builder layouts. `apps/client` composes its routes and adapts
backend-neutral Commands to account-authenticated PostgreSQL Remote operations.
`.context/storefront` remains a behavior and UX reference.

## Current capability

- Domain-scoped products and normalized variants.
- Collections and normalized product/collection memberships.
- Product and collection create/edit/archive/restore controls.
- Domain-scoped media uploads through the shared authenticated upload path.
- A persistent preview cart with one line per variant, merged additions,
  quantity changes, removal, clear-cart, and reactive totals.
- Checkout contact/delivery capture.
- Pending order creation with immutable order-item snapshots.
- Idempotent repeated checkout submission for the same cart snapshot.
- Product, collection, cart, checkout, order, and receipt builder routes.

The active administration route uses the canonical PostgreSQL Shop schema under
`packages/db`. Catalog, cart, and order reads are bounded Remote queries that
load together on workspace entry and route return. Every mutation verifies the
authorized domain and related parent/child ownership.

## Ownership

| Concern                                                       | Owner                    |
| ------------------------------------------------------------- | ------------------------ |
| Backend-independent values and inputs                         | `@urm/domain`            |
| Tables, indexes, authorization, and persistence               | `@urm/db` and `@urm/rpc` |
| Models, Messages, updates, Commands, subscriptions, and views | `@urm/features/shop`     |
| Route composition and Remote adapter                          | `apps/client`            |
| Shared controls and theme tokens                              | `@urm/ui`                |
| Immutable public website rendering                            | `@urm/ssg`               |

The builder route displays the real selected layout with authenticated editing
controls. The generated public counterpart consumes a release snapshot and
omits the application shell, drafts, permissions, and editor controls.

## Cart and order invariants

- One cart line exists per variant; repeated additions merge quantities.
- Product, variant, stock, and domain ownership are rechecked on every write.
- Monetary values use integer minor units and server-derived totals.
- Orders render immutable item snapshots rather than current catalogue data.
- A browser transition never marks an order paid.
- The current preview cart is staff tooling, not a customer session.

Pending checkout is deliberately not payment. It validates stock but does not
reserve or decrement it, authorize money, or claim fulfilment.

## Next vertical slices

1. Persist any remaining cart, checkout, receipt, landing, SEO, and template
   configuration required by generated releases.
2. Define a signed, domain-bound public cart session with expiry and rotation.
3. Add hosted payment-session creation and signature-verified, idempotent
   provider webhooks.
4. Capture inventory transactionally when the chosen payment/manual
   confirmation policy says an order is committed.
5. Add customer/contact linkage, merge-on-sign-in, fulfilment transitions,
   transactional email, and private order access.
6. Add generated-site interactive enhancement and accessibility/browser tests.

Public customer carts, customer/member portals, and staff administration are
different actor models. Public endpoints must be session-scoped and must not
reuse domain-manager authority.

## Reference material

Parked Shop/database trees are product-requirement archives only. They include
useful ideas around cart merging, fulfilment, payment reconciliation, and email
idempotency, but also contain incompatible schemas and unsafe implementation
patterns. Adapt selected behavior to the current boundaries; never import the
parked code or establish a second backend path.

## Verification

Feature Story tests cover pure transitions, emitted Commands, failure recovery,
and idempotency. Scene tests cover customer-visible states and controls. Server
tests own tenancy, related-record ownership, stock, totals, and durable order
state.

```sh
pnpm --filter @urm/features typecheck
pnpm --filter @urm/features test
pnpm --filter server test
```
