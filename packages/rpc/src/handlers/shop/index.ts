/**
 * # Shop RPC
 */

export {
    ShopRpcLive,
    ShopRpcHandlersTagLive,
    findPublicProductImageUrl,
} from "./handlers.ts"

export { ShopRpcHandlersTag } from "./tag.ts"

export type { ShopRpcHandlers } from "./handlers.ts"
export {
    ShopCatalogRepository,
    ShopCatalogRepositoryLive,
} from "./catalog-repository.ts"
export type { ShopCatalogPrincipal } from "./catalog-repository.ts"
export {
    ShopCatalogServer,
    shop_catalog_remote_handlers,
} from "./catalog-remote.ts"
export {
    ShopCartRepository,
    ShopCartRepositoryLive,
} from "./cart-repository.ts"
export {
    ShopOrderRepository,
    ShopOrderRepositoryLive,
} from "./order-repository.ts"
export { ShopCartServer, shop_cart_remote_handlers } from "./cart-remote.ts"
export { ShopOrderServer, shop_order_remote_handlers } from "./order-remote.ts"
export {
    ShopPaymentRepository,
    ShopPaymentRepositoryLive,
} from "./payment-repository.ts"
