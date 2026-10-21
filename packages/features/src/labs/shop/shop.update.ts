import { Match as M, Option } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"
import * as Cart from "./shop.cart.ts"
import { replaceSearchUrl } from "./shop.command.ts"
import { PRODUCTS } from "./shop.data.ts"
import { type Message } from "./shop.message.ts"
import type { Model } from "./shop.model.ts"
import { ShopProductsRoute, type ShopRoute } from "./shop.route.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const searchTextFromRoute = (route: ShopRoute): string =>
    M.value(route).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
            ShopProducts: ({ searchText }) =>
                Option.match(searchText, {
                    onNone: () => "",
                    onSome: (value) => value,
                }),
            ShopCart: () => "",
            ShopCheckout: () => "",
            ShopNotFound: () => "",
        })
    )

export const init = (route: ShopRoute): UpdateReturn => [
    {
        route,
        products: PRODUCTS,
        cart: [],
        deliveryInstructions: "",
        orderPlaced: false,
        searchText: searchTextFromRoute(route),
    },
    [],
]

export const update =
    (productsHref: (searchText: Option.Option<string>) => string) =>
    (model: Model, message: Message): UpdateReturn =>
        M.value(message).pipe(
            withUpdateReturn,
            M.tagsExhaustive({
                ChangedRoute: ({ route }) =>
                    M.value(route).pipe(
                        withUpdateReturn,
                        M.tagsExhaustive({
                            ShopProducts: () => [
                                evo(model, {
                                    route: () => route,
                                    searchText: () =>
                                        searchTextFromRoute(route),
                                }),
                                [],
                            ],
                            ShopCart: () => [
                                evo(model, {
                                    route: () => route,
                                }),
                                [],
                            ],
                            ShopCheckout: () => [
                                evo(model, {
                                    route: () => route,
                                }),
                                [],
                            ],
                            ShopNotFound: () => [
                                evo(model, {
                                    route: () => route,
                                }),
                                [],
                            ],
                        })
                    ),
                CompletedReplaceUrl: () => [model, []],
                ChangedSearchInput: ({ value }) => {
                    const searchText = Option.fromNullishOr(value || null)

                    return [
                        evo(model, {
                            route: () => ShopProductsRoute({ searchText }),
                            searchText: () => value,
                        }),
                        [replaceSearchUrl(productsHref(searchText))],
                    ]
                },
                ClickedAddToCart: ({ item }) => [
                    evo(model, {
                        cart: () => Cart.addItem(item)(model.cart),
                    }),
                    [],
                ],
                ClickedQuantityChange: ({ itemId, quantity }) => [
                    evo(model, {
                        cart: () =>
                            Cart.changeQuantity(itemId, quantity)(model.cart),
                    }),
                    [],
                ],
                ClickedRemoveCartItem: ({ itemId }) => [
                    evo(model, {
                        cart: () => Cart.removeItem(itemId)(model.cart),
                    }),
                    [],
                ],
                ClickedClearCart: () => [
                    evo(model, {
                        cart: () => [],
                    }),
                    [],
                ],
                UpdatedDeliveryInstructions: ({ value }) => [
                    evo(model, {
                        deliveryInstructions: () => value,
                    }),
                    [],
                ],
                ClickedPlaceOrder: () => [
                    evo(model, {
                        orderPlaced: () => true,
                        cart: () => [],
                        deliveryInstructions: () => "",
                    }),
                    [],
                ],
            })
        )
