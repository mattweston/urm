import { Option, pipe, Schema as S } from "effect"
import { Route } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { Url, type Url as UrlType } from "foldkit/url"

export const ShopProductsRoute = taggedStruct("ShopProducts", {
    searchText: S.Option(S.String),
})
export const ShopCartRoute = taggedStruct("ShopCart")
export const ShopCheckoutRoute = taggedStruct("ShopCheckout")
export const ShopNotFoundRoute = taggedStruct("ShopNotFound", {
    path: S.String,
})

export const ShopRoute = S.Union([
    ShopProductsRoute,
    ShopCartRoute,
    ShopCheckoutRoute,
    ShopNotFoundRoute,
])

export type ShopRoute = typeof ShopRoute.Type

const BASE = "/shop/shop"

const shopBaseRouter = pipe(
    Route.literal("labs"),
    Route.slash(Route.literal("shop")),
    Route.slash(Route.literal("shop"))
)

export const shopProductsRouter = pipe(
    shopBaseRouter,
    Route.query(S.Struct({ searchText: S.OptionFromOptional(S.String) })),
    Route.mapTo(ShopProductsRoute)
)

export const shopCartRouter = pipe(
    shopBaseRouter,
    Route.slash(Route.literal("cart")),
    Route.mapTo(ShopCartRoute)
)

export const shopCheckoutRouter = pipe(
    shopBaseRouter,
    Route.slash(Route.literal("checkout")),
    Route.mapTo(ShopCheckoutRoute)
)

const shopRouteParser = Route.oneOf(
    shopCheckoutRouter,
    shopCartRouter,
    shopProductsRouter
)

const parseShopRouteWithFallback = Route.parseUrlWithFallback(
    shopRouteParser,
    ShopNotFoundRoute
)

const normalizeShopPathname = (pathname: string) =>
    pathname.length > 1 && pathname.endsWith("/")
        ? pathname.slice(0, -1)
        : pathname

export const urlToShopRoute = (url: UrlType): ShopRoute =>
    parseShopRouteWithFallback(
        Url.make({ ...url, pathname: normalizeShopPathname(url.pathname) })
    )

export const shopProductsHref = (searchText: Option.Option<string>) =>
    Option.match(searchText, {
        onNone: () => `${BASE}/`,
        onSome: (value) => `${BASE}/?searchText=${encodeURIComponent(value)}`,
    })

export const shopHref = () => shopProductsHref(Option.none())

export const shopCartHref = () => `${BASE}/cart/`

export const shopCheckoutHref = () => `${BASE}/checkout/`

export const isShopPath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const isShopRoute = (route: { _tag: string }): route is ShopRoute =>
    route._tag === "ShopProducts" ||
    route._tag === "ShopCart" ||
    route._tag === "ShopCheckout" ||
    route._tag === "ShopNotFound"
