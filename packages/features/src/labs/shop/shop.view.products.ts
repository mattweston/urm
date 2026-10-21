import { Array, String as String_ } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import * as Cart from "./shop.cart.ts"
import {
    ChangedSearchInput,
    ClickedAddToCart,
    ClickedQuantityChange,
    ChangedRoute,
    type Message,
} from "./shop.message.ts"
import type { Model } from "./shop.model.ts"
import { ShopCartRoute } from "./shop.route.ts"

const quantityButtonClassName =
    "flex h-8 w-8 items-center justify-center rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"

export const productsView = <ParentMessage>(
    model: Model,
    cartHref: string,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const { keyed } = h

    const filteredProducts = String_.isNonEmpty(model.searchText)
        ? Array.filter(model.products, ({ name }) =>
              name.toLowerCase().includes(model.searchText.toLowerCase())
          )
        : model.products

    return h.div(
        [h.Class("max-w-4xl mx-auto px-4")],
        [
            h.h1(
                [
                    h.Class(
                        "mb-8 text-4xl font-bold tracking-tight text-foreground"
                    ),
                ],
                ["Products"]
            ),
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.search(
                        [h.Class("mb-6")],
                        [
                            h.input([
                                h.Value(model.searchText),
                                h.Placeholder("Search products..."),
                                h.AriaLabel("Search products"),
                                h.Class(
                                    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-4 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                                ),
                                h.OnInput((value) =>
                                    toParentMessage(
                                        ChangedSearchInput({ value })
                                    )
                                ),
                            ]),
                        ]
                    ),
                    Array.match(filteredProducts, {
                        onEmpty: () =>
                            h.div(
                                [
                                    h.Class(
                                        "py-8 text-center text-muted-foreground"
                                    ),
                                ],
                                ["No products match your search."]
                            ),
                        onNonEmpty: (products) =>
                            h.section(
                                [h.Class("grid gap-4")],
                                Array.map(products, (product) => {
                                    const quantity = Cart.itemQuantity(
                                        product.id
                                    )(model.cart)

                                    return keyed("article")(
                                        product.id,
                                        [
                                            h.Class(
                                                "flex items-center justify-between rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-4 transition-colors hover:bg-accent"
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
                                                        [product.name]
                                                    ),
                                                    h.p(
                                                        [
                                                            h.Class(
                                                                "text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            `$${product.price.toFixed(2)}`,
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            quantity === 0
                                                ? h.button(
                                                      [
                                                          h.Class(
                                                              "rounded-[var(--radius-control)] bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                                          ),
                                                          h.OnClick(
                                                              toParentMessage(
                                                                  ClickedAddToCart(
                                                                      {
                                                                          item: product,
                                                                      }
                                                                  )
                                                              )
                                                          ),
                                                      ],
                                                      ["Add to Cart"]
                                                  )
                                                : h.div(
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
                                                                                  itemId: product.id,
                                                                                  quantity:
                                                                                      quantity -
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
                                                                      "min-w-[2rem] px-3 py-1 text-center font-mono font-medium"
                                                                  ),
                                                              ],
                                                              [
                                                                  quantity.toString(),
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
                                                                                  itemId: product.id,
                                                                                  quantity:
                                                                                      quantity +
                                                                                      1,
                                                                              }
                                                                          )
                                                                      )
                                                                  ),
                                                              ],
                                                              ["+"]
                                                          ),
                                                      ]
                                                  ),
                                        ]
                                    )
                                })
                            ),
                    }),
                    Array.match(model.cart, {
                        onEmpty: () => h.empty,
                        onNonEmpty: (cart) =>
                            h.div(
                                [h.Class("mt-6 text-center")],
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
                                                "inline-block rounded-[var(--radius-control)] bg-accent px-6 py-2 font-medium text-accent-foreground hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                            ),
                                        ],
                                        [
                                            `Go to Cart (${Cart.totalItems(cart)})`,
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
