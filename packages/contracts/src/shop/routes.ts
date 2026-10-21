import { Rpc, RpcGroup } from "effect/unstable/rpc"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"
import { Schema } from "effect"
import {
    Product,
    ProductCollection,
    Cart,
    CartItem,
    ProductInput,
    Order,
    AddToCartInput,
    RemoveFromCartInput,
    UpdateCartItemInput,
    CheckoutCreateInput,
    DatabaseError,
    NotFoundError,
    ValidationError,
} from "@urm/domain/schemas/shop"

export const ShopProductsListRpc = Rpc.make("products_list", {
    payload: Schema.Struct({
        collectionId: Schema.optional(Schema.String),
        featured: Schema.optional(Schema.Boolean),
    }),
    success: Schema.Array(Product),
    error: DatabaseError,
})

export const ShopProductsGetRpc = Rpc.make("products_get", {
    payload: Schema.Struct({
        id: Schema.optional(Schema.String),
        slug: Schema.optional(Schema.String),
    }),
    success: Schema.Option(Product),
    error: DatabaseError,
})

export const ShopProductsCreateRpc = Rpc.make("products_create", {
    payload: ProductInput,
    success: Product,
    error: Schema.Union([DatabaseError, ValidationError]),
})

export const ShopProductsUpdateRpc = Rpc.make("products_update", {
    payload: Schema.Struct({
        id: Schema.String,
        product: ProductInput,
    }),
    success: Product,
    error: Schema.Union([DatabaseError, NotFoundError, ValidationError]),
})

export const ShopCollectionsListRpc = Rpc.make("collections_list", {
    payload: Schema.Struct({}),
    success: Schema.Array(ProductCollection),
    error: DatabaseError,
})

export const ShopCartGetRpc = Rpc.make("cart_get", {
    payload: Schema.Struct({
        sessionId: Schema.String,
    }),
    success: Schema.Struct({
        cart: Cart,
        items: Schema.Array(CartItem),
    }),
    error: Schema.Union([DatabaseError, NotFoundError]),
})

export const ShopCartAddRpc = Rpc.make("cart_add", {
    payload: Schema.Struct({
        input: AddToCartInput,
    }),
    success: Schema.Struct({
        cart: Cart,
        items: Schema.Array(CartItem),
    }),
    error: Schema.Union([DatabaseError, ValidationError, NotFoundError]),
})

export const ShopCartRemoveRpc = Rpc.make("cart_remove", {
    payload: Schema.Struct({
        input: RemoveFromCartInput,
    }),
    success: Schema.Struct({
        cart: Cart,
        items: Schema.Array(CartItem),
    }),
    error: Schema.Union([DatabaseError, NotFoundError, ValidationError]),
})

export const ShopCartUpdateRpc = Rpc.make("cart_update", {
    payload: Schema.Struct({
        input: UpdateCartItemInput,
    }),
    success: Schema.Struct({
        cart: Cart,
        items: Schema.Array(CartItem),
    }),
    error: Schema.Union([DatabaseError, ValidationError, NotFoundError]),
})

export const ShopCheckoutCreateRpc = Rpc.make("checkout_create", {
    payload: Schema.Struct({
        input: CheckoutCreateInput,
    }),
    success: Order,
    error: Schema.Union([DatabaseError, ValidationError, NotFoundError]),
})

export const ShopCheckoutOrderGetRpc = Rpc.make("checkout_order_get", {
    payload: Schema.Struct({
        id: Schema.String,
        sessionId: Schema.String,
    }),
    success: Schema.Option(Order),
    error: DatabaseError,
})

export const ShopOrdersListRpc = Rpc.make("orders_list", {
    payload: Schema.Struct({
        sessionId: Schema.optional(Schema.String),
        email: Schema.optional(Schema.String),
    }),
    success: Schema.Array(Order),
    error: DatabaseError,
})

export const ShopOrdersGetRpc = Rpc.make("orders_get", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Schema.Option(Order),
    error: Schema.Union([DatabaseError, NotFoundError]),
})

const PublicShopRpcs = RpcGroup.make(
    ShopProductsListRpc,
    ShopProductsGetRpc,
    ShopCollectionsListRpc,
    ShopCartGetRpc,
    ShopCartAddRpc,
    ShopCartRemoveRpc,
    ShopCartUpdateRpc,
    ShopCheckoutCreateRpc,
    ShopCheckoutOrderGetRpc
).middleware(ActiveDomainRpcMiddleware)

const DomainManagerShopRpcs = RpcGroup.make(
    ShopProductsCreateRpc,
    ShopProductsUpdateRpc,
    ShopOrdersListRpc,
    ShopOrdersGetRpc
)
    .middleware(DomainManagerRpcMiddleware)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

export const ShopRpcs = PublicShopRpcs.merge(DomainManagerShopRpcs)
