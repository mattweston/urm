import { Effect, Layer, Option } from "effect"
import { ShopRpcs } from "@urm/contracts/shop"
import { ShopRpcHandlersTag } from "./tag.ts"
import { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"
import { AuthPersistence } from "@urm/auth/auth-persistence"
import { DB } from "@urm/db/layer"
import {
    products,
    product_variants,
    product_collections,
    carts,
    cart_items,
    orders,
    order_items,
} from "@urm/db/legacy-schema/shop"
import { images } from "@urm/db/legacy-schema/media/images"
import {
    Product,
    ProductCollection,
    Order,
    OrderItem,
    DatabaseError,
    NotFoundError,
    ValidationError,
} from "@urm/domain/schemas/shop"
import { and, eq, inArray, isNull } from "drizzle-orm"
import { allowCartMutation, allowCheckoutCreate } from "../shop-rate-limit.ts"

type ProductRow = typeof products.$inferSelect
type VariantRow = typeof product_variants.$inferSelect
type ProductCollectionRow = typeof product_collections.$inferSelect
type CartRow = typeof carts.$inferSelect
type CartItemRow = typeof cart_items.$inferSelect
type OrderRow = typeof orders.$inferSelect
type OrderItemRow = typeof order_items.$inferSelect

const normalizeProduct = (
    row: ProductRow,
    variants?: VariantRow[]
): Product => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    tagline: row.tagline ?? null,
    description: row.description ?? null,
    price: row.price,
    discount: row.discount ?? null,
    imageUrl: row.imageUrl,
    ...(row.image_id === null ? {} : { imageId: row.image_id }),
    images: row.images ?? null,
    isActive: row.isActive,
    isFeatured: row.isFeatured ?? false,
    collectionIds: row.collectionIds ?? null,
    variants: variants?.map((v) => ({
        id: v.id,
        productId: v.productId,
        name: v.name,
        description: null,
        sku: null,
        price: v.priceOverride ?? 0,
        currency: null,
        stock: v.stock,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
})

const normalizeShippingAddress = (address: OrderRow["shippingAddress"]) => {
    if (address.first_name === undefined || address.last_name === undefined) {
        return undefined
    }

    return {
        firstName: address.first_name,
        lastName: address.last_name,
        line1: address.line1,
        city: address.city,
        province: address.province,
        country: address.country,
        postal: address.postal,
    }
}

const normalizeOrderItem = (row: OrderItemRow): OrderItem => ({
    id: row.id,
    orderId: row.orderId,
    variantId: row.productVariantId,
    productId: row.productId,
    quantity: row.quantity,
    productName: row.productName,
    variantName: row.variantName,
    productPrice: row.unitPrice,
    productImageUrl: row.productImageUrl,
    createdAt: row.createdAt,
})

const normalizeOrder = (row: OrderRow, itemRows?: OrderItemRow[]): Order => {
    const shippingAddress = normalizeShippingAddress(row.shippingAddress)

    return {
        id: row.id,
        email: row.email,
        status: row.status,
        totalPrice: row.totalPrice,
        currency: row.currency,
        stripeCheckoutSessionId: row.stripeCheckoutSessionId,
        stripePaymentIntentId: row.stripePaymentIntentId,
        stripeChargeId: row.stripeChargeId,
        ...(shippingAddress === undefined ? {} : { shippingAddress }),
        ...(itemRows === undefined
            ? {}
            : { items: itemRows.map(normalizeOrderItem) }),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    }
}

const normalizeCollection = (row: ProductCollectionRow): ProductCollection => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    imageUrl: row.imageUrl ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
})

const dbError = (message: string) => new DatabaseError({ message })

const defaultVariantName = "Default"
const maxCartQuantity = 20

const cartNotFound = () => new NotFoundError({ message: "Cart not found" })

const normalizeCart = (cartRow: CartRow, itemRows: CartItemRow[]) => ({
    cart: {
        id: cartRow.id,
        sessionId: cartRow.sessionId ?? "",
        contactId: cartRow.contactId,
        customerId: cartRow.customerId,
        itemCount: cartRow.totalItems ?? 0,
        totalPrice: cartRow.totalValue ?? 0,
        currency: cartRow.currency,
        createdAt: cartRow.createdAt,
        updatedAt: cartRow.updatedAt,
    },
    items: itemRows.map((item) => ({
        id: item.id,
        cartId: item.cartId,
        variantId: item.productVariantId,
        productId: item.productId,
        quantity: item.quantity,
        productName: item.productName,
        variantName: item.variantName,
        productPrice: item.productPrice,
        productImageUrl: item.productImageUrl,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    })),
})

const validateCartInput = (sessionId: string, quantity: number) =>
    sessionId.length > 0 &&
    Number.isSafeInteger(quantity) &&
    quantity >= 1 &&
    quantity <= maxCartQuantity
        ? Effect.void
        : Effect.fail(
              new ValidationError({
                  message: `Quantity must be a whole number between 1 and ${maxCartQuantity}`,
              })
          )

const cartTotal = (itemRows: CartItemRow[]) => ({
    itemCount: itemRows.reduce((total, item) => total + item.quantity, 0),
    totalPrice: itemRows.reduce(
        (total, item) => total + item.quantity * item.productPrice,
        0
    ),
})

const validateInventory = (inventory: number) =>
    Number.isSafeInteger(inventory) && inventory >= 0
        ? Effect.void
        : Effect.fail(
              new ValidationError({
                  message: "Inventory must be a non-negative whole number",
              })
          )

const defaultVariantValues = (
    productId: string,
    inventory: number,
    price: number,
    now: number
) => ({
    id: crypto.randomUUID(),
    productId,
    name: defaultVariantName,
    stock: inventory,
    options: {},
    priceOverride: price,
    isActive: true,
    createdAt: now,
    updatedAt: now,
})

const validateProductImage = (
    domain_id: string,
    image_id: string | undefined
) =>
    Effect.gen(function* () {
        if (image_id === undefined) {
            return
        }

        const db = yield* DB
        const image_rows = yield* db
            .select({ id: images.id })
            .from(images)
            .where(
                and(eq(images.id, image_id), eq(images.domain_id, domain_id))
            )
            .limit(1)
            .pipe(
                Effect.mapError(() =>
                    dbError("Failed to validate product image")
                )
            )

        if (image_rows[0] === undefined) {
            return yield* Effect.fail(
                new ValidationError({ message: "Product image not found" })
            )
        }
    })

const ShopRpcHandlersLive = Effect.gen(function* () {
    const db = yield* DB
    const auth_persistence = yield* AuthPersistence

    const requireCartMutationAllowance = (
        route: "shop/cart/add" | "shop/cart/remove" | "shop/cart/update",
        domain_id: string,
        session_id: string
    ) =>
        allowCartMutation(route, domain_id, session_id).pipe(
            Effect.provideService(AuthPersistence, auth_persistence),
            Effect.filterOrFail(
                (allowed) => allowed,
                () =>
                    new ValidationError({
                        message: "Cart updates are temporarily unavailable",
                    })
            ),
            Effect.asVoid
        )

    const requireCheckoutAllowance = (domain_id: string, session_id: string) =>
        allowCheckoutCreate(domain_id, session_id).pipe(
            Effect.provideService(AuthPersistence, auth_persistence),
            Effect.filterOrFail(
                (allowed) => allowed,
                () =>
                    new ValidationError({
                        message: "Checkout is temporarily unavailable",
                    })
            ),
            Effect.asVoid
        )

    return ShopRpcs.of({
        products_list: ({ featured }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                const rows = yield* (
                    featured
                        ? db
                              .select()
                              .from(products)
                              .where(
                                  and(
                                      eq(
                                          products.domain_id,
                                          activeDomain.domainId
                                      ),
                                      eq(products.isFeatured, true)
                                  )
                              )
                        : db
                              .select()
                              .from(products)
                              .where(
                                  eq(products.domain_id, activeDomain.domainId)
                              )
                ).pipe(
                    Effect.mapError(() => dbError("Failed to list products"))
                )
                const product_ids = rows.map((product) => product.id)
                const variantRows =
                    product_ids.length === 0
                        ? []
                        : yield* db
                              .select()
                              .from(product_variants)
                              .where(
                                  inArray(
                                      product_variants.productId,
                                      product_ids
                                  )
                              )
                              .pipe(
                                  Effect.mapError(() =>
                                      dbError("Failed to load variants")
                                  )
                              )
                const variantsByProduct = new Map<string, VariantRow[]>()
                for (const v of variantRows) {
                    const existing = variantsByProduct.get(v.productId) ?? []
                    existing.push(v)
                    variantsByProduct.set(v.productId, existing)
                }
                return rows.map((p) =>
                    normalizeProduct(p, variantsByProduct.get(p.id))
                )
            }),

        products_get: ({ id, slug }) =>
            Effect.gen(function* () {
                if (!id && !slug) return Option.none()
                const activeDomain = yield* ActiveDomainRequestContext
                const results = yield* db
                    .select()
                    .from(products)
                    .where(
                        id
                            ? and(
                                  eq(products.domain_id, activeDomain.domainId),
                                  eq(products.id, id)
                              )
                            : and(
                                  eq(products.domain_id, activeDomain.domainId),
                                  eq(products.slug, slug ?? "")
                              )
                    )
                    .pipe(
                        Effect.mapError(() => dbError("Failed to get product"))
                    )
                const productRow = results[0]

                if (productRow === undefined) return Option.none()
                const variants = yield* db
                    .select()
                    .from(product_variants)
                    .where(eq(product_variants.productId, productRow.id))
                    .pipe(
                        Effect.mapError(() =>
                            dbError("Failed to load variants")
                        )
                    )
                return Option.some(normalizeProduct(productRow, variants))
            }),

        products_create: (input) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                yield* validateProductImage(
                    activeDomain.domainId,
                    input.imageId
                )
                yield* validateInventory(input.inventory)
                const now = Date.now()
                const created = yield* db
                    .transaction((tx) =>
                        Effect.gen(function* () {
                            const inserted = yield* tx
                                .insert(products)
                                .values({
                                    id: crypto.randomUUID(),
                                    domain_id: activeDomain.domainId,
                                    name: input.name,
                                    slug: input.slug,
                                    description:
                                        input.description.length === 0
                                            ? null
                                            : input.description,
                                    price: input.price,
                                    imageUrl: input.imageUrl,
                                    image_id: input.imageId ?? null,
                                    isActive: input.isActive,
                                    isFeatured: input.isFeatured,
                                    createdAt: now,
                                    updatedAt: now,
                                })
                                .returning()
                            const productRow = inserted[0]

                            if (productRow === undefined) {
                                return yield* Effect.fail(
                                    dbError("Failed to create product")
                                )
                            }

                            const variantRows = yield* tx
                                .insert(product_variants)
                                .values(
                                    defaultVariantValues(
                                        productRow.id,
                                        input.inventory,
                                        input.price,
                                        now
                                    )
                                )
                                .returning()
                            const defaultVariant = variantRows[0]

                            if (defaultVariant === undefined) {
                                return yield* Effect.fail(
                                    dbError("Failed to create default variant")
                                )
                            }

                            return { productRow, defaultVariant }
                        })
                    )
                    .pipe(
                        Effect.mapError(() =>
                            dbError("Failed to create product")
                        )
                    )

                return normalizeProduct(created.productRow, [
                    created.defaultVariant,
                ])
            }),

        products_update: ({ id, product }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                yield* validateProductImage(
                    activeDomain.domainId,
                    product.imageId
                )
                yield* validateInventory(product.inventory)
                const now = Date.now()
                const updated = yield* db
                    .transaction((tx) =>
                        Effect.gen(function* () {
                            const productRows = yield* tx
                                .update(products)
                                .set({
                                    name: product.name,
                                    slug: product.slug,
                                    description:
                                        product.description.length === 0
                                            ? null
                                            : product.description,
                                    price: product.price,
                                    imageUrl: product.imageUrl,
                                    image_id: product.imageId ?? null,
                                    isActive: product.isActive,
                                    isFeatured: product.isFeatured,
                                    updatedAt: now,
                                })
                                .where(
                                    and(
                                        eq(
                                            products.domain_id,
                                            activeDomain.domainId
                                        ),
                                        eq(products.id, id)
                                    )
                                )
                                .returning()
                            const productRow = productRows[0]

                            if (productRow === undefined) {
                                return yield* Effect.fail(
                                    new NotFoundError({
                                        message: "Product not found",
                                    })
                                )
                            }

                            const existingVariants = yield* tx
                                .select()
                                .from(product_variants)
                                .where(
                                    eq(
                                        product_variants.productId,
                                        productRow.id
                                    )
                                )
                            const defaultVariant = existingVariants.find(
                                (variant) => variant.name === defaultVariantName
                            )

                            if (defaultVariant === undefined) {
                                yield* tx
                                    .insert(product_variants)
                                    .values(
                                        defaultVariantValues(
                                            productRow.id,
                                            product.inventory,
                                            product.price,
                                            now
                                        )
                                    )
                            } else {
                                yield* tx
                                    .update(product_variants)
                                    .set({
                                        stock: product.inventory,
                                        priceOverride: product.price,
                                        updatedAt: now,
                                    })
                                    .where(
                                        eq(
                                            product_variants.id,
                                            defaultVariant.id
                                        )
                                    )
                            }

                            const variants = yield* tx
                                .select()
                                .from(product_variants)
                                .where(
                                    eq(
                                        product_variants.productId,
                                        productRow.id
                                    )
                                )

                            return { productRow, variants }
                        })
                    )
                    .pipe(
                        Effect.mapError((error) =>
                            error instanceof NotFoundError
                                ? error
                                : dbError("Failed to update product")
                        )
                    )

                return normalizeProduct(updated.productRow, updated.variants)
            }),

        collections_list: () =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                const results = yield* db
                    .select()
                    .from(product_collections)
                    .where(
                        eq(product_collections.domain_id, activeDomain.domainId)
                    )
                    .pipe(
                        Effect.mapError(() =>
                            dbError("Failed to list collections")
                        )
                    )
                return results.map(normalizeCollection)
            }),

        cart_get: ({ sessionId }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                const cartResults = yield* db
                    .select()
                    .from(carts)
                    .where(
                        and(
                            eq(carts.domain_id, activeDomain.domainId),
                            eq(carts.sessionId, sessionId)
                        )
                    )
                    .pipe(Effect.mapError(() => dbError("Failed to get cart")))

                const cartRow = cartResults[0]

                if (cartRow === undefined) {
                    return yield* Effect.fail(cartNotFound())
                }
                const items = yield* db
                    .select()
                    .from(cart_items)
                    .where(eq(cart_items.cartId, cartRow.id))
                    .pipe(
                        Effect.mapError(() =>
                            dbError("Failed to get cart items")
                        )
                    )

                return normalizeCart(cartRow, items)
            }),

        cart_add: ({ input }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                yield* validateCartInput(input.sessionId, input.quantity)
                yield* requireCartMutationAllowance(
                    "shop/cart/add",
                    activeDomain.domainId,
                    input.sessionId
                )
                const now = Date.now()

                return yield* db
                    .transaction((tx) =>
                        Effect.gen(function* () {
                            const variantRows = yield* tx
                                .select({
                                    product: products,
                                    variant: product_variants,
                                })
                                .from(product_variants)
                                .innerJoin(
                                    products,
                                    eq(product_variants.productId, products.id)
                                )
                                .where(
                                    and(
                                        eq(
                                            product_variants.id,
                                            input.variantId
                                        ),
                                        eq(product_variants.isActive, true),
                                        eq(
                                            products.domain_id,
                                            activeDomain.domainId
                                        ),
                                        eq(products.isActive, true)
                                    )
                                )
                                .limit(1)
                            const variantRow = variantRows[0]

                            if (variantRow === undefined) {
                                return yield* Effect.fail(
                                    new NotFoundError({
                                        message: "Product variant not found",
                                    })
                                )
                            }

                            const cartRows = yield* tx
                                .select()
                                .from(carts)
                                .where(
                                    and(
                                        eq(
                                            carts.domain_id,
                                            activeDomain.domainId
                                        ),
                                        eq(carts.sessionId, input.sessionId)
                                    )
                                )
                                .limit(1)
                            const existingCart = cartRows[0]
                            const cartRow =
                                existingCart === undefined
                                    ? (yield* tx
                                          .insert(carts)
                                          .values({
                                              id: crypto.randomUUID(),
                                              domain_id: activeDomain.domainId,
                                              sessionId: input.sessionId,
                                              currency: "USD",
                                              totalItems: 0,
                                              totalValue: 0,
                                              lastActivity: now,
                                              createdAt: now,
                                              updatedAt: now,
                                          })
                                          .returning())[0]
                                    : existingCart

                            if (cartRow === undefined) {
                                return yield* Effect.fail(
                                    dbError("Failed to create cart")
                                )
                            }

                            const existingItemRows = yield* tx
                                .select()
                                .from(cart_items)
                                .where(
                                    and(
                                        eq(cart_items.cartId, cartRow.id),
                                        eq(
                                            cart_items.productVariantId,
                                            variantRow.variant.id
                                        )
                                    )
                                )
                                .limit(1)
                            const existingItem = existingItemRows[0]
                            const quantity =
                                (existingItem?.quantity ?? 0) + input.quantity

                            if (quantity > variantRow.variant.stock) {
                                return yield* Effect.fail(
                                    new ValidationError({
                                        message:
                                            "Requested quantity is out of stock",
                                    })
                                )
                            }

                            const productPrice = Math.max(
                                0,
                                (variantRow.variant.priceOverride ??
                                    variantRow.product.price) -
                                    (variantRow.product.discount ?? 0)
                            )

                            if (existingItem === undefined) {
                                yield* tx.insert(cart_items).values({
                                    id: crypto.randomUUID(),
                                    cartId: cartRow.id,
                                    productId: variantRow.product.id,
                                    productVariantId: variantRow.variant.id,
                                    quantity,
                                    productName: variantRow.product.name,
                                    productSlug: variantRow.product.slug,
                                    productImageUrl:
                                        variantRow.product.imageUrl,
                                    productPrice,
                                    variantName: variantRow.variant.name,
                                    variantOptions: variantRow.variant.options,
                                    createdAt: now,
                                    updatedAt: now,
                                })
                            } else {
                                yield* tx
                                    .update(cart_items)
                                    .set({
                                        quantity,
                                        productName: variantRow.product.name,
                                        productSlug: variantRow.product.slug,
                                        productImageUrl:
                                            variantRow.product.imageUrl,
                                        productPrice,
                                        variantName: variantRow.variant.name,
                                        variantOptions:
                                            variantRow.variant.options,
                                        updatedAt: now,
                                    })
                                    .where(eq(cart_items.id, existingItem.id))
                            }

                            const itemRows = yield* tx
                                .select()
                                .from(cart_items)
                                .where(eq(cart_items.cartId, cartRow.id))
                            const total = cartTotal(itemRows)
                            const updatedRows = yield* tx
                                .update(carts)
                                .set({
                                    totalItems: total.itemCount,
                                    totalValue: total.totalPrice,
                                    lastActivity: now,
                                    updatedAt: now,
                                })
                                .where(eq(carts.id, cartRow.id))
                                .returning()
                            const updatedCart = updatedRows[0]

                            if (updatedCart === undefined) {
                                return yield* Effect.fail(
                                    dbError("Failed to update cart")
                                )
                            }

                            return normalizeCart(updatedCart, itemRows)
                        })
                    )
                    .pipe(
                        Effect.mapError((error) =>
                            error instanceof DatabaseError ||
                            error instanceof NotFoundError ||
                            error instanceof ValidationError
                                ? error
                                : dbError("Failed to add item to cart")
                        )
                    )
            }),

        cart_remove: ({ input }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                yield* requireCartMutationAllowance(
                    "shop/cart/remove",
                    activeDomain.domainId,
                    input.sessionId
                )
                const now = Date.now()

                return yield* db
                    .transaction((tx) =>
                        Effect.gen(function* () {
                            const cartRows = yield* tx
                                .select()
                                .from(carts)
                                .where(
                                    and(
                                        eq(
                                            carts.domain_id,
                                            activeDomain.domainId
                                        ),
                                        eq(carts.sessionId, input.sessionId)
                                    )
                                )
                                .limit(1)
                            const cartRow = cartRows[0]

                            if (cartRow === undefined) {
                                return yield* Effect.fail(cartNotFound())
                            }

                            const removedRows = yield* tx
                                .delete(cart_items)
                                .where(
                                    and(
                                        eq(cart_items.id, input.itemId),
                                        eq(cart_items.cartId, cartRow.id)
                                    )
                                )
                                .returning()

                            if (removedRows[0] === undefined) {
                                return yield* Effect.fail(
                                    new NotFoundError({
                                        message: "Cart item not found",
                                    })
                                )
                            }

                            const itemRows = yield* tx
                                .select()
                                .from(cart_items)
                                .where(eq(cart_items.cartId, cartRow.id))
                            const total = cartTotal(itemRows)
                            const updatedRows = yield* tx
                                .update(carts)
                                .set({
                                    totalItems: total.itemCount,
                                    totalValue: total.totalPrice,
                                    lastActivity: now,
                                    updatedAt: now,
                                })
                                .where(eq(carts.id, cartRow.id))
                                .returning()
                            const updatedCart = updatedRows[0]

                            if (updatedCart === undefined) {
                                return yield* Effect.fail(
                                    dbError("Failed to update cart")
                                )
                            }

                            return normalizeCart(updatedCart, itemRows)
                        })
                    )
                    .pipe(
                        Effect.mapError((error) =>
                            error instanceof DatabaseError ||
                            error instanceof NotFoundError
                                ? error
                                : dbError("Failed to remove cart item")
                        )
                    )
            }),

        cart_update: ({ input }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                yield* validateCartInput(input.sessionId, input.quantity)
                yield* requireCartMutationAllowance(
                    "shop/cart/update",
                    activeDomain.domainId,
                    input.sessionId
                )
                const now = Date.now()

                return yield* db
                    .transaction((tx) =>
                        Effect.gen(function* () {
                            const cartRows = yield* tx
                                .select()
                                .from(carts)
                                .where(
                                    and(
                                        eq(
                                            carts.domain_id,
                                            activeDomain.domainId
                                        ),
                                        eq(carts.sessionId, input.sessionId)
                                    )
                                )
                                .limit(1)
                            const cartRow = cartRows[0]

                            if (cartRow === undefined) {
                                return yield* Effect.fail(cartNotFound())
                            }

                            const itemRows = yield* tx
                                .select()
                                .from(cart_items)
                                .where(
                                    and(
                                        eq(cart_items.id, input.itemId),
                                        eq(cart_items.cartId, cartRow.id)
                                    )
                                )
                                .limit(1)
                            const itemRow = itemRows[0]

                            if (itemRow === undefined) {
                                return yield* Effect.fail(
                                    new NotFoundError({
                                        message: "Cart item not found",
                                    })
                                )
                            }

                            const variantRows = yield* tx
                                .select({
                                    product: products,
                                    variant: product_variants,
                                })
                                .from(product_variants)
                                .innerJoin(
                                    products,
                                    eq(product_variants.productId, products.id)
                                )
                                .where(
                                    and(
                                        eq(
                                            product_variants.id,
                                            itemRow.productVariantId
                                        ),
                                        eq(product_variants.isActive, true),
                                        eq(
                                            products.domain_id,
                                            activeDomain.domainId
                                        ),
                                        eq(products.isActive, true)
                                    )
                                )
                                .limit(1)
                            const variantRow = variantRows[0]

                            if (variantRow === undefined) {
                                return yield* Effect.fail(
                                    new ValidationError({
                                        message:
                                            "Product is no longer available",
                                    })
                                )
                            }

                            if (input.quantity > variantRow.variant.stock) {
                                return yield* Effect.fail(
                                    new ValidationError({
                                        message:
                                            "Requested quantity is out of stock",
                                    })
                                )
                            }

                            const productPrice = Math.max(
                                0,
                                (variantRow.variant.priceOverride ??
                                    variantRow.product.price) -
                                    (variantRow.product.discount ?? 0)
                            )
                            yield* tx
                                .update(cart_items)
                                .set({
                                    quantity: input.quantity,
                                    productName: variantRow.product.name,
                                    productSlug: variantRow.product.slug,
                                    productImageUrl:
                                        variantRow.product.imageUrl,
                                    productPrice,
                                    variantName: variantRow.variant.name,
                                    variantOptions: variantRow.variant.options,
                                    updatedAt: now,
                                })
                                .where(eq(cart_items.id, itemRow.id))

                            const updatedItems = yield* tx
                                .select()
                                .from(cart_items)
                                .where(eq(cart_items.cartId, cartRow.id))
                            const total = cartTotal(updatedItems)
                            const updatedRows = yield* tx
                                .update(carts)
                                .set({
                                    totalItems: total.itemCount,
                                    totalValue: total.totalPrice,
                                    lastActivity: now,
                                    updatedAt: now,
                                })
                                .where(eq(carts.id, cartRow.id))
                                .returning()
                            const updatedCart = updatedRows[0]

                            if (updatedCart === undefined) {
                                return yield* Effect.fail(
                                    dbError("Failed to update cart")
                                )
                            }

                            return normalizeCart(updatedCart, updatedItems)
                        })
                    )
                    .pipe(
                        Effect.mapError((error) =>
                            error instanceof DatabaseError ||
                            error instanceof NotFoundError ||
                            error instanceof ValidationError
                                ? error
                                : dbError("Failed to update cart item")
                        )
                    )
            }),

        checkout_create: ({ input }) =>
            Effect.gen(function* () {
                if (input.sessionId.length === 0) {
                    return yield* Effect.fail(
                        new ValidationError({
                            message: "Cart session is required",
                        })
                    )
                }

                const activeDomain = yield* ActiveDomainRequestContext
                yield* requireCheckoutAllowance(
                    activeDomain.domainId,
                    input.sessionId
                )
                const now = Date.now()

                return yield* db
                    .transaction((tx) =>
                        Effect.gen(function* () {
                            const pending_order_rows = yield* tx
                                .select()
                                .from(orders)
                                .where(
                                    and(
                                        eq(
                                            orders.domain_id,
                                            activeDomain.domainId
                                        ),
                                        eq(orders.sessionId, input.sessionId),
                                        eq(orders.status, "pending")
                                    )
                                )
                                .limit(1)
                            const pending_order = pending_order_rows[0]

                            if (pending_order !== undefined) {
                                const pending_item_rows = yield* tx
                                    .select()
                                    .from(order_items)
                                    .where(
                                        eq(
                                            order_items.orderId,
                                            pending_order.id
                                        )
                                    )
                                return normalizeOrder(
                                    pending_order,
                                    pending_item_rows
                                )
                            }

                            const cart_rows = yield* tx
                                .select()
                                .from(carts)
                                .where(
                                    and(
                                        eq(
                                            carts.domain_id,
                                            activeDomain.domainId
                                        ),
                                        eq(carts.sessionId, input.sessionId)
                                    )
                                )
                                .limit(1)
                            const cart_row = cart_rows[0]

                            if (cart_row === undefined) {
                                return yield* Effect.fail(cartNotFound())
                            }

                            const cart_item_rows = yield* tx
                                .select()
                                .from(cart_items)
                                .where(eq(cart_items.cartId, cart_row.id))

                            if (cart_item_rows.length === 0) {
                                return yield* Effect.fail(
                                    new ValidationError({
                                        message: "Cart is empty",
                                    })
                                )
                            }

                            const checkout_item_rows = yield* tx
                                .select({
                                    cart_item: cart_items,
                                    product: products,
                                    variant: product_variants,
                                })
                                .from(cart_items)
                                .innerJoin(
                                    product_variants,
                                    eq(
                                        cart_items.productVariantId,
                                        product_variants.id
                                    )
                                )
                                .innerJoin(
                                    products,
                                    and(
                                        eq(
                                            products.id,
                                            product_variants.productId
                                        ),
                                        eq(products.id, cart_items.productId)
                                    )
                                )
                                .where(
                                    and(
                                        eq(cart_items.cartId, cart_row.id),
                                        eq(
                                            products.domain_id,
                                            activeDomain.domainId
                                        ),
                                        eq(products.isActive, true),
                                        eq(product_variants.isActive, true)
                                    )
                                )

                            if (
                                checkout_item_rows.length !==
                                cart_item_rows.length
                            ) {
                                return yield* Effect.fail(
                                    new ValidationError({
                                        message:
                                            "One or more cart items are no longer available",
                                    })
                                )
                            }

                            for (const checkout_item of checkout_item_rows) {
                                if (
                                    checkout_item.cart_item.quantity >
                                    checkout_item.variant.stock
                                ) {
                                    return yield* Effect.fail(
                                        new ValidationError({
                                            message:
                                                "One or more cart items are out of stock",
                                        })
                                    )
                                }
                            }

                            const order_item_values = checkout_item_rows.map(
                                (checkout_item) => {
                                    const unit_price = Math.max(
                                        0,
                                        (checkout_item.variant.priceOverride ??
                                            checkout_item.product.price) -
                                            (checkout_item.product.discount ??
                                                0)
                                    )

                                    return {
                                        id: crypto.randomUUID(),
                                        productId: checkout_item.product.id,
                                        productVariantId:
                                            checkout_item.variant.id,
                                        quantity:
                                            checkout_item.cart_item.quantity,
                                        unitPrice: unit_price,
                                        totalPrice:
                                            unit_price *
                                            checkout_item.cart_item.quantity,
                                        productName: checkout_item.product.name,
                                        productSlug: checkout_item.product.slug,
                                        productImageUrl:
                                            checkout_item.product.imageUrl,
                                        variantName: checkout_item.variant.name,
                                        variantOptions:
                                            checkout_item.variant.options,
                                        createdAt: now,
                                        updatedAt: now,
                                    }
                                }
                            )
                            const subtotal = order_item_values.reduce(
                                (total, item) => total + item.totalPrice,
                                0
                            )
                            const address = {
                                first_name: input.shippingAddress.firstName,
                                last_name: input.shippingAddress.lastName,
                                line1: input.shippingAddress.line1,
                                city: input.shippingAddress.city,
                                province: input.shippingAddress.province,
                                country: input.shippingAddress.country,
                                postal: input.shippingAddress.postal,
                            }
                            const inserted_order_rows = yield* tx
                                .insert(orders)
                                .values({
                                    id: crypto.randomUUID(),
                                    domain_id: activeDomain.domainId,
                                    sessionId: input.sessionId,
                                    email: input.email,
                                    currency: "USD",
                                    subtotal,
                                    taxAmount: 0,
                                    shippingAmount: 0,
                                    discountAmount: 0,
                                    totalPrice: subtotal,
                                    billingAddress: address,
                                    shippingAddress: address,
                                    status: "pending",
                                    createdAt: now,
                                    updatedAt: now,
                                })
                                .onConflictDoNothing()
                                .returning()
                            const inserted_order = inserted_order_rows[0]

                            if (inserted_order === undefined) {
                                const concurrent_order_rows = yield* tx
                                    .select()
                                    .from(orders)
                                    .where(
                                        and(
                                            eq(
                                                orders.domain_id,
                                                activeDomain.domainId
                                            ),
                                            eq(
                                                orders.sessionId,
                                                input.sessionId
                                            ),
                                            eq(orders.status, "pending")
                                        )
                                    )
                                    .limit(1)
                                const concurrent_order =
                                    concurrent_order_rows[0]

                                if (concurrent_order === undefined) {
                                    return yield* Effect.fail(
                                        dbError("Failed to create checkout")
                                    )
                                }

                                const concurrent_item_rows = yield* tx
                                    .select()
                                    .from(order_items)
                                    .where(
                                        eq(
                                            order_items.orderId,
                                            concurrent_order.id
                                        )
                                    )
                                return normalizeOrder(
                                    concurrent_order,
                                    concurrent_item_rows
                                )
                            }

                            yield* tx.insert(order_items).values(
                                order_item_values.map((item) => ({
                                    ...item,
                                    orderId: inserted_order.id,
                                }))
                            )
                            yield* tx
                                .delete(cart_items)
                                .where(eq(cart_items.cartId, cart_row.id))
                            const cleared_cart_rows = yield* tx
                                .update(carts)
                                .set({
                                    totalItems: 0,
                                    totalValue: 0,
                                    lastActivity: now,
                                    updatedAt: now,
                                })
                                .where(eq(carts.id, cart_row.id))
                                .returning()

                            if (cleared_cart_rows[0] === undefined) {
                                return yield* Effect.fail(
                                    dbError("Failed to clear cart")
                                )
                            }

                            const created_item_rows = yield* tx
                                .select()
                                .from(order_items)
                                .where(
                                    eq(order_items.orderId, inserted_order.id)
                                )
                            return normalizeOrder(
                                inserted_order,
                                created_item_rows
                            )
                        })
                    )
                    .pipe(
                        Effect.mapError((error) =>
                            error instanceof DatabaseError ||
                            error instanceof NotFoundError ||
                            error instanceof ValidationError
                                ? error
                                : dbError("Failed to create checkout")
                        )
                    )
            }),

        checkout_order_get: ({ id, sessionId }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                const order_rows = yield* db
                    .select()
                    .from(orders)
                    .where(
                        and(
                            eq(orders.domain_id, activeDomain.domainId),
                            eq(orders.id, id),
                            eq(orders.sessionId, sessionId)
                        )
                    )
                    .pipe(
                        Effect.mapError(() =>
                            dbError("Failed to get checkout order")
                        )
                    )
                const order_row = order_rows[0]

                if (order_row === undefined) {
                    return Option.none()
                }

                const item_rows = yield* db
                    .select()
                    .from(order_items)
                    .where(eq(order_items.orderId, order_row.id))
                    .pipe(
                        Effect.mapError(() =>
                            dbError("Failed to get checkout items")
                        )
                    )

                return Option.some(normalizeOrder(order_row, item_rows))
            }),

        orders_list: ({ email }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                const results = yield* (
                    email
                        ? db
                              .select()
                              .from(orders)
                              .where(
                                  and(
                                      eq(
                                          orders.domain_id,
                                          activeDomain.domainId
                                      ),
                                      eq(orders.email, email)
                                  )
                              )
                        : db
                              .select()
                              .from(orders)
                              .where(
                                  eq(orders.domain_id, activeDomain.domainId)
                              )
                ).pipe(Effect.mapError(() => dbError("Failed to list orders")))
                return results.map((row) => normalizeOrder(row))
            }),

        orders_get: ({ id }) =>
            Effect.gen(function* () {
                const activeDomain = yield* ActiveDomainRequestContext
                const results = yield* db
                    .select()
                    .from(orders)
                    .where(
                        and(
                            eq(orders.domain_id, activeDomain.domainId),
                            eq(orders.id, id)
                        )
                    )
                    .pipe(Effect.mapError(() => dbError("Failed to get order")))
                const orderRow = results[0]

                if (orderRow === undefined) return Option.none()

                return Option.some(normalizeOrder(orderRow))
            }),
    })
})

export type ShopRpcHandlers = ReturnType<typeof ShopRpcs.of>

export const ShopRpcLive = ShopRpcs.toLayer(ShopRpcHandlersLive)

export const findPublicProductImageUrl = (
    domain_id: string,
    product_id: string
) =>
    Effect.gen(function* () {
        const db = yield* DB
        const image_rows = yield* db
            .select({ url: images.url })
            .from(products)
            .innerJoin(
                images,
                and(
                    eq(products.image_id, images.id),
                    eq(images.domain_id, domain_id)
                )
            )
            .where(
                and(
                    eq(products.id, product_id),
                    eq(products.domain_id, domain_id),
                    eq(products.isActive, true),
                    isNull(products.deletedAt)
                )
            )
            .limit(1)

        return image_rows[0]?.url ?? undefined
    })

export const ShopRpcHandlersTagLive = Layer.effect(
    ShopRpcHandlersTag,
    ShopRpcHandlersLive
)
