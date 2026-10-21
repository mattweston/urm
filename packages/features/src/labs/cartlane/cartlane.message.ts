import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import {
    CheckoutResult,
    ProductId,
    SavedOrder,
    CartLine,
    OrderReceipt,
} from "./cartlane.domain.ts"
import { Route } from "./cartlane.route.ts"

export const ChangedRoute = taggedStruct("ChangedRoute", { route: Route })
export const ClickedAddProduct = taggedStruct("ClickedAddProduct", {
    product_id: ProductId,
})
export const ClickedIncreaseQuantity = taggedStruct("ClickedIncreaseQuantity", {
    product_id: ProductId,
})
export const ClickedDecreaseQuantity = taggedStruct("ClickedDecreaseQuantity", {
    product_id: ProductId,
})
export const ClickedRemoveProduct = taggedStruct("ClickedRemoveProduct", {
    product_id: ProductId,
})
export const ChangedCheckoutName = taggedStruct("ChangedCheckoutName", {
    value: S.String,
})
export const ChangedCheckoutEmail = taggedStruct("ChangedCheckoutEmail", {
    value: S.String,
})
export const ChangedCheckoutAddress = taggedStruct("ChangedCheckoutAddress", {
    value: S.String,
})
export const ChangedCheckoutCity = taggedStruct("ChangedCheckoutCity", {
    value: S.String,
})
export const ChangedCheckoutPostalCode = taggedStruct(
    "ChangedCheckoutPostalCode",
    {
        value: S.String,
    }
)
export const ChangedCheckoutCardNumber = taggedStruct(
    "ChangedCheckoutCardNumber",
    {
        value: S.String,
    }
)
export const ToggledCheckoutTerms = taggedStruct("ToggledCheckoutTerms")
export const SubmittedCheckout = taggedStruct("SubmittedCheckout")
export const ClickedSubmitDuplicate = taggedStruct("ClickedSubmitDuplicate")
export const ToggledOnline = taggedStruct("ToggledOnline")
export const DismissedNotice = taggedStruct("DismissedNotice")
export const LoadedCartlaneStorage = taggedStruct("LoadedCartlaneStorage", {
    cart: S.Array(CartLine),
    last_order: S.Option(OrderReceipt),
    idempotency_key: S.String,
})
export const FailedCartlaneStorage = taggedStruct("FailedCartlaneStorage")
export const PersistedCartlane = taggedStruct("PersistedCartlane")
export const CompletedCheckout = taggedStruct("CompletedCheckout", {
    ledger: S.Array(SavedOrder),
    result: CheckoutResult,
})

export const Message = S.Union([
    ChangedRoute,
    ClickedAddProduct,
    ClickedIncreaseQuantity,
    ClickedDecreaseQuantity,
    ClickedRemoveProduct,
    ChangedCheckoutName,
    ChangedCheckoutEmail,
    ChangedCheckoutAddress,
    ChangedCheckoutCity,
    ChangedCheckoutPostalCode,
    ChangedCheckoutCardNumber,
    ToggledCheckoutTerms,
    SubmittedCheckout,
    ClickedSubmitDuplicate,
    ToggledOnline,
    DismissedNotice,
    LoadedCartlaneStorage,
    FailedCartlaneStorage,
    PersistedCartlane,
    CompletedCheckout,
])
export type Message = typeof Message.Type
