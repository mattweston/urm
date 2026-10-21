import {
    Array,
    Duration,
    Effect,
    Match as M,
    Option,
    Schema as S,
    String,
    pipe,
} from "effect"
import { Command } from "foldkit"
import { Machine } from "foldkit/experimental"
import { otherwise, to, when } from "foldkit/experimental/machine"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

export const Discount = S.Struct({
    code: S.String,
    percentOff: S.Number,
})
export type Discount = typeof Discount.Type

export const NoPromo = taggedStruct("NoPromo")
export const AppliedPromo = taggedStruct("AppliedPromo", { discount: Discount })
export const RejectedPromo = taggedStruct("RejectedPromo")

export const Promo = S.Union([NoPromo, AppliedPromo, RejectedPromo])
export type Promo = typeof Promo.Type

export const Cart = taggedStruct("Cart", { isShippingRequired: S.Boolean })
export const Shipping = taggedStruct("Shipping", {
    isShippingRequired: S.Boolean,
})
export const Payment = taggedStruct("Payment", {
    isPaymentMethodSelected: S.Boolean,
    isShippingRequired: S.Boolean,
})
export const Review = taggedStruct("Review", {
    isPaymentMethodSelected: S.Boolean,
    isShippingRequired: S.Boolean,
    isTermsAccepted: S.Boolean,
    promo: Promo,
    promoCodeInput: S.String,
})
export const Placing = taggedStruct("Placing", {
    isShippingRequired: S.Boolean,
    maybeDiscount: S.Option(Discount),
})
export const Confirmed = taggedStruct("Confirmed", {
    isShippingRequired: S.Boolean,
    maybeDiscount: S.Option(Discount),
    orderId: S.String,
})
export const Cancelled = taggedStruct("Cancelled", {
    isShippingRequired: S.Boolean,
})

export const CheckoutState = S.Union([
    Cart,
    Shipping,
    Payment,
    Review,
    Placing,
    Confirmed,
    Cancelled,
])
export type CheckoutState = typeof CheckoutState.Type

export const TransitionLogEntry = S.Struct({
    id: S.Number,
    summary: S.String,
})
export type TransitionLogEntry = typeof TransitionLogEntry.Type

export const ClickedContinue = taggedStruct("ClickedContinue")
export const ClickedBack = taggedStruct("ClickedBack")
export const ClickedCancel = taggedStruct("ClickedCancel")
export const ClickedPlaceOrder = taggedStruct("ClickedPlaceOrder")
export const ClickedStartOver = taggedStruct("ClickedStartOver")
export const ToggledPaymentMethod = taggedStruct("ToggledPaymentMethod", {
    isSelected: S.Boolean,
})
export const SelectedEdition = taggedStruct("SelectedEdition", {
    isShippingRequired: S.Boolean,
})
export const ToggledTermsAccepted = taggedStruct("ToggledTermsAccepted", {
    isAccepted: S.Boolean,
})
export const UpdatedPromoCode = taggedStruct("UpdatedPromoCode", {
    value: S.String,
})
export const SubmittedPromoCode = taggedStruct("SubmittedPromoCode")
export const SucceededPlaceOrder = taggedStruct("SucceededPlaceOrder", {
    orderId: S.String,
})

export const CheckoutMessage = S.Union([
    ClickedContinue,
    ClickedBack,
    ClickedCancel,
    ClickedPlaceOrder,
    ClickedStartOver,
    ToggledPaymentMethod,
    SelectedEdition,
    ToggledTermsAccepted,
    UpdatedPromoCode,
    SubmittedPromoCode,
    SucceededPlaceOrder,
])
export type CheckoutMessage = typeof CheckoutMessage.Type

const PLACE_ORDER_DELAY = Duration.seconds(1)

export const PlaceOrder = Command.define("PlaceOrder", {
    args: { isShippingRequired: S.Boolean },
    messages: [SucceededPlaceOrder],
    execute: ({ isShippingRequired }) =>
        Effect.gen(function* () {
            yield* Effect.sleep(PLACE_ORDER_DELAY)
            return SucceededPlaceOrder({
                orderId: isShippingRequired ? "SHIP-1001" : "DIGI-1001",
            })
        }),
})

const PROMO_DISCOUNTS: ReadonlyArray<Discount> = [
    { code: "READER10", percentOff: 10 },
    { code: "SIGNAL20", percentOff: 20 },
]

export const promoToMaybeDiscount = (promo: Promo): Option.Option<Discount> =>
    M.value(promo).pipe(
        M.tags({ AppliedPromo: (appliedPromo) => appliedPromo.discount }),
        M.option
    )

export const isReviewReady = (review: typeof Review.Type): boolean =>
    review.isPaymentMethodSelected && review.isTermsAccepted

export const reviewToMaybeDiscount = (
    review: typeof Review.Type
): Option.Option<Discount> => {
    const normalizedCode = pipe(
        review.promoCodeInput,
        String.trim,
        String.toUpperCase
    )

    return Array.findFirst(
        PROMO_DISCOUNTS,
        (discount) => discount.code === normalizedCode
    )
}

export const checkoutMachine = Machine.define({
    state: CheckoutState,
    message: CheckoutMessage,
})({
    initial: Cart({ isShippingRequired: true }),
    states: {
        Cart: {
            on: {
                SelectedEdition: to("Cart", ({ state, message }) => ({
                    model: modifyFields(state, {
                        isShippingRequired: () => message.isShippingRequired,
                    }),
                })),
                ClickedContinue: [
                    when(
                        (state) => state.isShippingRequired,
                        "Shipping",
                        ({ state }) => ({
                            model: Shipping({
                                isShippingRequired: state.isShippingRequired,
                            }),
                        })
                    ),
                    otherwise(
                        to("Payment", ({ state }) => ({
                            model: Payment({
                                isPaymentMethodSelected: false,
                                isShippingRequired: state.isShippingRequired,
                            }),
                        }))
                    ),
                ],
                ClickedCancel: to("Cancelled", ({ state }) => ({
                    model: Cancelled({
                        isShippingRequired: state.isShippingRequired,
                    }),
                })),
            },
        },
        Shipping: {
            on: {
                ClickedContinue: to("Payment", ({ state }) => ({
                    model: Payment({
                        isPaymentMethodSelected: false,
                        isShippingRequired: state.isShippingRequired,
                    }),
                })),
                ClickedBack: to("Cart", ({ state }) => ({
                    model: Cart({
                        isShippingRequired: state.isShippingRequired,
                    }),
                })),
                ClickedCancel: to("Cancelled", ({ state }) => ({
                    model: Cancelled({
                        isShippingRequired: state.isShippingRequired,
                    }),
                })),
            },
        },
        Payment: {
            on: {
                ToggledPaymentMethod: to("Payment", ({ state, message }) => ({
                    model: modifyFields(state, {
                        isPaymentMethodSelected: () => message.isSelected,
                    }),
                })),
                ClickedContinue: to("Review", ({ state }) => ({
                    model: Review({
                        isPaymentMethodSelected: state.isPaymentMethodSelected,
                        isShippingRequired: state.isShippingRequired,
                        isTermsAccepted: false,
                        promo: NoPromo(),
                        promoCodeInput: "",
                    }),
                })),
                ClickedBack: [
                    when(
                        (state) => state.isShippingRequired,
                        "Shipping",
                        ({ state }) => ({
                            model: Shipping({
                                isShippingRequired: state.isShippingRequired,
                            }),
                        })
                    ),
                    otherwise(
                        to("Cart", ({ state }) => ({
                            model: Cart({
                                isShippingRequired: state.isShippingRequired,
                            }),
                        }))
                    ),
                ],
                ClickedCancel: to("Cancelled", ({ state }) => ({
                    model: Cancelled({
                        isShippingRequired: state.isShippingRequired,
                    }),
                })),
            },
        },
        Review: {
            on: {
                ToggledPaymentMethod: to("Review", ({ state, message }) => ({
                    model: modifyFields(state, {
                        isPaymentMethodSelected: () => message.isSelected,
                    }),
                })),
                ToggledTermsAccepted: to("Review", ({ state, message }) => ({
                    model: modifyFields(state, {
                        isTermsAccepted: () => message.isAccepted,
                    }),
                })),
                UpdatedPromoCode: to("Review", ({ state, message }) => ({
                    model: modifyFields(state, {
                        promoCodeInput: () => message.value,
                        promo: (currentPromo) =>
                            currentPromo._tag === "RejectedPromo"
                                ? NoPromo()
                                : currentPromo,
                    }),
                })),
                SubmittedPromoCode: [
                    when(
                        reviewToMaybeDiscount,
                        "Review",
                        ({ state, guardValue: discount }) => ({
                            model: modifyFields(state, {
                                promo: () => AppliedPromo({ discount }),
                            }),
                        })
                    ),
                    otherwise(
                        to("Review", ({ state }) => ({
                            model: modifyFields(state, { promo: () => RejectedPromo() }),
                        }))
                    ),
                ],
                ClickedPlaceOrder: [
                    when(isReviewReady, "Placing", ({ state }) => ({
                        model: Placing({
                            isShippingRequired: state.isShippingRequired,
                            maybeDiscount: promoToMaybeDiscount(state.promo),
                        }),
                        commands: [
                            PlaceOrder({
                                isShippingRequired: state.isShippingRequired,
                            }),
                        ],
                    })),
                ],
                ClickedBack: to("Payment", ({ state }) => ({
                    model: Payment({
                        isPaymentMethodSelected: state.isPaymentMethodSelected,
                        isShippingRequired: state.isShippingRequired,
                    }),
                })),
                ClickedCancel: to("Cancelled", ({ state }) => ({
                    model: Cancelled({
                        isShippingRequired: state.isShippingRequired,
                    }),
                })),
            },
        },
        Placing: {
            on: {
                SucceededPlaceOrder: to("Confirmed", ({ state, message }) => ({
                    model: Confirmed({
                        isShippingRequired: state.isShippingRequired,
                        maybeDiscount: state.maybeDiscount,
                        orderId: message.orderId,
                    }),
                })),
            },
        },
        Confirmed: {
            on: {
                ClickedStartOver: to("Cart", ({ state }) => ({
                    model: Cart({
                        isShippingRequired: state.isShippingRequired,
                    }),
                })),
            },
        },
        Cancelled: {
            on: {
                ClickedStartOver: to("Cart", ({ state }) => ({
                    model: Cart({
                        isShippingRequired: state.isShippingRequired,
                    }),
                })),
            },
        },
    },
})

export const TRANSITION_LOG_LIMIT = 20

export const resultToTransitionSummary = (
    result: Machine.TransitionResult<CheckoutState, CheckoutMessage>
): string =>
    M.value(result).pipe(
        M.tagsExhaustive({
            Transitioned: ({ from, messageTag, target }) =>
                `${from} -> ${target} on ${messageTag}`,
            Ignored: ({ messageTag, stateTag }) =>
                `${messageTag} ignored in ${stateTag}`,
        })
    )
