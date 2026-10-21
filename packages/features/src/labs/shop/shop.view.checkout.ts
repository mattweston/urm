import { Array, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import * as Cart from "./shop.cart.ts"
import {
    ChangedRoute,
    ClickedPlaceOrder,
    UpdatedDeliveryInstructions,
    type Message,
} from "./shop.message.ts"
import { ShopCartRoute, ShopProductsRoute } from "./shop.route.ts"
import type { Model } from "./shop.model.ts"

export const checkoutView = <ParentMessage>(
    model: Model,
    productsHref: string,
    cartHref: string,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const { keyed } = h

    if (model.orderPlaced) {
        return h.div(
            [h.Class("max-w-4xl mx-auto px-4 text-center")],
            [
                h.h1(
                    [
                        h.Class(
                            "mb-8 text-4xl font-bold tracking-tight text-foreground"
                        ),
                    ],
                    ["Order placed successfully!"]
                ),
                h.article(
                    [
                        h.Class(
                            "mb-6 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                        ),
                    ],
                    [
                        h.p(
                            [h.Class("mb-4 text-lg text-muted-foreground")],
                            ["Thank you for your order! We'll deliver it soon."]
                        ),
                        h.p(
                            [h.Class("text-muted-foreground")],
                            ["You will receive a confirmation email shortly."]
                        ),
                    ]
                ),
                h.a(
                    [
                        h.Href(productsHref),
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
                            "inline-block rounded-[var(--radius-control)] bg-primary px-6 py-2 font-medium text-primary-foreground hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                        ),
                    ],
                    ["Continue Shopping"]
                ),
            ]
        )
    }

    return h.div(
        [h.Class("max-w-4xl mx-auto px-4")],
        [
            h.h1(
                [
                    h.Class(
                        "mb-8 text-4xl font-bold tracking-tight text-foreground"
                    ),
                ],
                ["Checkout"]
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
                                                ["Start Shopping"]
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
                                        [],
                                        [
                                            h.h2(
                                                [
                                                    h.Class(
                                                        "mb-4 text-2xl font-bold text-foreground"
                                                    ),
                                                ],
                                                ["Order Summary"]
                                            ),
                                            h.div(
                                                [h.Class("space-y-2 mb-6")],
                                                Array.map(cart, (cartItem) =>
                                                    keyed("div")(
                                                        cartItem.item.id,
                                                        [
                                                            h.Class(
                                                                "flex justify-between items-center py-2 border-b"
                                                            ),
                                                        ],
                                                        [
                                                            h.div(
                                                                [],
                                                                [
                                                                    h.span(
                                                                        [
                                                                            h.Class(
                                                                                "font-medium text-foreground"
                                                                            ),
                                                                        ],
                                                                        [
                                                                            cartItem
                                                                                .item
                                                                                .name,
                                                                        ]
                                                                    ),
                                                                    h.span(
                                                                        [
                                                                            h.Class(
                                                                                "ml-2 text-muted-foreground"
                                                                            ),
                                                                        ],
                                                                        [
                                                                            `x ${cartItem.quantity}`,
                                                                        ]
                                                                    ),
                                                                ]
                                                            ),
                                                            h.span(
                                                                [
                                                                    h.Class(
                                                                        "font-medium text-foreground"
                                                                    ),
                                                                ],
                                                                [
                                                                    `$${(cartItem.item.price * cartItem.quantity).toFixed(2)}`,
                                                                ]
                                                            ),
                                                        ]
                                                    )
                                                )
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-6 flex items-center justify-between text-xl font-bold"
                                            ),
                                        ],
                                        [
                                            h.span([], ["Total"]),
                                            h.span(
                                                [],
                                                [
                                                    `$${Cart.totalPrice(cart).toFixed(2)}`,
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("mb-6")],
                                        [
                                            h.h3(
                                                [
                                                    h.Class(
                                                        "mb-2 text-lg font-semibold text-foreground"
                                                    ),
                                                ],
                                                ["Delivery Instructions"]
                                            ),
                                            h.textarea([
                                                h.Value(
                                                    model.deliveryInstructions
                                                ),
                                                h.Placeholder(
                                                    "Special delivery instructions (optional)..."
                                                ),
                                                h.AriaLabel(
                                                    "Delivery instructions"
                                                ),
                                                h.Class(
                                                    "h-24 w-full resize-none rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-4 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                                                ),
                                                h.OnInput((value) =>
                                                    toParentMessage(
                                                        UpdatedDeliveryInstructions(
                                                            { value }
                                                        )
                                                    )
                                                ),
                                            ]),
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("flex justify-center gap-4")],
                                        [
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
                                                        "rounded-[var(--radius-control)] bg-secondary px-6 py-2 font-medium text-secondary-foreground hover:bg-secondary/80 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                                    ),
                                                ],
                                                ["Back to Cart"]
                                            ),
                                            h.button(
                                                [
                                                    h.Class(
                                                        "rounded-[var(--radius-control)] bg-primary px-6 py-2 font-medium text-primary-foreground hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                                    ),
                                                    h.OnClick(
                                                        toParentMessage(
                                                            ClickedPlaceOrder()
                                                        )
                                                    ),
                                                ],
                                                ["Place Order"]
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
