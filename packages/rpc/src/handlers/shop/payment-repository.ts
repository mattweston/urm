import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain } from "@urm/auth"
import { Sql, query_rows } from "@urm/database/sql"
import {
    ShopPayment,
    ShopPaymentError,
    ShopStripeEventReceipt,
} from "@urm/domain/shop"
import type { ShopCatalogPrincipal } from "./catalog-repository.ts"

const PendingOrder = Schema.Struct({
    id: Schema.String,
    status: Schema.String,
    total_price: Schema.Number,
    currency: Schema.String,
})
const EventReceipt = Schema.Struct({
    id: Schema.String,
    event_type: Schema.String,
    provider_object_id: Schema.String,
    payload_sha256: Schema.String,
})

const unavailable = () =>
    new ShopPaymentError({
        message: "Payment unavailable, changed, or access denied",
    })

const payment_row = sql`id,domain_id,order_id,provider,request_key,provider_idempotency_key,
    stripe_checkout_session_id,stripe_payment_intent_id,status,amount,currency,
    created_at::float8 AS created_at,updated_at::float8 AS updated_at`

const reserve_order_payment = Effect.fn("Shop.reserveOrderPayment")(function* (
    principal: ShopCatalogPrincipal,
    order_id: string,
    request_key: string
) {
    yield* require_account_domain(principal, principal.domain_id, true, "Shop")
    if (request_key.length < 1 || request_key.length > 255)
        return yield* Effect.fail(unavailable())
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const orders = yield* query_rows(
                PendingOrder,
                sql`SELECT id,status,total_price,currency FROM orders
                        WHERE domain_id=${principal.domain_id} AND id=${order_id}
                        FOR UPDATE`
            )
            const order = orders[0]
            if (!order) return yield* Effect.fail(unavailable())

            const replay = (yield* query_rows(
                ShopPayment,
                sql`SELECT ${payment_row} FROM shop_payments
                        WHERE domain_id=${principal.domain_id} AND order_id=${order_id}
                            AND request_key=${request_key}`
            ))[0]
            if (replay) return replay
            const active = yield* query_rows(
                Schema.Struct({ id: Schema.String }),
                sql`SELECT id FROM shop_payments
                        WHERE domain_id=${principal.domain_id} AND order_id=${order_id}
                            AND status NOT IN ('failed','cancelled') LIMIT 1`
            )
            if (active.length > 0) return yield* Effect.fail(unavailable())

            if (
                order.status !== "pending" ||
                order.total_price <= 0 ||
                !Number.isSafeInteger(order.total_price)
            ) {
                return yield* Effect.fail(unavailable())
            }
            const id = randomUUID()
            const now = Date.now()
            const idempotency_key = `shop:checkout:${id}`
            yield* tx.query(sql`INSERT INTO shop_payments
                    (id,domain_id,order_id,provider,request_key,provider_idempotency_key,
                        status,amount,currency,created_at,updated_at)
                    VALUES (${id},${principal.domain_id},${order_id},'stripe',
                        ${request_key},${idempotency_key},'reserved',${order.total_price},
                        ${order.currency},${now},${now})`)
            const created = yield* query_rows(
                ShopPayment,
                sql`SELECT ${payment_row} FROM shop_payments WHERE id=${id}`
            )
            if (!created[0]) return yield* Effect.fail(unavailable())
            return created[0]
        })
    )
})

// Call only after verifying Stripe's signature over the unchanged raw body.
const record_verified_stripe_event = Effect.fn(
    "Shop.recordVerifiedStripeEvent"
)(function* (input: ShopStripeEventReceipt) {
    const event = yield* Schema.decodeUnknownEffect(ShopStripeEventReceipt)(
        input
    )
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const now = Date.now()
            const inserted = yield* query_rows(
                Schema.Struct({ id: Schema.String }),
                sql`INSERT INTO shop_payment_events
                        (id,provider,event_type,provider_object_id,payload_sha256,
                            status,occurred_at,received_at)
                        VALUES (${event.id},'stripe',${event.event_type},
                            ${event.provider_object_id},${event.payload_sha256},
                            'pending',${event.occurred_at},${now})
                        ON CONFLICT (id) DO NOTHING RETURNING id`
            )
            const stored = (yield* query_rows(
                EventReceipt,
                sql`SELECT id,event_type,provider_object_id,payload_sha256
                        FROM shop_payment_events WHERE id=${event.id} FOR UPDATE`
            ))[0]
            if (
                !stored ||
                stored.event_type !== event.event_type ||
                stored.provider_object_id !== event.provider_object_id ||
                stored.payload_sha256 !== event.payload_sha256
            ) {
                return yield* Effect.fail(unavailable())
            }
            return { id: stored.id, duplicate: inserted.length === 0 }
        })
    )
})

const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        reserve_order_payment: (
            principal: ShopCatalogPrincipal,
            order_id: string,
            request_key: string
        ) =>
            reserve_order_payment(principal, order_id, request_key).pipe(
                Effect.provideService(Sql, db)
            ),
        record_verified_stripe_event: (input: ShopStripeEventReceipt) =>
            record_verified_stripe_event(input).pipe(
                Effect.provideService(Sql, db)
            ),
    }
})

export class ShopPaymentRepository extends Context.Service<
    ShopPaymentRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/ShopPaymentRepository") {}

export const ShopPaymentRepositoryLive = Layer.effect(
    ShopPaymentRepository,
    make
)
