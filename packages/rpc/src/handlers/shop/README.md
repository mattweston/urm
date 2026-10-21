# Shop persistence boundaries

The account Remote path uses `catalog-repository.ts`, `cart-repository.ts`,
`order-repository.ts` and `payment-repository.ts`. The older `repository.ts`
is not the canonical account catalog implementation.

Catalog and cart references remain workspace-owned and must be revalidated on
writes. Cart lines cache display details while retaining catalog references.
Order lines snapshot those details so historical orders survive later catalog
edits. Checkout rechecks the cart revision and stock, snapshots selected lines,
and returns the existing order when its checkout key is replayed.

Payment reservations bind a request key to an order and its server-derived amount
and currency. Provider event receipts retain identifiers and a payload hash,
not raw webhook bodies. Reserving a payment is not evidence that money moved;
provider processing and endpoint authorization are separate boundaries.

`public-cart-session.ts` supplies domain-bound token helpers. A public cart
endpoint must derive scope from its verified token and hostname; it cannot trust
a caller-supplied staff or cart session identifier.
