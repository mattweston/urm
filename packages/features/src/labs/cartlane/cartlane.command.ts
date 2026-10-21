import { Effect, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import { randomHexId } from "@urm/utils"

import {
    CartLine,
    CheckoutRequest,
    OrderReceipt,
    SavedOrder,
    commitOrder,
} from "./cartlane.domain.ts"
import {
    CompletedCheckout,
    FailedCartlaneStorage,
    LoadedCartlaneStorage,
    PersistedCartlane,
} from "./cartlane.message.ts"

const CART_KEY = "cartlane:cart:v1"
const ORDER_KEY = "cartlane:last-order:v1"
const SESSION_KEY = "cartlane:checkout-key:v1"

const PersistedState = S.Struct({
    cart: S.Array(CartLine),
    last_order: S.Option(OrderReceipt),
})

const decodeJson = (value: string | null): unknown => {
    if (value === null) {
        return undefined
    }
    try {
        return JSON.parse(value)
    } catch {
        return undefined
    }
}

const readStorage = Effect.try({
    try: () => {
        const maybeCart = S.decodeUnknownOption(S.Array(CartLine))(
            decodeJson(globalThis.localStorage?.getItem(CART_KEY) ?? null)
        )
        const maybeOrder = S.decodeUnknownOption(OrderReceipt)(
            decodeJson(globalThis.localStorage?.getItem(ORDER_KEY) ?? null)
        )
        const storedKey = globalThis.sessionStorage?.getItem(SESSION_KEY) ?? ""
        const idempotency_key =
            storedKey.trim() === "" ? randomHexId() : storedKey
        globalThis.sessionStorage?.setItem(SESSION_KEY, idempotency_key)
        return LoadedCartlaneStorage({
            cart: Option.getOrElse(maybeCart, () => []),
            last_order: maybeOrder,
            idempotency_key,
        })
    },
    catch: () => FailedCartlaneStorage(),
}).pipe(Effect.catch((message) => Effect.succeed(message)))

export const LoadCartlaneStorage = Command.define("LoadCartlaneStorage", {
    messages: [LoadedCartlaneStorage, FailedCartlaneStorage],
    execute: readStorage,
})

export const PersistCartlane = Command.define("PersistCartlane", {
    args: PersistedState.fields,
    messages: [PersistedCartlane, FailedCartlaneStorage],
    execute: ({ cart, last_order }) =>
        Effect.try({
            try: () => {
                globalThis.localStorage?.setItem(CART_KEY, JSON.stringify(cart))
                Option.match(last_order, {
                    onNone: () =>
                        globalThis.localStorage?.removeItem(ORDER_KEY),
                    onSome: (order) =>
                        globalThis.localStorage?.setItem(
                            ORDER_KEY,
                            JSON.stringify(order)
                        ),
                })
                return PersistedCartlane()
            },
            catch: () => FailedCartlaneStorage(),
        }).pipe(Effect.catch((message) => Effect.succeed(message))),
})

export const PlaceCartlaneOrder = Command.define("PlaceCartlaneOrder", {
    args: { ledger: S.Array(SavedOrder), request: CheckoutRequest },
    messages: [CompletedCheckout],
    execute: ({ ledger, request }) =>
        Effect.sync(() => commitOrder(ledger, request)).pipe(
            Effect.delay("280 millis"),
            Effect.map(([nextLedger, result]) =>
                CompletedCheckout({ ledger: nextLedger, result })
            )
        ),
})
