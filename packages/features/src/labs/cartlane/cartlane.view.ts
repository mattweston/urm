import { Array, Match as M, Option } from "effect"
import { Submodel } from "foldkit"
import type { Attribute, Html, HtmlBuilder } from "foldkit/html"

import {
    cartCount,
    cartSubtotal,
    deliveryCost,
    formatMoney,
    orderTotal,
    productForId,
    products,
    type Product,
} from "./cartlane.domain.ts"
import {
    ChangedCheckoutAddress,
    ChangedCheckoutCardNumber,
    ChangedCheckoutCity,
    ChangedCheckoutEmail,
    ChangedCheckoutName,
    ChangedCheckoutPostalCode,
    ChangedRoute,
    ClickedAddProduct,
    ClickedDecreaseQuantity,
    ClickedIncreaseQuantity,
    ClickedRemoveProduct,
    ClickedSubmitDuplicate,
    DismissedNotice,
    SubmittedCheckout,
    ToggledCheckoutTerms,
    ToggledOnline,
    type Message,
} from "./cartlane.message.ts"
import type { Model } from "./cartlane.model.ts"
import { Route } from "./cartlane.route.ts"
import {
    cartHref,
    catalogHref,
    checkoutHref,
    orderHref,
    productHref,
} from "./cartlane.route.ts"

export type CartlaneHrefs = Readonly<{
    catalog: () => string
    product: (product_id: Product["id"]) => string
    cart: () => string
    checkout: () => string
    order: (order_id: string) => string
}>

const default_hrefs: CartlaneHrefs = {
    catalog: catalogHref,
    product: productHref,
    cart: cartHref,
    checkout: checkoutHref,
    order: orderHref,
}

const navigationControl = (
    href: string,
    attributes: ReadonlyArray<Attribute<Message>>,
    children: ReadonlyArray<Html | string>,
    h: HtmlBuilder<Message>
) =>
    href.startsWith("#cartlane-")
        ? h.button([h.Type("button"), ...attributes], children)
        : h.a([h.Href(href), ...attributes], children)

const buttonClass =
    "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted [box-shadow:var(--shadow-control)]"
const primaryButtonClass =
    "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
const cardClass =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 [box-shadow:var(--shadow-surface)]"

const productCard = (
    product: Product,
    hrefs: CartlaneHrefs,
    h: HtmlBuilder<Message>
): Html =>
    h.article(
        [h.Class(cardClass)],
        [
            navigationControl(
                hrefs.product(product.id),
                [
                    h.OnClick(
                        ChangedRoute({
                            route: Route.cases.Product.make({
                                product_id: product.id,
                            }),
                        })
                    ),
                    h.Class("block"),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "mb-5 flex aspect-[4/3] items-center justify-center rounded-[var(--radius-surface)] bg-muted text-7xl"
                            ),
                        ],
                        [product.glyph]
                    ),
                    Option.match(product.badge, {
                        onNone: () => h.span([], []),
                        onSome: (badge) =>
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-semibold uppercase tracking-wider text-primary"
                                    ),
                                ],
                                [badge]
                            ),
                    }),
                    h.h2([h.Class("mt-2 text-xl font-bold")], [product.name]),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        [product.tagline]
                    ),
                    h.p(
                        [h.Class("mt-4 font-semibold")],
                        [formatMoney(product.price_cents)]
                    ),
                ],
                h
            ),
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(ClickedAddProduct({ product_id: product.id })),
                    h.Class(`mt-4 w-full ${primaryButtonClass}`),
                ],
                ["Add to basket"]
            ),
        ]
    )

const catalogView = (
    model: Model,
    hrefs: CartlaneHrefs,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("space-y-8")],
        [
            h.header(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] bg-muted p-8 md:p-12"
                    ),
                ],
                [
                    h.p(
                        [
                            h.Class(
                                "text-sm font-semibold uppercase tracking-[0.2em]"
                            ),
                        ],
                        ["Objects for considered days"]
                    ),
                    h.h1(
                        [
                            h.Class(
                                "mt-3 max-w-3xl text-4xl font-bold md:text-6xl"
                            ),
                        ],
                        ["Useful things, made to stay."]
                    ),
                    h.p(
                        [h.Class("mt-4 max-w-2xl text-muted-foreground")],
                        [
                            "A complete checkout fixture with durable basket rules, validation, declines, tamper resistance and idempotent submission.",
                        ]
                    ),
                ]
            ),
            h.section(
                [h.Class("grid gap-5 md:grid-cols-2 xl:grid-cols-3")],
                Array.map(products, (product) => productCard(product, hrefs, h))
            ),
            model.cart.length > 0
                ? navigationControl(
                      hrefs.cart(),
                      [
                          h.OnClick(
                              ChangedRoute({ route: Route.cases.Cart.make({}) })
                          ),
                          h.Class(
                              `fixed bottom-6 right-6 shadow-lg ${primaryButtonClass}`
                          ),
                      ],
                      [
                          `Basket · ${cartCount(model.cart)} · ${formatMoney(orderTotal(model.cart))}`,
                      ],
                      h
                  )
                : h.span([], []),
        ]
    )

const productView = (
    product: Product,
    hrefs: CartlaneHrefs,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("grid gap-8 lg:grid-cols-2")],
        [
            h.div(
                [
                    h.Class(
                        "flex min-h-96 items-center justify-center rounded-[var(--radius-surface)] bg-muted text-9xl"
                    ),
                ],
                [product.glyph]
            ),
            h.section(
                [h.Class("flex flex-col justify-center")],
                [
                    navigationControl(
                        hrefs.catalog(),
                        [
                            h.OnClick(
                                ChangedRoute({
                                    route: Route.cases.Catalog.make({}),
                                })
                            ),
                            h.Class(
                                "text-sm text-muted-foreground hover:underline"
                            ),
                        ],
                        ["Back to collection"],
                        h
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-8 text-sm font-semibold uppercase tracking-wider text-primary"
                            ),
                        ],
                        [product.category]
                    ),
                    h.h1([h.Class("mt-2 text-4xl font-bold")], [product.name]),
                    h.p(
                        [h.Class("mt-3 text-xl text-muted-foreground")],
                        [product.tagline]
                    ),
                    h.p([h.Class("mt-6 leading-7")], [product.description]),
                    h.p(
                        [h.Class("mt-6 text-2xl font-bold")],
                        [formatMoney(product.price_cents)]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(
                                ClickedAddProduct({ product_id: product.id })
                            ),
                            h.Class(`mt-6 self-start ${primaryButtonClass}`),
                        ],
                        ["Add to basket"]
                    ),
                ]
            ),
        ]
    )

const cartView = (
    model: Model,
    hrefs: CartlaneHrefs,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("mx-auto max-w-4xl")],
        [
            h.h1([h.Class("text-4xl font-bold")], ["Your basket"]),
            Array.match(model.cart, {
                onEmpty: () =>
                    h.div(
                        [h.Class(`mt-8 text-center ${cardClass}`)],
                        [
                            h.p(
                                [h.Class("text-muted-foreground")],
                                ["Your basket is empty."]
                            ),
                            navigationControl(
                                hrefs.catalog(),
                                [
                                    h.OnClick(
                                        ChangedRoute({
                                            route: Route.cases.Catalog.make({}),
                                        })
                                    ),
                                    h.Class(`mt-4 ${primaryButtonClass}`),
                                ],
                                ["Browse the collection"],
                                h
                            ),
                        ]
                    ),
                onNonEmpty: (cart) =>
                    h.div(
                        [h.Class("mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]")],
                        [
                            h.ul(
                                [h.Class("space-y-3")],
                                cart.flatMap((line) =>
                                    Option.match(
                                        productForId(line.product_id),
                                        {
                                            onNone: () => [],
                                            onSome: (product) => [
                                                h.keyed("li")(
                                                    line.product_id,
                                                    [
                                                        h.Class(
                                                            `${cardClass} flex items-center gap-4`
                                                        ),
                                                    ],
                                                    [
                                                        h.div(
                                                            [
                                                                h.Class(
                                                                    "flex h-16 w-16 items-center justify-center rounded bg-muted text-3xl"
                                                                ),
                                                            ],
                                                            [product.glyph]
                                                        ),
                                                        h.div(
                                                            [
                                                                h.Class(
                                                                    "min-w-0 flex-1"
                                                                ),
                                                            ],
                                                            [
                                                                h.p(
                                                                    [
                                                                        h.Class(
                                                                            "font-semibold"
                                                                        ),
                                                                    ],
                                                                    [
                                                                        product.name,
                                                                    ]
                                                                ),
                                                                h.p(
                                                                    [
                                                                        h.Class(
                                                                            "text-sm text-muted-foreground"
                                                                        ),
                                                                    ],
                                                                    [
                                                                        formatMoney(
                                                                            product.price_cents
                                                                        ),
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
                                                                        h.Type(
                                                                            "button"
                                                                        ),
                                                                        h.OnClick(
                                                                            ClickedDecreaseQuantity(
                                                                                {
                                                                                    product_id:
                                                                                        line.product_id,
                                                                                }
                                                                            )
                                                                        ),
                                                                        h.AriaLabel(
                                                                            `Decrease ${product.name}`
                                                                        ),
                                                                        h.Class(
                                                                            buttonClass
                                                                        ),
                                                                    ],
                                                                    ["−"]
                                                                ),
                                                                h.span(
                                                                    [
                                                                        h.Class(
                                                                            "w-6 text-center"
                                                                        ),
                                                                    ],
                                                                    [
                                                                        String(
                                                                            line.quantity
                                                                        ),
                                                                    ]
                                                                ),
                                                                h.button(
                                                                    [
                                                                        h.Type(
                                                                            "button"
                                                                        ),
                                                                        h.OnClick(
                                                                            ClickedIncreaseQuantity(
                                                                                {
                                                                                    product_id:
                                                                                        line.product_id,
                                                                                }
                                                                            )
                                                                        ),
                                                                        h.AriaLabel(
                                                                            `Increase ${product.name}`
                                                                        ),
                                                                        h.Class(
                                                                            buttonClass
                                                                        ),
                                                                    ],
                                                                    ["+"]
                                                                ),
                                                                h.button(
                                                                    [
                                                                        h.Type(
                                                                            "button"
                                                                        ),
                                                                        h.OnClick(
                                                                            ClickedRemoveProduct(
                                                                                {
                                                                                    product_id:
                                                                                        line.product_id,
                                                                                }
                                                                            )
                                                                        ),
                                                                        h.Class(
                                                                            "ml-2 text-sm text-destructive hover:underline"
                                                                        ),
                                                                    ],
                                                                    ["Remove"]
                                                                ),
                                                            ]
                                                        ),
                                                    ]
                                                ),
                                            ],
                                        }
                                    )
                                )
                            ),
                            h.aside(
                                [h.Class(cardClass)],
                                [
                                    h.p(
                                        [h.Class("flex justify-between")],
                                        [
                                            "Subtotal",
                                            formatMoney(cartSubtotal(cart)),
                                        ]
                                    ),
                                    h.p(
                                        [h.Class("mt-2 flex justify-between")],
                                        [
                                            "Delivery",
                                            deliveryCost(cartSubtotal(cart)) ===
                                            0
                                                ? "Free"
                                                : formatMoney(
                                                      deliveryCost(
                                                          cartSubtotal(cart)
                                                      )
                                                  ),
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-4 flex justify-between border-t-(length:--surface-border-width) border-border pt-4 text-lg font-bold"
                                            ),
                                        ],
                                        ["Total", formatMoney(orderTotal(cart))]
                                    ),
                                    navigationControl(
                                        hrefs.checkout(),
                                        [
                                            h.OnClick(
                                                ChangedRoute({
                                                    route: Route.cases.Checkout.make(
                                                        {}
                                                    ),
                                                })
                                            ),
                                            h.Class(
                                                `mt-5 w-full ${primaryButtonClass}`
                                            ),
                                        ],
                                        ["Checkout"],
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
            }),
        ]
    )

const input = (
    label: string,
    value: string,
    message: (value: string) => Message,
    h: HtmlBuilder<Message>
): Html =>
    h.label(
        [h.Class("grid gap-1 text-sm font-medium")],
        [
            label,
            h.input([
                h.Value(value),
                h.OnInput((nextValue) => message(nextValue)),
                h.Class(
                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2"
                ),
            ]),
        ]
    )

const checkoutFeedback = (model: Model, h: HtmlBuilder<Message>): Html =>
    Option.match(model.checkout_result, {
        onNone: () =>
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "Your payment details are encrypted before they leave this page.",
                ]
            ),
        onSome: (result) =>
            M.value(result).pipe(
                M.tagsExhaustive({
                    Invalid: ({ message, errors }) =>
                        h.div(
                            [
                                h.Class(
                                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive p-3 text-sm bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                                ),
                            ],
                            [
                                h.p([h.Class("font-semibold")], [message]),
                                ...Object.values(errors).flatMap((maybeError) =>
                                    Option.match(maybeError, {
                                        onNone: () => [],
                                        onSome: (error) => [h.p([], [error])],
                                    })
                                ),
                            ]
                        ),
                    Failed: ({ message }) =>
                        h.p(
                            [
                                h.Class(
                                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive p-3 text-sm"
                                ),
                            ],
                            [message]
                        ),
                    Succeeded: ({ message }) =>
                        h.p(
                            [
                                h.Class(
                                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-primary p-3 text-sm"
                                ),
                            ],
                            [message]
                        ),
                })
            ),
    })

const checkoutView = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_20rem]")],
        [
            h.section(
                [h.Class(cardClass)],
                [
                    h.h1([h.Class("text-3xl font-bold")], ["Checkout"]),
                    h.div(
                        [h.Class("mt-6 grid gap-4 sm:grid-cols-2")],
                        [
                            input(
                                "Name",
                                model.checkout_form.name,
                                (value) => ChangedCheckoutName({ value }),
                                h
                            ),
                            input(
                                "Email",
                                model.checkout_form.email,
                                (value) => ChangedCheckoutEmail({ value }),
                                h
                            ),
                            input(
                                "Address",
                                model.checkout_form.address,
                                (value) => ChangedCheckoutAddress({ value }),
                                h
                            ),
                            input(
                                "Town or city",
                                model.checkout_form.city,
                                (value) => ChangedCheckoutCity({ value }),
                                h
                            ),
                            input(
                                "Postal code",
                                model.checkout_form.postal_code,
                                (value) => ChangedCheckoutPostalCode({ value }),
                                h
                            ),
                            input(
                                "Card number",
                                model.checkout_form.card_number,
                                (value) => ChangedCheckoutCardNumber({ value }),
                                h
                            ),
                        ]
                    ),
                    h.label(
                        [h.Class("mt-4 flex items-start gap-2 text-sm")],
                        [
                            h.input([
                                h.Type("checkbox"),
                                h.Checked(model.checkout_form.agree_to_terms),
                                h.OnClick(ToggledCheckoutTerms()),
                            ]),
                            "I accept the store terms.",
                        ]
                    ),
                    h.div([h.Class("mt-5")], [checkoutFeedback(model, h)]),
                ]
            ),
            h.aside(
                [h.Class(cardClass)],
                [
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            model.is_online
                                ? "Ready to submit"
                                : "Offline — checkout paused",
                        ]
                    ),
                    h.p(
                        [h.Class("mt-3 text-2xl font-bold")],
                        [formatMoney(orderTotal(model.cart))]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(SubmittedCheckout()),
                            h.Disabled(model.submission_state === "Submitting"),
                            h.Class(`mt-5 w-full ${primaryButtonClass}`),
                        ],
                        [
                            model.submission_state === "Submitting"
                                ? "Placing order…"
                                : "Place order",
                        ]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(ToggledOnline()),
                            h.Class(`mt-2 w-full ${buttonClass}`),
                        ],
                        [model.is_online ? "Simulate offline" : "Reconnect"]
                    ),
                ]
            ),
        ]
    )

const orderView = (
    model: Model,
    order_id: string,
    hrefs: CartlaneHrefs,
    h: HtmlBuilder<Message>
): Html =>
    Option.match(model.last_order, {
        onNone: () =>
            h.div(
                [h.Class(cardClass)],
                [
                    h.h1([h.Class("text-3xl font-bold")], ["Order not found"]),
                    navigationControl(
                        hrefs.catalog(),
                        [
                            h.OnClick(
                                ChangedRoute({
                                    route: Route.cases.Catalog.make({}),
                                })
                            ),
                            h.Class(`mt-4 ${buttonClass}`),
                        ],
                        ["Return to catalog"],
                        h
                    ),
                ]
            ),
        onSome: (order) =>
            order.id !== order_id
                ? h.p([], ["Order not found."])
                : h.div(
                      [h.Class("mx-auto max-w-2xl text-center")],
                      [
                          h.p(
                              [
                                  h.Class(
                                      "text-sm font-semibold uppercase tracking-wider text-primary"
                                  ),
                              ],
                              ["Order confirmed"]
                          ),
                          h.h1(
                              [h.Class("mt-3 text-4xl font-bold")],
                              ["Thank you for your order."]
                          ),
                          h.div(
                              [h.Class(`mt-8 text-left ${cardClass}`)],
                              [
                                  h.p(
                                      [h.Class("flex justify-between")],
                                      ["Order", order.id]
                                  ),
                                  h.p(
                                      [h.Class("mt-2 flex justify-between")],
                                      ["Placed", order.placed_at]
                                  ),
                                  h.p(
                                      [h.Class("mt-2 flex justify-between")],
                                      ["Delivery", order.delivery_label]
                                  ),
                                  h.p(
                                      [
                                          h.Class(
                                              "mt-2 flex justify-between font-bold"
                                          ),
                                      ],
                                      ["Total", formatMoney(order.total_cents)]
                                  ),
                              ]
                          ),
                          h.button(
                              [
                                  h.Type("button"),
                                  h.OnClick(ClickedSubmitDuplicate()),
                                  h.Class(`mt-5 ${buttonClass}`),
                              ],
                              ["Replay duplicate submission"]
                          ),
                          navigationControl(
                              hrefs.catalog(),
                              [
                                  h.OnClick(
                                      ChangedRoute({
                                          route: Route.cases.Catalog.make({}),
                                      })
                                  ),
                                  h.Class(`ml-2 mt-5 ${primaryButtonClass}`),
                              ],
                              ["Continue shopping"],
                              h
                          ),
                      ]
                  ),
    })

const cartlaneView = (
    model: Model,
    hrefs: CartlaneHrefs,
    h: HtmlBuilder<Message>
): Html =>
    h.main(
        [h.Class("min-h-screen bg-background p-5 text-foreground md:p-8")],
        [
            h.header(
                [
                    h.Class(
                        "mx-auto mb-8 flex max-w-7xl items-center justify-between"
                    ),
                ],
                [
                    navigationControl(
                        hrefs.catalog(),
                        [
                            h.OnClick(
                                ChangedRoute({
                                    route: Route.cases.Catalog.make({}),
                                })
                            ),
                            h.Class("text-xl font-bold tracking-tight"),
                        ],
                        ["Cartlane"],
                        h
                    ),
                    navigationControl(
                        hrefs.cart(),
                        [
                            h.OnClick(
                                ChangedRoute({
                                    route: Route.cases.Cart.make({}),
                                })
                            ),
                            h.Class(buttonClass),
                        ],
                        [`Basket ${cartCount(model.cart)}`],
                        h
                    ),
                ]
            ),
            Option.match(model.notice, {
                onNone: () => h.span([], []),
                onSome: (notice) =>
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(DismissedNotice()),
                            h.Class(
                                "fixed right-5 top-5 z-20 rounded-md bg-foreground px-4 py-3 text-sm text-background [box-shadow:var(--shadow-overlay)]"
                            ),
                        ],
                        [notice]
                    ),
            }),
            model.storage_state === "Loading"
                ? h.div(
                      [
                          h.Class(
                              "mx-auto max-w-7xl animate-pulse rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-8"
                          ),
                      ],
                      ["Restoring your basket…"]
                  )
                : h.keyed("div")(
                      model.route._tag,
                      [h.Class("mx-auto max-w-7xl")],
                      [
                          M.value(model.route).pipe(
                              M.tagsExhaustive({
                                  Catalog: () => catalogView(model, hrefs, h),
                                  Product: ({ product_id }) =>
                                      Option.match(productForId(product_id), {
                                          onNone: () =>
                                              h.p([], ["Product not found."]),
                                          onSome: (product) =>
                                              productView(product, hrefs, h),
                                      }),
                                  Cart: () => cartView(model, hrefs, h),
                                  Checkout: () => checkoutView(model, h),
                                  Order: ({ order_id }) =>
                                      orderView(model, order_id, hrefs, h),
                              })
                          ),
                      ]
                  ),
        ]
    )

export const view = Submodel.defineView<
    Model,
    Message,
    {
        readonly catalogHref?: CartlaneHrefs["catalog"]
        readonly productHref?: CartlaneHrefs["product"]
        readonly cartHref?: CartlaneHrefs["cart"]
        readonly checkoutHref?: CartlaneHrefs["checkout"]
        readonly orderHref?: CartlaneHrefs["order"]
    }
>((model, inputs, h) =>
    cartlaneView(
        model,
        {
            catalog: inputs.catalogHref ?? default_hrefs.catalog,
            product: inputs.productHref ?? default_hrefs.product,
            cart: inputs.cartHref ?? default_hrefs.cart,
            checkout: inputs.checkoutHref ?? default_hrefs.checkout,
            order: inputs.orderHref ?? default_hrefs.order,
        },
        h
    )
)
