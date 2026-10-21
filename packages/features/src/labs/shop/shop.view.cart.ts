import { Array, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import * as Cart from "./shop.cart.ts"
import {
    ChangedRoute,
    ClickedClearCart,
    ClickedQuantityChange,
    ClickedRemoveCartItem,
    type Message,
} from "./shop.message.ts"
import {
    ShopCheckoutRoute,
    ShopProductsRoute,
} from "./shop.route.ts"
import type { Model } from "./shop.model.ts"

const quantityButtonClassName =
    "flex h-8 w-8 items-center justify-center rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"

export const cartView = <ParentMessage>(
    model: Model,
    productsHref: string,
    checkoutHref: string,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const { keyed } = h

    return h.div(
        [h.Class("max-w-4xl mx-auto px-4")],
        [
            h.h1(
                [
                    h.Class(
                        "mb-8 text-4xl font-bold tracking-tight text-foreground"
                    ),
                ],
                ["Shopping Cart"]
            ),
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    Array.match(model.cart, {
                        onEmpty: () =>
                            h.div(
                                [],
                                [
                                    h.p(
                                        [
                                            h.Class(
                                                "py-8 text-center text-muted-foreground"
                                            ),
                                        ],
                                        ["Your cart is empty"]
                                    ),
                                    h.div(
                                        [h.Class("text-center mt-4")],
                                        [
                                            h.a(
                                                [
                                                    h.Href(productsHref),
                                                    h.OnClick(
                                                        toParentMessage(
                                                            ChangedRoute({
                                                                route: ShopProductsRoute(
                                                                    {
                                                                        searchText:
                                                                            Option.none(),
                                                                    }
                                                                ),
                                                            })
                                                        )
                                                    ),
                                                    h.Class(
                                                        "inline-block rounded-[var(--radius-control)] bg-primary px-6 py-2 font-medium text-primary-foreground hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                                    ),
                                                ],
                                                ["Continue Shopping"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        onNonEmpty: (cart) =>
                            h.div(
                                [],
                                [
                                    h.section(
                                        [h.Class("space-y-4 mb-6")],
                                        Array.map(cart, (cartItem) =>
                                            keyed("article")(
                                                cartItem.item.id,
                                                [
                                                    h.Class(
                                                        "flex items-center justify-between p-4 border-(length:--surface-border-width) rounded-[var(--radius-surface)] bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                                                    ),
                                                ],
                                                [
                                                    h.div(
                                                        [],
                                                        [
                                                            h.h3(
                                                                [
                                                                    h.Class(
                                                                        "font-semibold text-foreground"
                                                                    ),
                                                                ],
                                                                [
                                                                    cartItem
                                                                        .item
                                                                        .name,
                                                                ]
                                                            ),
                                                            h.p(
                                                                [
                                                                    h.Class(
                                                                        "text-muted-foreground"
                                                                    ),
                                                                ],
                                                                [
                                                                    `$${cartItem.item.price.toFixed(2)} each`,
                                                                ]
                                                            ),
                                                        ]
                                                    ),
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "flex items-center gap-2"
                                                            ),
                                                        ],
                                                        [
                                                            h.button(
                                                                [
                                                                    h.Class(
                                                                        quantityButtonClassName
                                                                    ),
                                                                    h.OnClick(
                                                                        toParentMessage(
                                                                            ClickedQuantityChange(
                                                                                {
                                                                                    itemId: cartItem
                                                                                        .item
                                                                                        .id,
                                                                                    quantity:
                                                                                        cartItem.quantity -
                                                                                        1,
                                                                                }
                                                                            )
                                                                        )
                                                                    ),
                                                                ],
                                                                ["-"]
                                                            ),
                                                            h.span(
                                                                [
                                                                    h.Class(
                                                                        "px-3 py-1 font-medium"
                                                                    ),
                                                                ],
                                                                [
                                                                    cartItem.quantity.toString(),
                                                                ]
                                                            ),
                                                            h.button(
                                                                [
                                                                    h.Class(
                                                                        quantityButtonClassName
                                                                    ),
                                                                    h.OnClick(
                                                                        toParentMessage(
                                                                            ClickedQuantityChange(
                                                                                {
                                                                                    itemId: cartItem
                                                                                        .item
                                                                                        .id,
                                                                                    quantity:
                                                                                        cartItem.quantity +
                                                                                        1,
                                                                                }
                                                                            )
                                                                        )
                                                                    ),
                                                                ],
                                                                ["+"]
                                                            ),
                                                            h.button(
                                                                [
                                                                    h.Class(
                                                                        "ml-2 rounded bg-destructive px-3 py-1 text-destructive-foreground hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                                                    ),
                                                                    h.OnClick(
                                                                        toParentMessage(
                                                                            ClickedRemoveCartItem(
                                                                                {
                                                                                    itemId: cartItem
                                                                                        .item
                                                                                        .id,
                                                                                }
                                                                            )
                                                                        )
                                                                    ),
                                                                ],
                                                                ["Remove"]
                                                            ),
                                                        ]
                                                    ),
                                                ]
                                            )
                                        )
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-6 border-t-(length:--surface-border-width) border-border pt-4"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex items-center justify-between"
                                                    ),
                                                ],
                                                [
                                                    h.h3(
                                                        [
                                                            h.Class(
                                                                "text-xl font-bold text-foreground"
                                                            ),
                                                        ],
                                                        ["Total"]
                                                    ),
                                                    h.p(
                                                        [
                                                            h.Class(
                                                                "text-xl font-bold text-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            `$${Cart.totalPrice(cart).toFixed(2)}`,
                                                        ]
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("flex justify-center gap-4")],
                                        [
                                            h.a(
                                                [
                                                    h.Href(productsHref),
                                                    h.OnClick(
                                                        toParentMessage(
                                                            ChangedRoute({
                                                                route: ShopProductsRoute(
                                                                    {
                                                                        searchText:
                                                                            Option.none(),
                                                                    }
                                                                ),
                                                            })
                                                        )
                                                    ),
                                                    h.Class(
                                                        "rounded-[var(--radius-control)] bg-secondary px-6 py-2 font-medium text-secondary-foreground hover:bg-secondary/80 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                                    ),
                                                ],
                                                ["Continue Shopping"]
                                            ),
                                            h.button(
                                                [
                                                    h.Class(
                                                        "rounded-[var(--radius-control)] bg-destructive px-6 py-2 font-medium text-destructive-foreground hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                                    ),
                                                    h.OnClick(
                                                        toParentMessage(
                                                            ClickedClearCart()
                                                        )
                                                    ),
                                                ],
                                                ["Clear Cart"]
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
                                                        "rounded-[var(--radius-control)] bg-primary px-6 py-2 font-medium text-primary-foreground hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                                    ),
                                                ],
                                                ["Proceed to Checkout"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                    }),
                ]
            ),
        ]
    )
}
