import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain } from "@urm/auth"
import { Sql, query_rows } from "@urm/database/sql"
import {
    ShopCart,
    ShopCartAction,
    ShopCartError,
    ShopCartItem,
} from "@urm/domain/shop"
import type { ShopCatalogPrincipal } from "./catalog-repository.ts"

const Id = Schema.Struct({ id: Schema.String })
const AvailableVariant = Schema.Struct({
    id: Schema.String,
    product_id: Schema.String,
    name: Schema.String,
    price: Schema.Number,
    currency: Schema.String,
    stock: Schema.Number,
    options: Schema.Record(Schema.String, Schema.String),
    product_name: Schema.String,
    product_slug: Schema.String,
    product_image_url: Schema.String,
})
const unavailable = () =>
    new ShopCartError({
        message: "Cart unavailable, changed, or access denied",
    })
const authorize_cart = Effect.fn("Shop.authorizeCart")(function* (
    principal: ShopCatalogPrincipal,
    write = false
) {
    yield* require_account_domain(principal, principal.domain_id, write, "Shop")
})
const find_cart = (domain_id: string, session_id: string) =>
    query_rows(
        ShopCart,
        sql`SELECT id,domain_id,session_id,contact_id,currency,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM carts WHERE domain_id=${domain_id} AND session_id=${session_id} LIMIT 1`
    )
const cart_items = (domain_id: string, cart_id: string) =>
    query_rows(
        ShopCartItem,
        sql`SELECT id,domain_id,cart_id,product_id,variant_id,quantity,product_name,product_slug,product_image_url,product_price,variant_name,variant_options,is_selected,note,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM cart_items WHERE domain_id=${domain_id} AND cart_id=${cart_id} ORDER BY updated_at DESC,id LIMIT 101`
    )
const load_cart = Effect.fn("Shop.loadCart")(function* (
    principal: ShopCatalogPrincipal,
    session_id: string
) {
    yield* authorize_cart(principal)
    const cart = (yield* find_cart(principal.domain_id, session_id))[0]
    if (cart === undefined) return null
    const items = yield* cart_items(principal.domain_id, cart.id)
    if (items.length > 100) return yield* Effect.fail(unavailable())
    return {
        cart,
        items,
        item_count: items.reduce((total, item) => total + item.quantity, 0),
        total_price: items.reduce(
            (total, item) =>
                total +
                (item.is_selected ? item.product_price * item.quantity : 0),
            0
        ),
    }
})
const require_variant = (domain_id: string, variant_id: string) =>
    Effect.gen(function* () {
        const rows = yield* query_rows(
            AvailableVariant,
            sql`SELECT v.id,v.product_id,v.name,GREATEST(0,COALESCE(v.price_override,v.price)-p.discount) AS price,v.currency,v.stock,v.options,p.name AS product_name,p.slug AS product_slug,p.image_url AS product_image_url FROM product_variants v JOIN products p ON p.id=v.product_id AND p.domain_id=v.domain_id WHERE v.id=${variant_id} AND v.domain_id=${domain_id} AND v.is_active AND p.is_active AND p.deleted_at IS NULL FOR UPDATE OF v,p`
        )
        const variant = rows[0]
        if (variant === undefined) return yield* Effect.fail(unavailable())
        return variant
    })

const change_cart = Effect.fn("Shop.changeCart")(function* (
    principal: ShopCatalogPrincipal,
    input: ShopCartAction
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
            yield* authorize_cart(principal, true)
            const action =
                yield* Schema.decodeUnknownEffect(ShopCartAction)(input)
            let cart = (yield* find_cart(domain_id, action.session_id))[0]
            const now = Math.max(Date.now(), (cart?.updated_at ?? 0) + 1)

            if (action._tag === "add_item") {
                const variant = yield* require_variant(
                    domain_id,
                    action.variant_id
                )
                if (cart === undefined) {
                    const cart_id = randomUUID()
                    yield* tx.query(
                        sql`INSERT INTO carts (id,domain_id,session_id,contact_id,currency,created_at,updated_at) VALUES (${cart_id},${domain_id},${action.session_id},NULL,${variant.currency},${now},${now})`
                    )
                    cart = (yield* find_cart(domain_id, action.session_id))[0]
                }
                if (cart === undefined) return yield* Effect.fail(unavailable())
                const items = yield* cart_items(domain_id, cart.id)
                const existing = items.find(
                    (item) => item.variant_id === variant.id
                )
                const next_quantity =
                    (existing?.quantity ?? 0) + action.quantity
                if (
                    items.length > 100 ||
                    next_quantity > 20 ||
                    next_quantity > variant.stock ||
                    (existing === undefined && items.length >= 100)
                )
                    return yield* Effect.fail(unavailable())
                if (existing === undefined)
                    yield* tx.query(
                        sql`INSERT INTO cart_items (id,domain_id,cart_id,product_id,variant_id,quantity,product_name,product_slug,product_image_url,product_price,variant_name,variant_options,created_at,updated_at) VALUES (${randomUUID()},${domain_id},${cart.id},${variant.product_id},${variant.id},${next_quantity},${variant.product_name},${variant.product_slug},${variant.product_image_url},${variant.price},${variant.name},${JSON.stringify(variant.options)}::jsonb,${now},${now})`
                    )
                else
                    yield* tx.query(
                        sql`UPDATE cart_items SET quantity=${next_quantity},product_name=${variant.product_name},product_slug=${variant.product_slug},product_image_url=${variant.product_image_url},product_price=${variant.price},variant_name=${variant.name},variant_options=${JSON.stringify(variant.options)}::jsonb,updated_at=${now} WHERE id=${existing.id} AND domain_id=${domain_id} AND cart_id=${cart.id}`
                    )
                yield* tx.query(
                    sql`UPDATE carts SET currency=${variant.currency},is_abandoned=false,abandoned_at=NULL,updated_at=${now} WHERE id=${cart.id} AND domain_id=${domain_id}`
                )
            } else if (cart === undefined) {
                if (action._tag !== "clear")
                    return yield* Effect.fail(unavailable())
                return null
            } else if (action._tag === "clear") {
                yield* tx.query(
                    sql`DELETE FROM cart_items WHERE domain_id=${domain_id} AND cart_id=${cart.id}`
                )
                yield* tx.query(
                    sql`UPDATE carts SET is_abandoned=false,abandoned_at=NULL,updated_at=${now} WHERE id=${cart.id} AND domain_id=${domain_id}`
                )
            } else {
                const items = yield* cart_items(domain_id, cart.id)
                const item = items.find((row) => row.id === action.item_id)
                if (item === undefined) return yield* Effect.fail(unavailable())
                if (action._tag === "update_item") {
                    const variant = yield* require_variant(
                        domain_id,
                        item.variant_id
                    )
                    if (action.quantity > variant.stock)
                        return yield* Effect.fail(unavailable())
                    yield* tx.query(
                        sql`UPDATE cart_items SET quantity=${action.quantity},updated_at=${now} WHERE id=${item.id} AND domain_id=${domain_id} AND cart_id=${cart.id}`
                    )
                } else if (action._tag === "set_item_selected")
                    yield* tx.query(
                        sql`UPDATE cart_items SET is_selected=${action.is_selected},updated_at=${now} WHERE id=${item.id} AND domain_id=${domain_id} AND cart_id=${cart.id}`
                    )
                else if (action._tag === "set_item_note")
                    yield* tx.query(
                        sql`UPDATE cart_items SET note=${action.note},updated_at=${now} WHERE id=${item.id} AND domain_id=${domain_id} AND cart_id=${cart.id}`
                    )
                else
                    yield* tx.query(
                        sql`DELETE FROM cart_items WHERE id=${item.id} AND domain_id=${domain_id} AND cart_id=${cart.id}`
                    )
                yield* tx.query(
                    sql`UPDATE carts SET is_abandoned=false,abandoned_at=NULL,updated_at=${now} WHERE id=${cart.id} AND domain_id=${domain_id}`
                )
            }
            return yield* load_cart(principal, action.session_id)
        })
    )
})

const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        load_cart: (principal: ShopCatalogPrincipal, session_id: string) =>
            load_cart(principal, session_id).pipe(
                Effect.provideService(Sql, db)
            ),
        change_cart: (
            principal: ShopCatalogPrincipal,
            action: ShopCartAction
        ) =>
            change_cart(principal, action).pipe(Effect.provideService(Sql, db)),
    }
})
export class ShopCartRepository extends Context.Service<
    ShopCartRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/ShopCartRepository") {}
export const ShopCartRepositoryLive = Layer.effect(ShopCartRepository, make)
