import { Effect, Schema as S } from "effect"
import { Command, File, Navigation } from "foldkit"
import { Email } from "@urm/domain/schemas/contacts"
import {
    CreateCollectionInput,
    CheckoutAddress,
    ProductInput,
    UpdateCollectionInput,
} from "@urm/domain/schemas/shop"
import { toOperationError } from "@urm/utils"
import { uploadImage } from "../media/upload-image.ts"
import {
    addCartItem,
    clearCart,
    createCollection,
    createProduct,
    loadCollections,
    loadProducts,
    loadCart,
    loadOrders,
    removeCartItem,
    updateCollection,
    updateProduct,
    updateCartItem,
    createPendingOrder,
} from "./admin.rpc.ts"
import {
    CartActionFailed,
    CartLoaded,
    CartUpdated,
    CompletedOrderNavigation,
    CollectionCreated,
    CollectionsLoaded,
    CollectionUpdated,
    CompletedCollectionNavigation,
    ProductImageUploaded,
    ProductActionFailed,
    ProductCreated,
    ProductUpdated,
    ProductsLoaded,
    OrdersLoaded,
    OrderActionFailed,
    PendingOrderCreated,
} from "./admin.message.ts"
import { shopAdminCartSessionId } from "./admin.data.ts"
import { collectionHref } from "./admin.route.ts"
import { orderHref } from "./admin.route.ts"

const CreateProduct = Command.define("CreateProduct", {
    args: { product: ProductInput },
    messages: [ProductCreated, ProductActionFailed],
    execute: ({ product }) =>
        Effect.tryPromise({
            try: () => createProduct(product),
            catch: toOperationError,
        }).pipe(
            Effect.map((product) => ProductCreated({ product })),
            Effect.catch((error) =>
                Effect.succeed(
                    ProductActionFailed({
                        action: "create-product",
                        error: error.message,
                    })
                )
            )
        ),
})
const UpdateProduct = Command.define("UpdateProduct", {
    args: { id: S.String, product: ProductInput },
    messages: [ProductUpdated, ProductActionFailed],
    execute: ({ id, product }) =>
        Effect.tryPromise({
            try: () => updateProduct(id, product),
            catch: toOperationError,
        }).pipe(
            Effect.map((product) => ProductUpdated({ product })),
            Effect.catch((error) =>
                Effect.succeed(
                    ProductActionFailed({
                        action: "update-product",
                        error: error.message,
                    })
                )
            )
        ),
})
const UploadProductImage = Command.define("UploadProductImage", {
    args: { file: File.File, productName: S.String },
    messages: [ProductImageUploaded, ProductActionFailed],
    execute: ({ file, productName }) =>
        Effect.tryPromise({
            try: () =>
                uploadImage(file, {
                    alt:
                        productName.trim() ||
                        File.name(file) ||
                        "Product image",
                    category: "shop",
                }),
            catch: toOperationError,
        }).pipe(
            Effect.map((image) => ProductImageUploaded({ image })),
            Effect.catch((error) =>
                Effect.succeed(
                    ProductActionFailed({
                        action: "upload-product-image",
                        error: error.message,
                    })
                )
            )
        ),
})
const LoadProducts = Command.define("LoadProducts", {
    messages: [ProductsLoaded, ProductActionFailed],
    execute: Effect.tryPromise({
        try: loadProducts,
        catch: toOperationError,
    }).pipe(
        Effect.map((products) => ProductsLoaded({ products })),
        Effect.catch((error) =>
            Effect.succeed(
                ProductActionFailed({
                    action: "load-products",
                    error: error.message,
                })
            )
        )
    ),
})

const LoadCollections = Command.define("LoadCollections", {
    messages: [CollectionsLoaded, ProductActionFailed],
    execute: Effect.tryPromise({
        try: loadCollections,
        catch: toOperationError,
    }).pipe(
        Effect.map((collections) => CollectionsLoaded({ collections })),
        Effect.catch((error) =>
            Effect.succeed(
                ProductActionFailed({
                    action: "load-collections",
                    error: error.message,
                })
            )
        )
    ),
})

const CreateCollection = Command.define("CreateCollection", {
    args: { collection: CreateCollectionInput },
    messages: [CollectionCreated, ProductActionFailed],
    execute: ({ collection }) =>
        Effect.tryPromise({
            try: () => createCollection(collection),
            catch: toOperationError,
        }).pipe(
            Effect.map((collection) => CollectionCreated({ collection })),
            Effect.catch((error) =>
                Effect.succeed(
                    ProductActionFailed({
                        action: "create-collection",
                        error: error.message,
                    })
                )
            )
        ),
})

const UpdateCollection = Command.define("UpdateCollection", {
    args: { id: S.String, collection: UpdateCollectionInput },
    messages: [CollectionUpdated, ProductActionFailed],
    execute: ({ id, collection }) =>
        Effect.tryPromise({
            try: () => updateCollection(id, collection),
            catch: toOperationError,
        }).pipe(
            Effect.map((collection) => CollectionUpdated({ collection })),
            Effect.catch((error) =>
                Effect.succeed(
                    ProductActionFailed({
                        action: "update-collection",
                        error: error.message,
                    })
                )
            )
        ),
})

const ReplaceCollectionUrl = Command.define("ReplaceCollectionUrl", {
    args: { href: S.String },
    messages: [CompletedCollectionNavigation],
    execute: ({ href }) =>
        Navigation.replaceUrl(href).pipe(
            Effect.as(CompletedCollectionNavigation())
        ),
})

const LoadCart = Command.define("LoadCart", {
    messages: [CartLoaded, CartActionFailed],
    execute: Effect.tryPromise({
        try: () => loadCart(shopAdminCartSessionId),
        catch: toOperationError,
    }).pipe(
        Effect.map((snapshot) => CartLoaded({ snapshot })),
        Effect.catch((error) =>
            Effect.succeed(CartActionFailed({ error: error.message }))
        )
    ),
})

const AddCartItem = Command.define("AddCartItem", {
    args: { variantId: S.String, quantity: S.Number },
    messages: [CartUpdated, CartActionFailed],
    execute: ({ variantId, quantity }) =>
        Effect.tryPromise({
            try: () => addCartItem(shopAdminCartSessionId, variantId, quantity),
            catch: toOperationError,
        }).pipe(
            Effect.map((snapshot) => CartUpdated({ snapshot })),
            Effect.catch((error) =>
                Effect.succeed(CartActionFailed({ error: error.message }))
            )
        ),
})

const UpdateCartItem = Command.define("UpdateCartItem", {
    args: { itemId: S.String, quantity: S.Number },
    messages: [CartUpdated, CartActionFailed],
    execute: ({ itemId, quantity }) =>
        Effect.tryPromise({
            try: () => updateCartItem(shopAdminCartSessionId, itemId, quantity),
            catch: toOperationError,
        }).pipe(
            Effect.map((snapshot) => CartUpdated({ snapshot })),
            Effect.catch((error) =>
                Effect.succeed(CartActionFailed({ error: error.message }))
            )
        ),
})

const RemoveCartItem = Command.define("RemoveCartItem", {
    args: { itemId: S.String },
    messages: [CartUpdated, CartActionFailed],
    execute: ({ itemId }) =>
        Effect.tryPromise({
            try: () => removeCartItem(shopAdminCartSessionId, itemId),
            catch: toOperationError,
        }).pipe(
            Effect.map((snapshot) => CartUpdated({ snapshot })),
            Effect.catch((error) =>
                Effect.succeed(CartActionFailed({ error: error.message }))
            )
        ),
})

const ClearCart = Command.define("ClearCart", {
    args: { itemIds: S.Array(S.String) },
    messages: [CartUpdated, CartActionFailed],
    execute: ({ itemIds }) =>
        Effect.tryPromise({
            try: () => clearCart(shopAdminCartSessionId, itemIds),
            catch: toOperationError,
        }).pipe(
            Effect.map((snapshot) => CartUpdated({ snapshot })),
            Effect.catch((error) =>
                Effect.succeed(CartActionFailed({ error: error.message }))
            )
        ),
})

const LoadOrders = Command.define("LoadOrders", {
    messages: [OrdersLoaded, OrderActionFailed],
    execute: Effect.tryPromise({
        try: loadOrders,
        catch: toOperationError,
    }).pipe(
        Effect.map((orders) => OrdersLoaded({ orders: [...orders] })),
        Effect.catch((error) =>
            Effect.succeed(OrderActionFailed({ error: error.message }))
        )
    ),
})

const CreatePendingOrder = Command.define("CreatePendingOrder", {
    args: {
        sessionId: S.String,
        checkoutKey: S.String,
        email: Email,
        shippingAddress: CheckoutAddress,
    },
    messages: [PendingOrderCreated, OrderActionFailed],
    execute: ({ sessionId, checkoutKey, email, shippingAddress }) =>
        Effect.tryPromise({
            try: () =>
                createPendingOrder(
                    sessionId,
                    checkoutKey,
                    email,
                    shippingAddress
                ),
            catch: toOperationError,
        }).pipe(
            Effect.map((snapshot) => PendingOrderCreated({ snapshot })),
            Effect.catch((error) =>
                Effect.succeed(OrderActionFailed({ error: error.message }))
            )
        ),
})

const ReplaceOrderUrl = Command.define("ReplaceOrderUrl", {
    args: { href: S.String },
    messages: [CompletedOrderNavigation],
    execute: ({ href }) =>
        Navigation.replaceUrl(href).pipe(Effect.as(CompletedOrderNavigation())),
})

export const loadProductList = () => LoadProducts()

export const loadCollectionList = () => LoadCollections()

export const loadCurrentCart = () => LoadCart()

export const loadOrderList = () => LoadOrders()

export const addItemToCart = (variantId: string, quantity: number) =>
    AddCartItem({ variantId, quantity })

export const changeCartItemQuantity = (itemId: string, quantity: number) =>
    UpdateCartItem({ itemId, quantity })

export const removeItemFromCart = (itemId: string) => RemoveCartItem({ itemId })

export const clearCurrentCart = (itemIds: ReadonlyArray<string>) =>
    ClearCart({ itemIds: [...itemIds] })

export const createPendingOrderFromCart = (
    sessionId: string,
    checkoutKey: string,
    email: typeof Email.Type,
    shippingAddress: CheckoutAddress
) => CreatePendingOrder({ sessionId, checkoutKey, email, shippingAddress })

export const replaceOrderUrl = (orderId: string) =>
    ReplaceOrderUrl({ href: orderHref(orderId) })

export const createProductFromDraft = (product: ProductInput) =>
    CreateProduct({ product })

export const updateProductFromDraft = (id: string, product: ProductInput) =>
    UpdateProduct({ id, product })

export const uploadProductImage = (file: File.File, productName: string) =>
    UploadProductImage({ file, productName })

export const createCollectionFromDraft = (collection: CreateCollectionInput) =>
    CreateCollection({ collection })

export const updateCollectionFromDraft = (
    id: string,
    collection: UpdateCollectionInput
) => UpdateCollection({ id, collection })

export const replaceCollectionUrl = (slug: string) =>
    ReplaceCollectionUrl({ href: collectionHref(slug) })
