import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import type { Url } from "foldkit/url"

export const ShopHomeRoute = taggedStruct("ShopHome")
export const ShopProductsRoute = taggedStruct("ShopProducts")
export const ShopProductRoute = taggedStruct("ShopProduct", { slug: S.String })
export const ShopProductCreateRoute = taggedStruct("ShopProductCreate")
export const ShopProductEditRoute = taggedStruct("ShopProductEdit", {
    productId: S.String,
})
export const ShopProductsNotFoundRoute = taggedStruct("ShopProductsNotFound", {
    path: S.String,
})
export const ShopCollectionsRoute = taggedStruct("ShopCollections")
export const ShopCollectionRoute = taggedStruct("ShopCollection", {
    slug: S.String,
})
export const ShopCartRoute = taggedStruct("ShopCart")
export const ShopCheckoutRoute = taggedStruct("ShopCheckout")
export const ShopOrdersRoute = taggedStruct("ShopOrders")
export const ShopOrderRoute = taggedStruct("ShopOrder", { orderId: S.String })

export const Route = S.Union([
    ShopHomeRoute,
    ShopProductsRoute,
    ShopProductRoute,
    ShopProductCreateRoute,
    ShopProductEditRoute,
    ShopProductsNotFoundRoute,
    ShopCollectionsRoute,
    ShopCollectionRoute,
    ShopCartRoute,
    ShopCheckoutRoute,
    ShopOrdersRoute,
    ShopOrderRoute,
])
export type Route = typeof Route.Type

const base = "/shop/products"
const collectionsBase = "/shop/collections"
const ordersBase = "/shop/orders"
const shopBase = "/shop"

export const shopHref = () => `${shopBase}/`
export const productsHref = () => `${base}/`
export const productCreateHref = () => `${base}/new/`
export const productHref = (slug: string) =>
    `${base}/${encodeURIComponent(slug)}/`
export const productEditHref = (productId: string) =>
    `${base}/${encodeURIComponent(productId)}/edit/`
export const collectionsHref = () => `${collectionsBase}/`
export const collectionHref = (slug: string) =>
    `${collectionsBase}/${encodeURIComponent(slug)}/`
export const cartHref = () => `${shopBase}/cart/`
export const checkoutHref = () => `${shopBase}/checkout/`
export const ordersHref = () => `${ordersBase}/`
export const orderHref = (orderId: string) =>
    `${ordersBase}/${encodeURIComponent(orderId)}/`
export const receiptLayoutHref = () => orderHref("receipt-layout")

export const isAppScope = (pathname: string) =>
    pathname === shopBase || pathname.startsWith(`${shopBase}/`)

export const routeForUrl = (url: Url): Route => {
    const pathname = url.pathname.endsWith("/")
        ? url.pathname.slice(0, -1)
        : url.pathname

    if (pathname === shopBase) {
        return ShopHomeRoute()
    }

    if (pathname === base) {
        return ShopProductsRoute()
    }

    if (pathname === `${base}/new`) {
        return ShopProductCreateRoute()
    }

    if (pathname === collectionsBase) {
        return ShopCollectionsRoute()
    }

    if (pathname === `${shopBase}/cart`) {
        return ShopCartRoute()
    }

    if (pathname === `${shopBase}/checkout`) {
        return ShopCheckoutRoute()
    }

    if (pathname === ordersBase) {
        return ShopOrdersRoute()
    }

    const segments = pathname.slice(`${base}/`.length).split("/")
    const productId = segments[0] ?? ""

    if (
        productId.length > 0 &&
        segments[1] === "edit" &&
        segments.length === 2
    ) {
        return ShopProductEditRoute({
            productId: decodeURIComponent(productId),
        })
    }

    if (pathname.startsWith(`${base}/`) && productId.length > 0) {
        return ShopProductRoute({ slug: decodeURIComponent(productId) })
    }

    if (pathname.startsWith(`${collectionsBase}/`)) {
        const slug = pathname.slice(`${collectionsBase}/`.length)

        if (slug.length > 0 && !slug.includes("/")) {
            return ShopCollectionRoute({ slug: decodeURIComponent(slug) })
        }
    }

    if (pathname.startsWith(`${ordersBase}/`)) {
        const orderId = pathname.slice(`${ordersBase}/`.length)

        if (orderId.length > 0 && !orderId.includes("/")) {
            return ShopOrderRoute({ orderId: decodeURIComponent(orderId) })
        }
    }

    return ShopProductsNotFoundRoute({ path: url.pathname })
}
