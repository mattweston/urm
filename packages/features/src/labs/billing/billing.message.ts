import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

// The names of every number the reader can change. Keeping them as a literal
// union rather than plain strings is what lets `update` dispatch on the
// variable name without a cast.
export const BillingVariable = S.Literals([
    "seats",
    "contacts",
    "emailsPerContact",
    "budget",
])
export type BillingVariable = typeof BillingVariable.Type

export const ChangedBillingVariable = taggedStruct("ChangedBillingVariable", {
    variable: BillingVariable,
    value: S.Number,
})

export const ToggledAnnualBilling = taggedStruct("ToggledAnnualBilling")

export const Message = S.Union([ChangedBillingVariable, ToggledAnnualBilling])
export type Message = typeof Message.Type
