/**
 * # Shop Repository
 *
 * Orphaned: nothing provides this layer. Shop handlers resolve DB directly
 * instead, so its queries cannot be swapped for a test double the way every
 * other feature's can. There is no Context.Service tag in
 * the contracts package's repositories/shop for it to satisfy either.
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { eq } from "drizzle-orm"
import { DB } from "@urm/db/layer"
import {
    products,
    product_collections,
    carts,
    cart_items,
    orders,
    order_items,
} from "@urm/db/legacy-schema/shop"
import {
    Product,
    ProductCollection,
    Cart,
    CartItem,
    Order,
} from "@urm/domain/schemas/shop"
import { toError } from "@urm/utils"

export const ShopRepositoryLive = Layer.effect(
    DB,
    Effect.gen(function* () {
        const db = yield* DB

        const repository = {
            listProducts: (options?: {
                collectionId?: string
                featured?: boolean
            }) =>
                Effect.gen(function* () {
                    let query = db.select().from(products)

                    if (options?.featured) {
                        query = query.where(
                            eq(products.is_featured, true)
                        ) as typeof query
                    }

                    const results = yield* query.pipe(Effect.mapError(toError))
                    const decode = Schema.decodeUnknownSync(
                        Schema.Array(Product)
                    )
                    return [...decode(results)]
                }).pipe(Effect.mapError(toError)),

            getProduct: (idOrSlug: { id?: string; slug?: string }) =>
                Effect.gen(function* () {
                    if (idOrSlug.id) {
                        const results = yield* db
                            .select()
                            .from(products)
                            .where(eq(products.id, idOrSlug.id))
                            .pipe(Effect.mapError(toError))
                        if (results.length === 0) return null
                        const decode = Schema.decodeUnknownSync(Product)
                        return decode(results[0])
                    }
                    if (idOrSlug.slug) {
                        const results = yield* db
                            .select()
                            .from(products)
                            .where(eq(products.slug, idOrSlug.slug))
                            .pipe(Effect.mapError(toError))
                        if (results.length === 0) return null
                        const decode = Schema.decodeUnknownSync(Product)
                        return decode(results[0])
                    }
                    return null
                }).pipe(Effect.mapError(toError)),

            listCollections: () =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(product_collections)
                        .pipe(Effect.mapError(toError))
                    const decode = Schema.decodeUnknownSync(
                        Schema.Array(ProductCollection)
                    )
                    return [...decode(results)]
                }).pipe(Effect.mapError(toError)),

            getCart: (sessionId: string) =>
                Effect.gen(function* () {
                    const cartResults = yield* db
                        .select()
                        .from(carts)
                        .where(eq(carts.session_id, sessionId))
                        .pipe(Effect.mapError(toError))

                    if (cartResults.length === 0) return null

                    const cart = cartResults[0]
                    const items = yield* db
                        .select()
                        .from(cart_items)
                        .where(eq(cart_items.cart_id, cart.id))
                        .pipe(Effect.mapError(toError))

                    return {
                        cart: cart as Cart,
                        items: items as CartItem[],
                    }
                }).pipe(Effect.mapError(toError)),

            createOrder: (data: {
                email: string
                total: number
                items: Array<{
                    productId: string
                    variantId: string
                    quantity: number
                    productName: string
                    variantName: string
                    productPrice: number
                }>
            }) =>
                Effect.gen(function* () {
                    const orderId = `order-${Date.now()}`
                    const now = Date.now()

                    const order = yield* db
                        .insert(orders)
                        .values({
                            id: orderId,
                            email: data.email,
                            status: "pending",
                            total: data.total,
                            created_at: now,
                            updated_at: now,
                        })
                        .returning()
                        .pipe(Effect.mapError(toError))

                    if (order.length === 0) {
                        return yield* Effect.fail(
                            new Error("Failed to create order")
                        )
                    }

                    const orderItems = data.items.map((item, index) => ({
                        id: `${orderId}-item-${index}`,
                        order_id: orderId,
                        product_id: item.productId,
                        variant_id: item.variantId,
                        quantity: item.quantity,
                        product_name: item.productName,
                        variant_name: item.variantName,
                        product_price: item.productPrice,
                        created_at: now,
                    }))

                    yield* db
                        .insert(order_items)
                        .values(orderItems)
                        .pipe(Effect.mapError(toError))

                    return order[0] as Order
                }).pipe(Effect.mapError(toError)),

            listOrders: (options?: { email?: string }) =>
                Effect.gen(function* () {
                    let query = db.select().from(orders)

                    if (options?.email) {
                        query = query.where(
                            eq(orders.email, options.email)
                        ) as typeof query
                    }

                    const results = yield* query.pipe(Effect.mapError(toError))
                    const decode = Schema.decodeUnknownSync(Schema.Array(Order))
                    return [...decode(results)]
                }).pipe(Effect.mapError(toError)),

            getOrder: (id: string) =>
                Effect.gen(function* () {
                    const results = yield* db
                        .select()
                        .from(orders)
                        .where(eq(orders.id, id))
                        .pipe(Effect.mapError(toError))

                    if (results.length === 0) return null
                    const decode = Schema.decodeUnknownSync(Order)
                    return decode(results[0])
                }).pipe(Effect.mapError(toError)),
        }

        return repository
    })
)
