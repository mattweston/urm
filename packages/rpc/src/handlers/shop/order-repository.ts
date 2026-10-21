import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain } from "@urm/auth"
import { Sql, query_rows } from "@urm/database/sql"
import {
    ShopCart,
    ShopCartItem,
    ShopCheckoutInput,
    ShopOrder,
    ShopOrderError,
    ShopOrderItem,
} from "@urm/domain/shop"
import type { ShopCatalogPrincipal } from "./catalog-repository.ts"

const Id = Schema.Struct({ id: Schema.String })
const VariantStock = Schema.Struct({ id: Schema.String, stock: Schema.Number })
const unavailable = () =>
    new ShopOrderError({
        message: "Order unavailable, changed, or access denied",
    })
const authorize_orders = Effect.fn("Shop.authorizeOrders")(function* (
    principal: ShopCatalogPrincipal,
    write = false
) {
    yield* require_account_domain(principal, principal.domain_id, write, "Shop")
})
const find_order = (domain_id: string, checkout_key: string) =>
    query_rows(
        ShopOrder,
        sql`SELECT id,domain_id,cart_id,session_id,checkout_key,email,status,total_price,currency,shipping_address,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM orders WHERE domain_id=${domain_id} AND checkout_key=${checkout_key} LIMIT 1`
    )
const order_items = (domain_id: string, order_id: string) =>
    query_rows(
        ShopOrderItem,
        sql`SELECT id,domain_id,order_id,product_id,variant_id,quantity,product_name,product_slug,product_image_url,product_price,variant_name,variant_options,created_at::float8 AS created_at FROM order_items WHERE domain_id=${domain_id} AND order_id=${order_id} ORDER BY id LIMIT 101`
    )
const order_snapshot = Effect.fn("Shop.orderSnapshot")(function* (
    order: typeof ShopOrder.Type
) {
    const items = yield* order_items(order.domain_id, order.id)
    if (items.length > 100) return yield* Effect.fail(unavailable())
    return { order, items }
})
const list_orders = Effect.fn("Shop.listOrders")(function* (
    principal: ShopCatalogPrincipal
) {
    yield* authorize_orders(principal)
    const domain_id = principal.domain_id
    const orders = yield* query_rows(
        ShopOrder,
        sql`SELECT id,domain_id,cart_id,session_id,checkout_key,email,status,total_price,currency,shipping_address,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM orders WHERE domain_id=${domain_id} ORDER BY updated_at DESC,id LIMIT 51`
    )
    if (orders.length > 50) return yield* Effect.fail(unavailable())
    return yield* Effect.forEach(orders, order_snapshot)
})
const create_pending_order = Effect.fn("Shop.createPendingOrder")(function* (
    principal: ShopCatalogPrincipal,
    input: ShopCheckoutInput
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const domain_id = principal.domain_id
            const domain = yield* query_rows(
                Id,
                sql`SELECT id FROM domains WHERE id=${domain_id} FOR UPDATE`
            )
            if (domain.length !== 1) return yield* Effect.fail(unavailable())
            yield* authorize_orders(principal, true)
            const checkout =
                yield* Schema.decodeUnknownEffect(ShopCheckoutInput)(input)
            const existing = (yield* find_order(
                domain_id,
                checkout.checkout_key
            ))[0]
            if (existing !== undefined) return yield* order_snapshot(existing)
            const cart = (yield* query_rows(
                ShopCart,
                sql`SELECT id,domain_id,session_id,contact_id,currency,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM carts WHERE domain_id=${domain_id} AND session_id=${checkout.session_id} LIMIT 1`
            ))[0]
            if (
                cart === undefined ||
                checkout.checkout_key !== `${cart.id}:${cart.updated_at}`
            )
                return yield* Effect.fail(unavailable())
            const items = yield* query_rows(
                ShopCartItem,
                sql`SELECT id,domain_id,cart_id,product_id,variant_id,quantity,product_name,product_slug,product_image_url,product_price,variant_name,variant_options,is_selected,note,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM cart_items WHERE domain_id=${domain_id} AND cart_id=${cart.id} ORDER BY updated_at DESC,id LIMIT 101`
            )
            if (items.length === 0 || items.length > 100)
                return yield* Effect.fail(unavailable())
            const selected_items = items.filter((item) => item.is_selected)
            if (selected_items.length === 0)
                return yield* Effect.fail(unavailable())
            for (const item of selected_items) {
                const variant = (yield* query_rows(
                    VariantStock,
                    sql`SELECT v.id,v.stock FROM product_variants v JOIN products p ON p.id=v.product_id AND p.domain_id=v.domain_id WHERE v.id=${item.variant_id} AND v.domain_id=${domain_id} AND v.is_active AND p.is_active AND p.deleted_at IS NULL FOR UPDATE OF v,p`
                ))[0]
                if (variant === undefined || item.quantity > variant.stock)
                    return yield* Effect.fail(unavailable())
            }
            const total_price = selected_items.reduce(
                (total, item) => total + item.product_price * item.quantity,
                0
            )
            if (total_price > 2147483647)
                return yield* Effect.fail(unavailable())
            const order_id = randomUUID()
            const now = Math.max(Date.now(), cart.updated_at + 1)
            yield* tx.query(
                sql`INSERT INTO orders (id,domain_id,cart_id,session_id,checkout_key,email,status,total_price,subtotal,currency,shipping_address,created_at,updated_at) VALUES (${order_id},${domain_id},${cart.id},${checkout.session_id},${checkout.checkout_key},${checkout.email},'pending',${total_price},${total_price},${cart.currency},${JSON.stringify(checkout.shipping_address)}::jsonb,${now},${now})`
            )
            yield* Effect.forEach(selected_items, (item) =>
                tx.query(
                    sql`INSERT INTO order_items (id,domain_id,order_id,product_id,variant_id,quantity,product_name,product_slug,product_image_url,product_price,variant_name,variant_options,created_at) VALUES (${randomUUID()},${domain_id},${order_id},${item.product_id},${item.variant_id},${item.quantity},${item.product_name},${item.product_slug},${item.product_image_url},${item.product_price},${item.variant_name},${JSON.stringify(item.variant_options)}::jsonb,${now})`
                )
            )
            yield* tx.query(
                sql`DELETE FROM cart_items WHERE domain_id=${domain_id} AND cart_id=${cart.id} AND is_selected`
            )
            yield* tx.query(
                sql`UPDATE carts SET updated_at=${now} WHERE id=${cart.id} AND domain_id=${domain_id}`
            )
            const order = (yield* find_order(
                domain_id,
                checkout.checkout_key
            ))[0]
            if (order === undefined) return yield* Effect.fail(unavailable())
            return yield* order_snapshot(order)
        })
    )
})
const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        list_orders: (principal: ShopCatalogPrincipal) =>
            list_orders(principal).pipe(Effect.provideService(Sql, db)),
        create_pending_order: (
            principal: ShopCatalogPrincipal,
            input: ShopCheckoutInput
        ) =>
            create_pending_order(principal, input).pipe(
                Effect.provideService(Sql, db)
            ),
    }
})
export class ShopOrderRepository extends Context.Service<
    ShopOrderRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/ShopOrderRepository") {}
export const ShopOrderRepositoryLive = Layer.effect(ShopOrderRepository, make)
