import { describe, expect, it } from "vitest"
import { Option } from "effect"
import { Url } from "foldkit/url"
import {
    cartHref,
    checkoutHref,
    collectionHref,
    collectionsHref,
    isAppScope,
    orderHref,
    ordersHref,
    productCreateHref,
    productEditHref,
    productHref,
    productsHref,
    routeForUrl,
    shopHref,
} from "../src/shop/admin.route.ts"

const routeForPath = (pathname: string) =>
    routeForUrl(
        Url.make({
            protocol: "https:",
            host: "admin.example.test",
            pathname,
            search: Option.none(),
            port: Option.none(),
            hash: Option.none(),
        })
    )

describe("shop product editor routes", () => {
    it("provides the shop overview route", () => {
        expect(shopHref()).toBe("/shop/")
        expect(routeForPath(shopHref())._tag).toBe("ShopHome")
        expect(isAppScope(shopHref())).toBe(true)
    })

    it("mirrors the storefront product hierarchy", () => {
        expect(productsHref()).toBe("/shop/products/")
        expect(productCreateHref()).toBe("/shop/products/new/")
        expect(productEditHref("product one")).toBe(
            "/shop/products/product%20one/edit/"
        )
        expect(routeForPath(productsHref())._tag).toBe("ShopProducts")
        expect(productHref("canvas bag")).toBe("/shop/products/canvas%20bag/")
        expect(routeForPath(productHref("canvas bag"))).toEqual({
            _tag: "ShopProduct",
            slug: "canvas bag",
        })
    })

    it("claims product editor routes without an admin prefix", () => {
        expect(isAppScope("/shop/products/")).toBe(true)
        expect(isAppScope("/shop/products/new/")).toBe(true)
        expect(isAppScope("/shop/collections/")).toBe(true)
    })

    it("routes every builder storefront layout", () => {
        expect(collectionsHref()).toBe("/shop/collections/")
        expect(collectionHref("summer sale")).toBe(
            "/shop/collections/summer%20sale/"
        )
        expect(routeForPath(collectionsHref())._tag).toBe("ShopCollections")
        expect(routeForPath(collectionHref("summer sale"))).toEqual({
            _tag: "ShopCollection",
            slug: "summer sale",
        })
        expect(routeForPath(cartHref())._tag).toBe("ShopCart")
        expect(routeForPath(checkoutHref())._tag).toBe("ShopCheckout")
        expect(routeForPath(ordersHref())._tag).toBe("ShopOrders")
        expect(routeForPath(orderHref("order one"))).toEqual({
            _tag: "ShopOrder",
            orderId: "order one",
        })
    })
})
