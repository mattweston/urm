import { Schema as S } from "effect"

import { ProductId } from "./cartlane.domain.ts"

export const Route = S.TaggedUnion({
    Catalog: {},
    Product: { product_id: ProductId },
    Cart: {},
    Checkout: {},
    Order: { order_id: S.String },
})
export type Route = typeof Route.Type

const BASE = "/cartlane"

export const catalogHref = () => `${BASE}/`
export const productHref = (product_id: ProductId) =>
    `${BASE}/products/${product_id}/`
export const cartHref = () => `${BASE}/cart/`
export const checkoutHref = () => `${BASE}/checkout/`
export const orderHref = (order_id: string) => `${BASE}/orders/${order_id}/`

export const routeForPath = (pathname: string): Route => {
    const product = /^\/labs\/cartlane\/products\/([^/]+)\/?$/.exec(
        pathname
    )?.[1]
    const maybeProductId = S.decodeUnknownOption(ProductId)(product)
    if (maybeProductId._tag === "Some") {
        return Route.cases.Product.make({ product_id: maybeProductId.value })
    }
    const order_id = /^\/labs\/cartlane\/orders\/([^/]+)\/?$/.exec(
        pathname
    )?.[1]
    if (order_id !== undefined) {
        return Route.cases.Order.make({ order_id })
    }
    if (pathname.startsWith(`${BASE}/checkout`)) {
        return Route.cases.Checkout.make({})
    }
    if (pathname.startsWith(`${BASE}/cart`)) {
        return Route.cases.Cart.make({})
    }
    return Route.cases.Catalog.make({})
}
