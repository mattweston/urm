import { Match as M, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import { ChangedRoute, type Message } from "./shop.message.ts"
import type { Model } from "./shop.model.ts"
import {
    ShopCartRoute,
    ShopCheckoutRoute,
    ShopProductsRoute,
} from "./shop.route.ts"
import { cartView } from "./shop.view.cart.ts"
import { checkoutView } from "./shop.view.checkout.ts"
import { productsView } from "./shop.view.products.ts"

export type ShopHrefs = Readonly<{
    products: (searchText: Option.Option<string>) => string
    cart: () => string
    checkout: () => string
}>

const navigationLinkClassName = (isActive: boolean) =>
    isActive
        ? "rounded-[var(--radius-control)] bg-accent px-4 py-2 font-medium text-accent-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
        : "rounded-[var(--radius-control)] px-4 py-2 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

export const view = <ParentMessage>(
    model: Model,
    hrefs: ShopHrefs,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const { keyed } = h

    const productsHref = hrefs.products(
        Option.fromNullishOr(model.searchText || null)
    )
    const cartHref = hrefs.cart()
    const checkoutHref = hrefs.checkout()

    const routeContent = M.value(model.route).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            ShopProducts: () =>
                productsView(model, cartHref, toParentMessage, h),
            ShopCart: () =>
                cartView(model, productsHref, checkoutHref, toParentMessage, h),
            ShopCheckout: () =>
                checkoutView(model, productsHref, cartHref, toParentMessage, h),
            ShopNotFound: ({ path }) =>
                h.div(
                    [h.Class("max-w-4xl mx-auto px-4 text-center")],
                    [
                        h.h1(
                            [
                                h.Class(
                                    "mb-6 text-4xl font-bold text-foreground"
                                ),
                            ],
                            ["Shop page not found"]
                        ),
                        h.p(
                            [h.Class("mb-4 text-lg text-muted-foreground")],
                            [`The path "${path}" was not found.`]
                        ),
                        h.a(
                            [
                                h.Href(hrefs.products(Option.none())),
                                h.OnClick(
                                    toParentMessage(
                                        ChangedRoute({
                                            route: ShopProductsRoute({
                                                searchText: Option.none(),
                                            }),
                                        })
                                    )
                                ),
                                h.Class("font-medium text-primary underline"),
                            ],
                            ["Go to Products"]
                        ),
                    ]
                ),
        })
    )

    return h.div(
        [h.Class("min-h-screen bg-background py-8 text-foreground")],
        [
            h.div(
                [h.Class("mx-auto mb-6 max-w-4xl px-4")],
                [
                    h.nav(
                        [
                            h.Class(
                                "flex justify-center gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-3 text-card-foreground [box-shadow:var(--shadow-surface)]"
                            ),
                        ],
                        [
                            h.a(
                                [
                                    h.Href(hrefs.products(Option.none())),
                                    h.OnClick(
                                        toParentMessage(
                                            ChangedRoute({
                                                route: ShopProductsRoute({
                                                    searchText: Option.none(),
                                                }),
                                            })
                                        )
                                    ),
                                    h.Class(
                                        navigationLinkClassName(
                                            model.route._tag === "ShopProducts"
                                        )
                                    ),
                                ],
                                ["Products"]
                            ),
                            h.a(
                                [
                                    h.Href(cartHref),
                                    h.OnClick(
                                        toParentMessage(
                                            ChangedRoute({
                                                route: ShopCartRoute(),
                                            })
                                        )
                                    ),
                                    h.Class(
                                        navigationLinkClassName(
                                            model.route._tag === "ShopCart"
                                        )
                                    ),
                                ],
                                ["Cart"]
                            ),
                            h.a(
                                [
                                    h.Href(checkoutHref),
                                    h.OnClick(
                                        toParentMessage(
                                            ChangedRoute({
                                                route: ShopCheckoutRoute(),
                                            })
                                        )
                                    ),
                                    h.Class(
                                        navigationLinkClassName(
                                            model.route._tag === "ShopCheckout"
                                        )
                                    ),
                                ],
                                ["Checkout"]
                            ),
                        ]
                    ),
                ]
            ),
            keyed("div")(model.route._tag, [], [routeContent]),
        ]
    )
}
