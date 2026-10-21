import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Item } from "./shop.item.ts"
import { ShopRoute } from "./shop.route.ts"

export const ChangedRoute = taggedStruct("ChangedRoute", { route: ShopRoute })
export const CompletedReplaceUrl = taggedStruct("CompletedReplaceUrl")
export const ChangedSearchInput = taggedStruct("ChangedSearchInput", {
    value: S.String,
})
export const ClickedAddToCart = taggedStruct("ClickedAddToCart", { item: Item })
export const ClickedQuantityChange = taggedStruct("ClickedQuantityChange", {
    itemId: S.String,
    quantity: S.Number,
})
export const ClickedRemoveCartItem = taggedStruct("ClickedRemoveCartItem", {
    itemId: S.String,
})
export const ClickedClearCart = taggedStruct("ClickedClearCart")
export const UpdatedDeliveryInstructions = taggedStruct(
    "UpdatedDeliveryInstructions",
    {
        value: S.String,
    }
)
export const ClickedPlaceOrder = taggedStruct("ClickedPlaceOrder")

export const Message = S.Union([
    ChangedRoute,
    CompletedReplaceUrl,
    ChangedSearchInput,
    ClickedAddToCart,
    ClickedQuantityChange,
    ClickedRemoveCartItem,
    ClickedClearCart,
    UpdatedDeliveryInstructions,
    ClickedPlaceOrder,
])

export type Message = typeof Message.Type
