import { Option, Schema as S } from "effect"

import {
    CartLine,
    CheckoutResult,
    OrderReceipt,
    SavedOrder,
} from "./cartlane.domain.ts"
import { Route } from "./cartlane.route.ts"

export const CheckoutForm = S.Struct({
    name: S.String,
    email: S.String,
    address: S.String,
    city: S.String,
    postal_code: S.String,
    card_number: S.String,
    agree_to_terms: S.Boolean,
})
export type CheckoutForm = typeof CheckoutForm.Type

export const Model = S.Struct({
    route: Route,
    cart: S.Array(CartLine),
    checkout_form: CheckoutForm,
    checkout_result: S.Option(CheckoutResult),
    ledger: S.Array(SavedOrder),
    last_order: S.Option(OrderReceipt),
    notice: S.Option(S.String),
    is_online: S.Boolean,
    idempotency_key: S.String,
    storage_state: S.Literals(["Loading", "Ready", "Failed"]),
    submission_state: S.Literals(["Idle", "Submitting"]),
    last_submitted_cart: S.Array(CartLine),
})
export type Model = typeof Model.Type

export const initialModel = (): Model => ({
    route: Route.cases.Catalog.make({}),
    cart: [],
    checkout_form: {
        name: "",
        email: "",
        address: "",
        city: "",
        postal_code: "",
        card_number: "",
        agree_to_terms: false,
    },
    checkout_result: Option.none(),
    ledger: [],
    last_order: Option.none(),
    notice: Option.none(),
    is_online: true,
    idempotency_key: "cartlane-session-1",
    storage_state: "Loading",
    submission_state: "Idle",
    last_submitted_cart: [],
})
