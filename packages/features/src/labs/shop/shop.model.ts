import { Schema as S } from "effect"
import { Cart } from "./shop.cart.ts"
import { Item } from "./shop.item.ts"
import { ShopRoute } from "./shop.route.ts"

export const Model = S.Struct({
    route: ShopRoute,
    products: S.Array(Item),
    cart: Cart,
    deliveryInstructions: S.String,
    orderPlaced: S.Boolean,
    searchText: S.String,
})

export type Model = typeof Model.Type
