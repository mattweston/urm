import { Effect, Option, Schema as S } from "effect"
import { Command, File, Navigation, Submodel } from "foldkit"
import type { Url } from "foldkit/url"
import { taggedStruct } from "foldkit/schema"
import { defineMessageUnion } from "foldkit/message"
import { Remote, RemoteMutationError } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import {
    ChangeShopCatalog,
    ChangeShopCart,
    CreateShopPendingOrder,
    DomainShopCatalog,
    DomainShopCart,
    DomainShopOrders,
    ShopCatalogEntity,
    ShopCatalogSummary,
    ShopCartEntity,
    ShopCartSummary,
    ShopOrdersEntity,
    ShopOrdersSummary,
} from "@urm/contracts/shop"
import { DomainMedia, MediaLibrary } from "@urm/contracts/media"
import { Image } from "@urm/domain/schemas/media"
import {
    ShopCatalog,
    ShopCatalogAction,
    ShopCartAction,
    ShopCartSnapshot,
    ShopCheckoutInput,
    ShopOrderSnapshot,
} from "@urm/domain/shop"
import * as Shop from "@urm/features/shop/admin"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"

export const Model = S.Struct({
    ui: Shop.Model,
    account_id: S.String,
    domain_id: S.String,
    epoch: S.Number,
})
export type Model = typeof Model.Type
const scope = {
    account_id: S.String,
    domain_id: S.String,
    epoch: S.Number,
}
const Loaded = taggedStruct("ShopRemoteLoaded", {
    ...scope,
    catalog: ShopCatalog,
    cart: S.NullOr(ShopCartSnapshot),
    orders: S.Array(ShopOrderSnapshot),
})
export const shop_remote_loaded = Loaded
const CatalogSaved = taggedStruct("ShopRemoteCatalogSaved", {
    ...scope,
    action: ShopCatalogAction,
    catalog: ShopCatalog,
})
const CartSaved = taggedStruct("ShopRemoteCartSaved", {
    ...scope,
    snapshot: S.NullOr(ShopCartSnapshot),
})
const OrderSaved = taggedStruct("ShopRemoteOrderSaved", {
    ...scope,
    snapshot: ShopOrderSnapshot,
})
const Uploaded = taggedStruct("ShopRemoteImageUploaded", {
    ...scope,
    id: S.String,
    url: S.String,
    filename: S.String,
    updated_at: S.Number,
})
const MediaLoaded = taggedStruct("ShopRemoteMediaLoaded", {
    ...scope,
    request: S.Number,
    images: S.Array(Image),
})
const MediaFailed = taggedStruct("ShopRemoteMediaFailed", {
    ...scope,
    request: S.Number,
    error: S.String,
})
const Refreshed = taggedStruct("ShopRemoteRefreshed")
const Failed = taggedStruct("ShopRemoteFailed", {
    ...scope,
    category: S.Literals(["load", "catalog", "cart", "order", "upload"]),
    error: S.String,
})
export const Message = S.Union([
    Shop.Message,
    Loaded,
    CatalogSaved,
    CartSaved,
    OrderSaved,
    Uploaded,
    MediaLoaded,
    MediaFailed,
    Failed,
    Refreshed,
])
export type Message = typeof Message.Type
type Commands = ReadonlyArray<Command.Command<Message, never, ContactsApi>>
export type UpdateReturn = readonly [Model, Commands]

const Cache = Surface.application({
    Model: S.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
const Data = Remote.make({
    model: Cache.model.remote,
    entities: [
        ShopCatalogEntity,
        ShopCartEntity,
        ShopOrdersEntity,
        MediaLibrary,
    ],
    queries: [DomainShopCatalog, DomainShopCart, DomainShopOrders, DomainMedia],
    mutations: [ChangeShopCatalog, ChangeShopCart, CreateShopPendingOrder],
})
const catalog_query = (domain_id: string) =>
    Data.query(
        DomainShopCatalog,
        { domain_id },
        {
            select: ShopCatalogSummary,
            first: 1,
        }
    )
const cart_query = (domain_id: string) =>
    Data.query(
        DomainShopCart,
        { domain_id },
        {
            select: ShopCartSummary,
            first: 1,
        }
    )
const orders_query = (domain_id: string) =>
    Data.query(
        DomainShopOrders,
        { domain_id },
        {
            select: ShopOrdersSummary,
            first: 1,
        }
    )
const media_summary = MediaLibrary.select({ id: true, images: true })
const media_query = (domain_id: string) =>
    Data.query(DomainMedia, { domain_id }, { select: media_summary, first: 1 })

const check_session = Effect.fn("Shop.checkSession")(function* (
    account_id: string,
    domain_id: string,
    write: boolean
) {
    const api = yield* ContactsApi
    const session = yield* api.session()
    if (
        session.account_id !== account_id ||
        !session.domains.some(
            (workspace) =>
                workspace.id === domain_id && (!write || workspace.can_write)
        )
    )
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message: "Shop access changed. Reload this workspace.",
            })
        )
    return api
})
const error_message = (error: unknown) =>
    error instanceof RemoteMutationError || error instanceof AccountRequestError
        ? error.message
        : "Shop is unavailable. Check the server connection and retry."

const LoadPostgresShop = Command.define("LoadPostgresShop", {
    args: scope,
    messages: [Loaded, Failed],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* check_session(
                args.account_id,
                args.domain_id,
                false
            )
            const client = api.remote(args.domain_id)
            const catalog_remote = yield* Data.prefetch(
                { remote: Remote.initial },
                catalog_query(args.domain_id)
            ).pipe(Effect.provide(client))
            const cart_remote = yield* Data.prefetch(
                catalog_remote,
                cart_query(args.domain_id)
            ).pipe(Effect.provide(client))
            const orders_remote = yield* Data.prefetch(
                cart_remote,
                orders_query(args.domain_id)
            ).pipe(Effect.provide(client))
            const catalog = catalog_query(args.domain_id).read(orders_remote)
            const cart = cart_query(args.domain_id).read(orders_remote)
            const orders = orders_query(args.domain_id).read(orders_remote)
            if (
                catalog._tag !== "Ready" ||
                cart._tag !== "Ready" ||
                orders._tag !== "Ready" ||
                catalog.value.items[0] === undefined ||
                cart.value.items[0] === undefined ||
                orders.value.items[0] === undefined
            )
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 503,
                        message: "Shop data is unavailable. Try again.",
                    })
                )
            return Loaded({
                ...args,
                catalog: catalog.value.items[0],
                cart: cart.value.items[0].snapshot,
                orders: orders.value.items[0].orders,
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Failed({
                        ...args,
                        category: "load",
                        error: error_message(error),
                    })
                )
            )
        ),
})
const ChangePostgresShopCatalog = Command.define("ChangePostgresShopCatalog", {
    args: { ...scope, action: ShopCatalogAction },
    messages: [CatalogSaved, Failed],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* check_session(
                args.account_id,
                args.domain_id,
                true
            )
            const action: ShopCatalogAction =
                args.action._tag === "create_product"
                    ? {
                          ...args.action,
                          id: crypto.randomUUID(),
                          variant_id: crypto.randomUUID(),
                      }
                    : args.action._tag === "create_collection"
                      ? { ...args.action, id: crypto.randomUUID() }
                      : args.action._tag === "update_product"
                        ? { ...args.action, variant_id: crypto.randomUUID() }
                        : args.action
            const result = yield* Remote.mutate(
                ChangeShopCatalog,
                {
                    domain_id: args.domain_id,
                    account_id: args.account_id,
                    action,
                },
                crypto.randomUUID()
            ).pipe(Effect.provide(api.remote(args.domain_id)))
            return CatalogSaved({
                ...args,
                action,
                catalog: result.output.catalog,
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Failed({
                        ...args,
                        category: "catalog",
                        error: error_message(error),
                    })
                )
            )
        ),
})
const ChangePostgresShopCart = Command.define("ChangePostgresShopCart", {
    args: { ...scope, action: ShopCartAction },
    messages: [CartSaved, Failed],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* check_session(
                args.account_id,
                args.domain_id,
                true
            )
            const result = yield* Remote.mutate(
                ChangeShopCart,
                {
                    domain_id: args.domain_id,
                    account_id: args.account_id,
                    action: args.action,
                },
                crypto.randomUUID()
            ).pipe(Effect.provide(api.remote(args.domain_id)))
            return CartSaved({
                ...args,
                snapshot: result.output.state.snapshot,
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Failed({
                        ...args,
                        category: "cart",
                        error: error_message(error),
                    })
                )
            )
        ),
})
const CreatePostgresShopOrder = Command.define("CreatePostgresShopOrder", {
    args: { ...scope, checkout: ShopCheckoutInput },
    messages: [OrderSaved, Failed],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* check_session(
                args.account_id,
                args.domain_id,
                true
            )
            const result = yield* Remote.mutate(
                CreateShopPendingOrder,
                {
                    domain_id: args.domain_id,
                    account_id: args.account_id,
                    checkout: args.checkout,
                },
                args.checkout.checkout_key
            ).pipe(Effect.provide(api.remote(args.domain_id)))
            return OrderSaved({
                ...args,
                snapshot: result.output.snapshot,
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Failed({
                        ...args,
                        category: "order",
                        error: error_message(error),
                    })
                )
            )
        ),
})
const UploadPostgresShopImage = Command.define("UploadPostgresShopImage", {
    args: { ...scope, file: File.File },
    messages: [Uploaded, Failed],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* check_session(
                args.account_id,
                args.domain_id,
                true
            )
            const url = yield* api.upload_image(
                args.domain_id,
                args.file,
                "Shop"
            )
            return Uploaded({
                ...args,
                id: url.split("/").at(-1) ?? "",
                url,
                filename: args.file.name,
                updated_at: Date.now(),
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Failed({
                        ...args,
                        category: "upload",
                        error: error_message(error),
                    })
                )
            )
        ),
})
const LoadPostgresShopMedia = Command.define("LoadPostgresShopMedia", {
    args: { ...scope, request: S.Number },
    messages: [MediaLoaded, MediaFailed],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* check_session(
                args.account_id,
                args.domain_id,
                false
            )
            const loaded = yield* Data.prefetch(
                { remote: Remote.initial },
                media_query(args.domain_id)
            ).pipe(Effect.provide(api.remote(args.domain_id)))
            const result = media_query(args.domain_id).read(loaded)
            if (result._tag !== "Ready" || result.value.items[0] === undefined)
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 503,
                        message: "Media library is unavailable. Try again.",
                    })
                )
            return MediaLoaded({
                ...args,
                images: result.value.items[0].images,
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    MediaFailed({
                        ...args,
                        error:
                            error instanceof AccountRequestError
                                ? error.message
                                : "Media library could not be loaded. Try again.",
                    })
                )
            )
        ),
})
const ReplacePostgresShopUrl = Command.define("ReplacePostgresShopUrl", {
    args: { href: S.String, order: S.Boolean },
    messages: [
        Shop.CompletedCollectionNavigation,
        Shop.CompletedOrderNavigation,
    ],
    execute: ({ href, order }) =>
        Navigation.replaceUrl(href).pipe(
            Effect.as(
                order
                    ? Shop.CompletedOrderNavigation()
                    : Shop.CompletedCollectionNavigation()
            )
        ),
})

const feature_product = (
    product: (typeof ShopCatalog.Type)["products"][number],
    catalog: typeof ShopCatalog.Type
): Shop.ModelType["products"][number] => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    discount: null,
    imageUrl: product.image_url,
    ...(product.image_id === null ? {} : { imageId: product.image_id }),
    images: [product.image_url],
    isActive: product.is_active,
    isFeatured: product.is_featured,
    collectionIds: catalog.memberships
        .filter((row) => row.product_id === product.id)
        .map((row) => row.collection_id),
    variants: catalog.variants
        .filter((row) => row.product_id === product.id)
        .map((row) => ({
            id: row.id,
            productId: row.product_id,
            name: row.name,
            description: row.description,
            sku: row.sku,
            price: row.price,
            currency: row.currency,
            stock: row.stock,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        })),
    createdAt: product.created_at,
    updatedAt: product.updated_at,
})
const feature_collection = (
    collection: (typeof ShopCatalog.Type)["collections"][number],
    catalog: typeof ShopCatalog.Type
): Shop.ModelType["collections"][number] => ({
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    imageUrl: collection.image_url,
    isActive: collection.is_active,
    productCount: catalog.memberships.filter(
        (row) => row.collection_id === collection.id
    ).length,
    createdAt: collection.created_at,
    updatedAt: collection.updated_at,
})
const feature_catalog = (catalog: typeof ShopCatalog.Type) =>
    Shop.CatalogLoaded({
        products: catalog.products.map((product) =>
            feature_product(product, catalog)
        ),
        collections: catalog.collections.map((collection) =>
            feature_collection(collection, catalog)
        ),
    })
const feature_cart = (snapshot: typeof ShopCartSnapshot.Type | null) => {
    if (snapshot === null)
        return Shop.CartLoaded({ snapshot: { cart: null, items: [] } })
    const items = snapshot.items.map((item) => ({
        id: item.id,
        cartId: item.cart_id,
        variantId: item.variant_id,
        productId: item.product_id,
        quantity: item.quantity,
        productName: item.product_name,
        variantName: item.variant_name,
        productPrice: item.product_price,
        productImageUrl: item.product_image_url,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
    }))
    return Shop.CartLoaded({
        snapshot: {
            cart: {
                id: snapshot.cart.id,
                sessionId: snapshot.cart.session_id,
                contactId: snapshot.cart.contact_id,
                customerId: null,
                itemCount: snapshot.item_count,
                totalPrice: snapshot.total_price,
                currency: snapshot.cart.currency,
                items,
                createdAt: snapshot.cart.created_at,
                updatedAt: snapshot.cart.updated_at,
            },
            items,
        },
    })
}
const feature_order = (snapshot: typeof ShopOrderSnapshot.Type) => {
    const items = snapshot.items.map((item) => ({
        id: item.id,
        orderId: item.order_id,
        variantId: item.variant_id,
        productId: item.product_id,
        quantity: item.quantity,
        productName: item.product_name,
        variantName: item.variant_name,
        productPrice: item.product_price,
        productImageUrl: item.product_image_url,
        createdAt: item.created_at,
    }))
    return {
        order: {
            id: snapshot.order.id,
            email: snapshot.order.email,
            status: snapshot.order.status,
            totalPrice: snapshot.order.total_price,
            currency: snapshot.order.currency,
            stripeCheckoutSessionId: null,
            stripePaymentIntentId: null,
            stripeChargeId: null,
            shippingAddress: snapshot.order.shipping_address,
            items,
            createdAt: snapshot.order.created_at,
            updatedAt: snapshot.order.updated_at,
        },
        items,
    }
}
const valid_scope = (
    model: Model,
    message: {
        readonly account_id: string
        readonly domain_id: string
        readonly epoch: number
    }
) =>
    model.epoch === message.epoch &&
    model.account_id === message.account_id &&
    model.domain_id === message.domain_id

const command_for = (
    model: Model,
    command: Command.Command<Shop.MessageType>
): Commands => {
    if (model.account_id === "" || model.domain_id === "") return []
    const args = {
        account_id: model.account_id,
        domain_id: model.domain_id,
        epoch: model.epoch,
    }
    if (
        command.name === "LoadProducts" ||
        command.name === "LoadCollections" ||
        command.name === "LoadCart" ||
        command.name === "LoadOrders"
    )
        return [LoadPostgresShop(args)]
    if (command.name === "AddCartItem") {
        const input = S.decodeUnknownOption(
            S.Struct({ variantId: S.String, quantity: S.Number })
        )(command.args)
        return Option.match(input, {
            onNone: () => [],
            onSome: ({ variantId, quantity }) => [
                ChangePostgresShopCart({
                    ...args,
                    action: {
                        _tag: "add_item",
                        session_id: Shop.shopAdminCartSessionId,
                        variant_id: variantId,
                        quantity,
                    },
                }),
            ],
        })
    }
    if (command.name === "UpdateCartItem") {
        const input = S.decodeUnknownOption(
            S.Struct({ itemId: S.String, quantity: S.Number })
        )(command.args)
        return Option.match(input, {
            onNone: () => [],
            onSome: ({ itemId, quantity }) => [
                ChangePostgresShopCart({
                    ...args,
                    action: {
                        _tag: "update_item",
                        session_id: Shop.shopAdminCartSessionId,
                        item_id: itemId,
                        quantity,
                    },
                }),
            ],
        })
    }
    if (command.name === "RemoveCartItem") {
        const input = S.decodeUnknownOption(S.Struct({ itemId: S.String }))(
            command.args
        )
        return Option.match(input, {
            onNone: () => [],
            onSome: ({ itemId }) => [
                ChangePostgresShopCart({
                    ...args,
                    action: {
                        _tag: "remove_item",
                        session_id: Shop.shopAdminCartSessionId,
                        item_id: itemId,
                    },
                }),
            ],
        })
    }
    if (command.name === "ClearCart")
        return [
            ChangePostgresShopCart({
                ...args,
                action: {
                    _tag: "clear",
                    session_id: Shop.shopAdminCartSessionId,
                },
            }),
        ]
    if (command.name === "CreatePendingOrder") {
        const input = S.decodeUnknownOption(
            S.Struct({
                sessionId: S.String,
                checkoutKey: S.String,
                email: ShopCheckoutInput.fields.email,
                shippingAddress: S.Struct({
                    firstName: S.String,
                    lastName: S.String,
                    line1: S.String,
                    city: S.String,
                    province: S.String,
                    country: S.String,
                    postal: S.String,
                }),
            })
        )(command.args)
        return Option.match(input, {
            onNone: () => [],
            onSome: (value) => [
                CreatePostgresShopOrder({
                    ...args,
                    checkout: {
                        session_id: value.sessionId,
                        checkout_key: value.checkoutKey,
                        email: value.email,
                        shipping_address: value.shippingAddress,
                    },
                }),
            ],
        })
    }
    if (command.name === "CreateProduct" || command.name === "UpdateProduct") {
        const input = S.decodeUnknownOption(
            S.Struct({
                id: S.optional(S.String),
                product: S.Struct({
                    name: S.String,
                    slug: S.String,
                    description: S.String,
                    price: S.Number,
                    inventory: S.Number,
                    imageUrl: S.String,
                    imageId: S.optional(S.String),
                    collectionIds: S.optional(S.Array(S.String)),
                    isActive: S.Boolean,
                    isFeatured: S.Boolean,
                }),
            })
        )(command.args)
        return Option.match(input, {
            onNone: () => [],
            onSome: ({ id, product }) => {
                const fields = {
                    name: product.name.trim(),
                    slug: product.slug.trim(),
                    description: product.description.trim() || null,
                    price: product.price,
                    inventory: product.inventory,
                    image_url: product.imageUrl.trim(),
                    image_id: product.imageUrl.startsWith(
                        `/api/uploads/${model.domain_id}/shop/`
                    )
                        ? null
                        : (product.imageId ?? null),
                    collection_ids: product.collectionIds ?? [],
                    is_active: product.isActive,
                    is_featured: product.isFeatured,
                }
                const action: ShopCatalogAction =
                    id === undefined
                        ? {
                              _tag: "create_product",
                              id: "",
                              variant_id: "",
                              ...fields,
                          }
                        : {
                              _tag: "update_product",
                              id,
                              variant_id: "",
                              ...fields,
                          }
                return [ChangePostgresShopCatalog({ ...args, action })]
            },
        })
    }
    if (
        command.name === "CreateCollection" ||
        command.name === "UpdateCollection"
    ) {
        const input = S.decodeUnknownOption(
            S.Struct({
                id: S.optional(S.String),
                collection: S.Struct({
                    name: S.String,
                    slug: S.String,
                    description: S.optional(S.String),
                    imageUrl: S.optional(S.String),
                    isActive: S.Boolean,
                }),
            })
        )(command.args)
        return Option.match(input, {
            onNone: () => [],
            onSome: ({ id, collection }) => {
                const action: ShopCatalogAction = {
                    _tag:
                        id === undefined
                            ? "create_collection"
                            : "update_collection",
                    id: id ?? "",
                    name: collection.name.trim(),
                    slug: collection.slug.trim(),
                    description: collection.description?.trim() || null,
                    image_url: collection.imageUrl?.trim() || null,
                    is_active: collection.isActive,
                }
                return [ChangePostgresShopCatalog({ ...args, action })]
            },
        })
    }
    if (command.name === "UploadProductImage") {
        if (!S.is(S.Struct({ file: File.File }))(command.args)) return []
        return [UploadPostgresShopImage({ ...args, file: command.args.file })]
    }
    if (
        command.name === "ReplaceCollectionUrl" ||
        command.name === "ReplaceOrderUrl"
    ) {
        const input = S.decodeUnknownOption(S.Struct({ href: S.String }))(
            command.args
        )
        return Option.match(input, {
            onNone: () => [],
            onSome: ({ href }) => [
                ReplacePostgresShopUrl({
                    href,
                    order: command.name === "ReplaceOrderUrl",
                }),
            ],
        })
    }
    return []
}
const feature_update = (
    model: Model,
    message: Shop.MessageType
): UpdateReturn => {
    const [ui, feature_commands] = Shop.update(model.ui, message)
    const next = { ...model, ui }
    return [
        next,
        feature_commands.flatMap((command) => command_for(next, command)),
    ]
}
const apply_feature = (model: Model, message: Shop.MessageType): Model =>
    feature_update(model, message)[0]
export const init = (url: Url, pathname: string): Model => ({
    ui: Shop.init(Shop.routeForUrl({ ...url, pathname }))[0],
    account_id: "",
    domain_id: "",
    epoch: 0,
})
export const clear = (model: Model): Model => ({
    ...model,
    ui: Shop.init(model.ui.route)[0],
    account_id: "",
    domain_id: "",
    epoch: model.epoch + 1,
})
export const synchronize = (
    model: Model,
    next_scope: { account_id: string; domain_id: string } | null
): UpdateReturn => {
    if (next_scope === null) return [clear(model), []]
    if (
        next_scope.account_id === model.account_id &&
        next_scope.domain_id === model.domain_id
    )
        return [model, []]
    const next = {
        ...model,
        ui: Shop.init(model.ui.route)[0],
        account_id: next_scope.account_id,
        domain_id: next_scope.domain_id,
        epoch: model.epoch + 1,
    }
    return [next, [LoadPostgresShop({ ...next_scope, epoch: next.epoch })]]
}
export const changed_url = (
    model: Model,
    url: Url,
    pathname: string,
    _active_domain_id: Option.Option<string>
): UpdateReturn => {
    const next = apply_feature(
        model,
        Shop.ChangedRoute({
            route: Shop.routeForUrl({ ...url, pathname }),
        })
    )
    const refreshed = { ...next, epoch: next.epoch + 1 }
    return [
        refreshed,
        refreshed.domain_id === ""
            ? []
            : [
                  LoadPostgresShop({
                      account_id: refreshed.account_id,
                      domain_id: refreshed.domain_id,
                      epoch: refreshed.epoch,
                  }),
              ],
    ]
}
export const update = (
    model: Model,
    message: Message,
    _active_domain_id: Option.Option<string>
): UpdateReturn => {
    if (message._tag === "ShopRemoteMediaLoaded") {
        if (
            !valid_scope(model, message) ||
            !model.ui.isProductMediaLibraryOpen ||
            model.ui.productMediaRequest !== message.request
        )
            return [model, []]
        return feature_update(
            model,
            Shop.ProductMediaLoaded({ images: message.images })
        )
    }
    if (message._tag === "ShopRemoteMediaFailed") {
        if (
            !valid_scope(model, message) ||
            !model.ui.isProductMediaLibraryOpen ||
            model.ui.productMediaRequest !== message.request
        )
            return [model, []]
        return feature_update(
            model,
            Shop.ProductMediaFailed({ error: message.error })
        )
    }
    if (message._tag === "OpenedProductMediaLibrary") {
        const [next, commands] = feature_update(model, message)
        if (next.account_id === "" || next.domain_id === "")
            return [next, commands]
        return [
            next,
            [
                ...commands,
                LoadPostgresShopMedia({
                    account_id: next.account_id,
                    domain_id: next.domain_id,
                    epoch: next.epoch,
                    request: next.ui.productMediaRequest,
                }),
            ],
        ]
    }
    if (message._tag === "ShopRemoteLoaded") {
        if (!valid_scope(model, message)) return [model, []]
        let next = apply_feature(model, feature_catalog(message.catalog))
        next = apply_feature(next, feature_cart(message.cart))
        next = apply_feature(
            next,
            Shop.OrdersLoaded({
                orders: message.orders.map(feature_order),
            })
        )
        return [next, []]
    }
    if (message._tag === "ShopRemoteCatalogSaved") {
        if (!valid_scope(model, message)) return [model, []]
        const action = message.action
        if (action._tag === "set_product_collections")
            return [apply_feature(model, feature_catalog(message.catalog)), []]
        const event =
            action._tag === "create_collection" ||
            action._tag === "update_collection"
                ? (() => {
                      const record = message.catalog.collections.find(
                          (row) => row.id === action.id
                      )
                      if (record === undefined) return null
                      const collection = feature_collection(
                          record,
                          message.catalog
                      )
                      return action._tag === "create_collection"
                          ? Shop.CollectionCreated({ collection })
                          : Shop.CollectionUpdated({ collection })
                  })()
                : (() => {
                      const record = message.catalog.products.find(
                          (row) => row.id === action.id
                      )
                      if (record === undefined) return null
                      const product = feature_product(record, message.catalog)
                      return action._tag === "create_product"
                          ? Shop.ProductCreated({ product })
                          : Shop.ProductUpdated({ product })
                  })()
        if (event === null) return [model, []]
        const [next, commands] = feature_update(
            { ...model, epoch: model.epoch + 1 },
            event
        )
        return [apply_feature(next, feature_catalog(message.catalog)), commands]
    }
    if (message._tag === "ShopRemoteCartSaved") {
        if (!valid_scope(model, message)) return [model, []]
        return feature_update(
            { ...model, epoch: model.epoch + 1 },
            Shop.CartUpdated({
                snapshot: feature_cart(message.snapshot).snapshot,
            })
        )
    }
    if (message._tag === "ShopRemoteOrderSaved") {
        if (!valid_scope(model, message)) return [model, []]
        const [next, commands] = feature_update(
            { ...model, epoch: model.epoch + 1 },
            Shop.PendingOrderCreated({
                snapshot: feature_order(message.snapshot),
            })
        )
        return [
            next,
            [
                ...commands,
                LoadPostgresShop({
                    account_id: next.account_id,
                    domain_id: next.domain_id,
                    epoch: next.epoch,
                }),
            ],
        ]
    }
    if (message._tag === "ShopRemoteImageUploaded") {
        if (!valid_scope(model, message)) return [model, []]
        return feature_update(
            model,
            Shop.ProductImageUploaded({
                image: {
                    id: message.id,
                    url: message.url,
                    alt: message.filename,
                    text: "",
                    category: "shop",
                    order_position: message.updated_at,
                    updated_at: message.updated_at,
                },
            })
        )
    }
    if (message._tag === "ShopRemoteFailed") {
        if (!valid_scope(model, message)) return [model, []]
        if (message.category === "cart")
            return feature_update(
                model,
                Shop.CartActionFailed({ error: message.error })
            )
        if (message.category === "order")
            return feature_update(
                model,
                Shop.OrderActionFailed({ error: message.error })
            )
        const action =
            message.category === "upload"
                ? "upload-product-image"
                : "load-products"
        const [next, commands] = feature_update(
            model,
            Shop.ProductActionFailed({ action, error: message.error })
        )
        return [
            message.category === "load"
                ? {
                      ...next,
                      ui: {
                          ...next.ui,
                          isCartLoading: false,
                          areOrdersLoading: false,
                          areCollectionsLoading: false,
                      },
                  }
                : next,
            commands,
        ]
    }
    if (message._tag === "ShopRemoteRefreshed") {
        if (model.domain_id === "") return [model, []]
        const next = { ...model, epoch: model.epoch + 1 }
        return [
            next,
            [
                LoadPostgresShop({
                    account_id: next.account_id,
                    domain_id: next.domain_id,
                    epoch: next.epoch,
                }),
            ],
        ]
    }
    return feature_update(model, message)
}
export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [],
        [
            ...Option.match(model.ui.error, {
                onNone: () => [],
                onSome: () => [
                    h.button(
                        [h.Type("button"), h.OnClick(Refreshed())],
                        ["Retry Shop"]
                    ),
                ],
            }),
            h.submodel({
                slotId: "shop-ui",
                model: model.ui,
                view: Shop.view,
                toParentMessage: (message) => message,
            }),
        ]
    )
)
export const cart_session_id = Shop.shopAdminCartSessionId
export const submitted_product_form = Shop.SubmittedProductForm
