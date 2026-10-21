import { Array, Match as M, Option } from "effect"
import clsx from "clsx"
import type { Html, HtmlBuilder } from "foldkit/html"
import { IconLock } from "@urm/ui/foldkit/icons/view.ts"

import { GotCheckoutMachineMessage } from "./message.ts"
import {
    ClickedBack,
    ClickedCancel,
    ClickedContinue,
    ClickedPlaceOrder,
    ClickedStartOver,
    SelectedEdition,
    SubmittedPromoCode,
    ToggledPaymentMethod,
    ToggledTermsAccepted,
    UpdatedPromoCode,
    checkoutMachine,
    isReviewReady,
    promoToMaybeDiscount,
    type CheckoutMessage,
    type CheckoutState,
    type Discount,
    type Promo,
    type TransitionLogEntry,
} from "./machine.ts"

const PRIMARY_BUTTON_CLASS =
    "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-primary bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:border-ring hover:bg-ring hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground [box-shadow:var(--shadow-primary)]"

const SECONDARY_BUTTON_CLASS =
    "inline-flex min-h-12 cursor-pointer items-center justify-center whitespace-nowrap rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border bg-transparent px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-foreground hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [box-shadow:var(--shadow-control)]"

const GHOST_BUTTON_CLASS =
    "cursor-pointer text-sm font-medium text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"

const CARD_CLASS =
    "border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground"

const PHYSICAL_PRICE = 52
const DIGITAL_PRICE = 28
const SALES_TAX_RATE = 0.0825

const stateEyebrow = (checkout: CheckoutState): string =>
    M.value(checkout).pipe(
        M.tagsExhaustive({
            Cart: () => "Bag",
            Shipping: () => "Delivery",
            Payment: () => "Payment",
            Review: () => "Review",
            Placing: () => "Order",
            Confirmed: () => "Order",
            Cancelled: () => "Checkout",
        })
    )

const stateTitle = (checkout: CheckoutState): string =>
    M.value(checkout).pipe(
        M.tagsExhaustive({
            Cart: () => "Your order",
            Shipping: () => "Delivery details",
            Payment: () => "Payment",
            Review: () => "Review and place order",
            Placing: () => "Processing your order",
            Confirmed: () => "Thank you",
            Cancelled: () => "Checkout cancelled",
        })
    )

const stateDescription = (checkout: CheckoutState): string =>
    M.value(checkout).pipe(
        M.tagsExhaustive({
            Cart: () => "Choose your edition before continuing to checkout.",
            Shipping: () => "Confirm where we should send your hardcover.",
            Payment: () => "Select a saved payment method for this order.",
            Review: () => "Check the details below before placing your order.",
            Placing: () => "Please keep this page open for a moment.",
            Confirmed: () =>
                "Your order is confirmed and a receipt is on its way.",
            Cancelled: () =>
                "Nothing was charged. Your selection has been saved.",
        })
    )

const formatMoney = (amount: number): string => `$${amount.toFixed(2)}`

const stateDiscount = (checkout: CheckoutState): Option.Option<Discount> =>
    M.value(checkout).pipe(
        M.tags({
            Review: ({ promo }) => promoToMaybeDiscount(promo),
            Placing: ({ maybeDiscount }) => maybeDiscount,
            Confirmed: ({ maybeDiscount }) => maybeDiscount,
        }),
        M.option,
        Option.flatten
    )

const orderPricing = (checkout: CheckoutState) => {
    const subtotal = checkout.isShippingRequired
        ? PHYSICAL_PRICE
        : DIGITAL_PRICE
    const maybeDiscount = Option.map(stateDiscount(checkout), (discount) => ({
        code: discount.code,
        amount: Math.round(subtotal * discount.percentOff) / 100,
    }))
    const discounted =
        subtotal -
        Option.match(maybeDiscount, {
            onNone: () => 0,
            onSome: ({ amount }) => amount,
        })
    const tax = Math.round(discounted * SALES_TAX_RATE * 100) / 100

    return { subtotal, maybeDiscount, tax, total: discounted + tax }
}

const editionChoice = <ParentMessage>(
    label: string,
    description: string,
    isShippingRequired: boolean,
    isSelected: boolean,
    toStateMachineMessage: (
        message: GotCheckoutMachineMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("button")(
        label,
        [
            h.Type("button"),
            h.Role("radio"),
            h.AriaChecked(isSelected),
            h.OnClick(
                toStateMachineMessage(
                    GotCheckoutMachineMessage({
                        message: SelectedEdition({ isShippingRequired }),
                    })
                )
            ),
            h.Class(
                clsx(
                    "relative flex-1 cursor-pointer border-2 p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isSelected
                        ? "border-foreground bg-background"
                        : "border-border bg-card hover:border-muted-foreground hover:bg-background"
                )
            ),
        ],
        [
            h.div(
                [h.Class("flex items-start justify-between gap-4")],
                [
                    h.div(
                        [],
                        [
                            h.div(
                                [h.Class("text-sm font-bold text-foreground")],
                                [label]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-1 text-xs leading-5 text-muted-foreground"
                                    ),
                                ],
                                [description]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("text-right")],
                        [
                            h.div(
                                [h.Class("text-sm font-bold text-foreground")],
                                [
                                    formatMoney(
                                        isShippingRequired
                                            ? PHYSICAL_PRICE
                                            : DIGITAL_PRICE
                                    ),
                                ]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        clsx(
                                            "mt-2 inline-flex text-xs font-bold uppercase tracking-wider",
                                            isSelected
                                                ? "text-ring"
                                                : "text-muted-foreground"
                                        )
                                    ),
                                ],
                                [isSelected ? "Selected" : "Choose"]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const toggleRow = <ParentMessage>(
    label: string,
    isChecked: boolean,
    message: CheckoutMessage,
    toStateMachineMessage: (
        message: GotCheckoutMachineMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.label(
        [h.Class("flex items-center gap-3 cursor-pointer")],
        [
            h.input([
                h.Type("checkbox"),
                h.Checked(isChecked),
                h.OnClick(
                    toStateMachineMessage(
                        GotCheckoutMachineMessage({ message })
                    )
                ),
                h.Class("size-4 accent-current text-ring"),
            ]),
            h.span([h.Class("text-foreground")], [label]),
        ]
    )

const discountLine = <ParentMessage>(
    maybeDiscount: Option.Option<Discount>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(maybeDiscount, {
        onNone: () => h.empty,
        onSome: (discount) =>
            h.p(
                [h.Class("text-sm text-foreground")],
                [`${discount.code} applied: ${discount.percentOff}% off.`]
            ),
    })

const bookCoverView = <ParentMessage>(
    isCompact: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.AriaHidden(true),
            h.Class(
                clsx(
                    "relative grid content-start overflow-hidden bg-ring text-white",
                    isCompact
                        ? "h-24 w-16 p-2.5 shadow-sm"
                        : "mx-auto h-40 w-30 p-4 shadow-md @[36rem]:mx-0"
                )
            ),
        ],
        [
            h.div([
                h.Class(
                    isCompact
                        ? "mb-1.5 h-px w-1/4 bg-current"
                        : "mb-3 h-px w-1/4 bg-current"
                ),
            ]),
            h.div(
                [
                    h.Class(
                        isCompact
                            ? "hidden"
                            : "text-xs font-extrabold uppercase tracking-widest"
                    ),
                ],
                ["Signal Press"]
            ),
            h.div(
                [
                    h.Class(
                        isCompact
                            ? "mt-1 font-serif text-xs leading-none tracking-tighter"
                            : "mt-2 font-serif text-base leading-none tracking-tighter"
                    ),
                ],
                ["Designing", h.br([]), "Durable", h.br([]), "Interfaces"]
            ),
            h.div(
                [
                    h.Class(
                        isCompact
                            ? "hidden"
                            : "mt-auto text-xs font-bold uppercase tracking-wider"
                    ),
                ],
                ["Mira Chen"]
            ),
        ]
    )

const cartView = <ParentMessage>(
    isShippingRequired: boolean,
    toStateMachineMessage: (
        message: GotCheckoutMachineMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("grid gap-8")],
        [
            h.div(
                [
                    h.Class(
                        "grid gap-6 border-y border-border py-6 @[36rem]:grid-cols-4 @[36rem]:items-center"
                    ),
                ],
                [
                    bookCoverView(false, h),
                    h.div(
                        [h.Class("@[36rem]:col-span-3")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-xs font-bold uppercase tracking-widest text-ring"
                                    ),
                                ],
                                ["New release"]
                            ),
                            h.h2(
                                [
                                    h.Class(
                                        "mt-2 font-serif text-2xl text-foreground"
                                    ),
                                ],
                                ["Designing Durable Interfaces"]
                            ),
                            h.p(
                                [h.Class("mt-1 text-sm text-muted-foreground")],
                                ["By Mira Chen"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-4 max-w-lg text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "A practical field guide to state, feedback, and resilient interaction design.",
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-3")],
                [
                    h.div(
                        [h.Class("mb-3 text-sm font-bold text-foreground")],
                        ["Choose an edition"]
                    ),
                    h.div(
                        [
                            h.Role("radiogroup"),
                            h.AriaLabel("Choose an edition"),
                            h.Class("grid gap-3 sm:grid-cols-2"),
                        ],
                        [
                            editionChoice(
                                "Hardcover",
                                "Clothbound, 248 pages. Ships in 1–2 business days.",
                                true,
                                isShippingRequired,
                                toStateMachineMessage,
                                h
                            ),
                            editionChoice(
                                "E-book",
                                "PDF and EPUB files delivered by email after purchase.",
                                false,
                                !isShippingRequired,
                                toStateMachineMessage,
                                h
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const shippingView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.div(
        [h.Class("grid gap-7")],
        [
            h.section(
                [
                    h.AriaLabel("Contact information"),
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border pb-5"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "text-xs font-bold uppercase tracking-widest text-muted-foreground"
                            ),
                        ],
                        ["Contact"]
                    ),
                    h.div(
                        [h.Class("mt-2 text-sm font-medium text-foreground")],
                        ["alex.morgan@example.com"]
                    ),
                ]
            ),
            h.section(
                [
                    h.AriaLabel("Delivery address"),
                    h.Class("border-2 border-foreground bg-background p-5"),
                ],
                [
                    h.h3(
                        [h.Class("text-sm font-bold text-foreground")],
                        ["Saved address"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-3 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Alex Morgan",
                            h.br([]),
                            "18 Bergen Street",
                            h.br([]),
                            "Brooklyn, NY 11201",
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-4 text-xs font-bold uppercase tracking-wider text-ring"
                            ),
                        ],
                        ["Selected for free tracked shipping"]
                    ),
                ]
            ),
        ]
    )

const paymentView = <ParentMessage>(
    isPaymentMethodSelected: boolean,
    toStateMachineMessage: (
        message: GotCheckoutMachineMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class(CARD_CLASS)],
        [
            h.h3([h.Class("text-lg font-semibold")], ["Payment"]),
            toggleRow(
                "Mastercard •••• 4242",
                isPaymentMethodSelected,
                ToggledPaymentMethod({ isSelected: !isPaymentMethodSelected }),
                toStateMachineMessage,
                h
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "The selection carries into Review, where it becomes half of the guard on Place order.",
                ]
            ),
        ]
    )

const promoView = <ParentMessage>(
    promoCodeInput: string,
    promo: Promo,
    toStateMachineMessage: (
        message: GotCheckoutMachineMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-col gap-2")],
        [
            h.div(
                [h.Class("flex gap-2")],
                [
                    h.input([
                        h.Type("text"),
                        h.Value(promoCodeInput),
                        h.Placeholder("Promo code"),
                        h.AriaLabel("Promo code"),
                        h.OnInput((value) =>
                            toStateMachineMessage(
                                GotCheckoutMachineMessage({
                                    message: UpdatedPromoCode({ value }),
                                })
                            )
                        ),
                        h.Class(
                            "flex-1 rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-foreground"
                        ),
                    ]),
                    h.button(
                        [
                            h.OnClick(
                                toStateMachineMessage(
                                    GotCheckoutMachineMessage({
                                        message: SubmittedPromoCode(),
                                    })
                                )
                            ),
                            h.Class(SECONDARY_BUTTON_CLASS),
                        ],
                        ["Apply"]
                    ),
                ]
            ),
            M.value(promo).pipe(
                M.tagsExhaustive({
                    NoPromo: () =>
                        h.p(
                            [h.Class("text-sm text-muted-foreground")],
                            ["Try READER10 or SIGNAL20."]
                        ),
                    AppliedPromo: ({ discount }) =>
                        h.p(
                            [h.Class("text-sm text-foreground")],
                            [
                                `${discount.code} applied: ${discount.percentOff}% off.`,
                            ]
                        ),
                    RejectedPromo: () =>
                        h.p(
                            [h.Class("text-sm text-destructive")],
                            ["That code was not recognised."]
                        ),
                })
            ),
        ]
    )

const checkoutStateView = <ParentMessage>(
    checkout: CheckoutState,
    toStateMachineMessage: (
        message: GotCheckoutMachineMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    M.value(checkout).pipe(
        M.tagsExhaustive({
            Cart: ({ isShippingRequired }) =>
                cartView(isShippingRequired, toStateMachineMessage, h),

            Shipping: () => shippingView(h),

            Payment: ({ isPaymentMethodSelected }) =>
                paymentView(isPaymentMethodSelected, toStateMachineMessage, h),

            Review: (review) =>
                h.div(
                    [h.Class(CARD_CLASS)],
                    [
                        h.h3([h.Class("text-lg font-semibold")], ["Review"]),
                        toggleRow(
                            "Mastercard •••• 4242",
                            review.isPaymentMethodSelected,
                            ToggledPaymentMethod({
                                isSelected: !review.isPaymentMethodSelected,
                            }),
                            toStateMachineMessage,
                            h
                        ),
                        toggleRow(
                            "I accept the terms",
                            review.isTermsAccepted,
                            ToggledTermsAccepted({
                                isAccepted: !review.isTermsAccepted,
                            }),
                            toStateMachineMessage,
                            h
                        ),
                        promoView(
                            review.promoCodeInput,
                            review.promo,
                            toStateMachineMessage,
                            h
                        ),
                        h.p(
                            [h.Class("text-sm text-muted-foreground")],
                            [
                                isReviewReady(review)
                                    ? "Both conditions met, so the guard on Place order passes."
                                    : "Place order stays inert until the payment method and the terms are both set.",
                            ]
                        ),
                    ]
                ),

            Placing: () =>
                h.div(
                    [h.Class(CARD_CLASS)],
                    [
                        h.h3(
                            [h.Class("text-lg font-semibold")],
                            ["Placing the order"]
                        ),
                        h.p(
                            [h.Class("text-sm text-muted-foreground")],
                            [
                                "The transition returned a Command. Nothing else is accepted until it reports back.",
                            ]
                        ),
                    ]
                ),

            Confirmed: ({ orderId, maybeDiscount }) =>
                h.div(
                    [h.Class(CARD_CLASS)],
                    [
                        h.h3([h.Class("text-lg font-semibold")], ["Confirmed"]),
                        h.p(
                            [h.Class("text-foreground")],
                            [`Order ${orderId} is on its way.`]
                        ),
                        discountLine(maybeDiscount, h),
                    ]
                ),

            Cancelled: () =>
                h.div(
                    [h.Class(CARD_CLASS)],
                    [
                        h.h3([h.Class("text-lg font-semibold")], ["Cancelled"]),
                        h.p(
                            [h.Class("text-sm text-muted-foreground")],
                            ["Nothing was charged."]
                        ),
                    ]
                ),
        })
    )

const actionsView = <ParentMessage>(
    checkout: CheckoutState,
    toStateMachineMessage: (
        message: GotCheckoutMachineMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const send = (message: CheckoutMessage): ParentMessage =>
        toStateMachineMessage(GotCheckoutMachineMessage({ message }))

    return M.value(checkout).pipe(
        M.tagsExhaustive({
            Cart: ({ isShippingRequired }) =>
                h.div(
                    [h.Class("flex flex-wrap gap-3")],
                    [
                        h.button(
                            [
                                h.OnClick(send(ClickedContinue())),
                                h.Class(PRIMARY_BUTTON_CLASS),
                            ],
                            [
                                isShippingRequired
                                    ? "Continue to delivery"
                                    : "Continue to payment",
                            ]
                        ),
                        h.button(
                            [
                                h.OnClick(send(ClickedCancel())),
                                h.Class(GHOST_BUTTON_CLASS),
                            ],
                            ["Cancel checkout"]
                        ),
                    ]
                ),

            Shipping: () =>
                h.div(
                    [h.Class("flex flex-wrap gap-3")],
                    [
                        h.button(
                            [
                                h.OnClick(send(ClickedContinue())),
                                h.Class(PRIMARY_BUTTON_CLASS),
                            ],
                            ["Continue to payment"]
                        ),
                        h.button(
                            [
                                h.OnClick(send(ClickedBack())),
                                h.Class(SECONDARY_BUTTON_CLASS),
                            ],
                            ["Back to bag"]
                        ),
                        h.button(
                            [
                                h.OnClick(send(ClickedCancel())),
                                h.Class(GHOST_BUTTON_CLASS),
                            ],
                            ["Cancel checkout"]
                        ),
                    ]
                ),

            Payment: ({ isPaymentMethodSelected, isShippingRequired }) =>
                h.div(
                    [h.Class("flex flex-wrap gap-3")],
                    [
                        h.button(
                            [
                                h.OnClick(send(ClickedContinue())),
                                h.Disabled(!isPaymentMethodSelected),
                                h.Class(PRIMARY_BUTTON_CLASS),
                            ],
                            ["Review order"]
                        ),
                        h.button(
                            [
                                h.OnClick(send(ClickedBack())),
                                h.Class(SECONDARY_BUTTON_CLASS),
                            ],
                            [
                                isShippingRequired
                                    ? "Back to delivery"
                                    : "Back to bag",
                            ]
                        ),
                        h.button(
                            [
                                h.OnClick(send(ClickedCancel())),
                                h.Class(GHOST_BUTTON_CLASS),
                            ],
                            ["Cancel checkout"]
                        ),
                    ]
                ),

            Review: (review) =>
                h.div(
                    [h.Class("flex flex-wrap gap-3")],
                    [
                        h.button(
                            [
                                h.OnClick(send(ClickedPlaceOrder())),
                                h.Disabled(!isReviewReady(review)),
                                h.Class(PRIMARY_BUTTON_CLASS),
                            ],
                            [
                                `Place order · ${formatMoney(
                                    orderPricing(review).total
                                )}`,
                            ]
                        ),
                        h.button(
                            [
                                h.OnClick(send(ClickedBack())),
                                h.Class(SECONDARY_BUTTON_CLASS),
                            ],
                            ["Back to payment"]
                        ),
                        h.button(
                            [
                                h.OnClick(send(ClickedCancel())),
                                h.Class(GHOST_BUTTON_CLASS),
                            ],
                            ["Cancel checkout"]
                        ),
                    ]
                ),

            Placing: () => h.empty,

            Confirmed: () =>
                h.button(
                    [
                        h.OnClick(send(ClickedStartOver())),
                        h.Class(PRIMARY_BUTTON_CLASS),
                    ],
                    ["Return to checkout"]
                ),

            Cancelled: () =>
                h.button(
                    [
                        h.OnClick(send(ClickedStartOver())),
                        h.Class(PRIMARY_BUTTON_CLASS),
                    ],
                    ["Start checkout again"]
                ),
        })
    )
}

const transitionLogView = <ParentMessage>(
    transitionLog: ReadonlyArray<TransitionLogEntry>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("font-mono text-xs leading-5")],
        [
            Array.match(transitionLog, {
                onEmpty: () =>
                    h.keyed("p")(
                        "NoTransitions",
                        [h.Class("border-l-2 border-ring pl-3 opacity-80")],
                        [
                            "Nothing yet. Every Message shows up here, including the ones the machine ignores.",
                        ]
                    ),
                onNonEmpty: (entries) =>
                    h.keyed("ul")(
                        "TransitionLog",
                        [h.Class("flex flex-col gap-2 opacity-90")],
                        Array.map(entries, (entry) =>
                            h.keyed("li")(
                                String(entry.id),
                                [h.Class("border-l-2 border-ring py-0.5 pl-3")],
                                [entry.summary]
                            )
                        )
                    ),
            }),
        ]
    )

const PROGRESS_STEPS: ReadonlyArray<string> = [
    "Bag",
    "Delivery",
    "Payment",
    "Review",
]

const progressIndex = (checkout: CheckoutState): number =>
    M.value(checkout).pipe(
        M.tags({
            Cart: () => 0,
            Shipping: () => 1,
            Payment: () => 2,
            Review: () => 3,
            Cancelled: () => 0,
        }),
        M.option,
        Option.getOrElse(() => PROGRESS_STEPS.length)
    )

const progressView = <ParentMessage>(
    checkout: CheckoutState,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const activeIndex = progressIndex(checkout)

    return h.nav(
        [h.AriaLabel("Checkout progress"), h.Class("w-full pt-7 sm:pt-9")],
        [
            h.ol(
                [h.Class("grid grid-cols-4 gap-2 sm:gap-5")],
                Array.map(PROGRESS_STEPS, (label, index) => {
                    const isActive = index === activeIndex
                    const isComplete = index < activeIndex
                    const isSkipped =
                        label === "Delivery" &&
                        !checkout.isShippingRequired &&
                        index < activeIndex

                    return h.keyed("li")(
                        label,
                        [
                            h.Class(
                                "min-w-0 border-t-(length:--surface-border-width) border-border pt-3"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("flex items-center gap-1 sm:gap-2")],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                clsx(
                                                    "grid h-6 w-6 place-items-center rounded-full border-2 text-xs sm:h-7 sm:w-7",
                                                    isActive
                                                        ? "border-foreground bg-background text-foreground"
                                                        : isComplete ||
                                                            isSkipped
                                                          ? "border-primary bg-primary text-primary-foreground"
                                                          : "border-border bg-card text-muted-foreground"
                                                )
                                            ),
                                        ],
                                        [
                                            isComplete || isSkipped
                                                ? "✓"
                                                : String(index + 1),
                                        ]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                clsx(
                                                    "truncate text-xs sm:text-sm",
                                                    isActive
                                                        ? "font-bold uppercase tracking-wider text-foreground"
                                                        : "font-medium text-muted-foreground"
                                                )
                                            ),
                                        ],
                                        [isSkipped ? `${label} skipped` : label]
                                    ),
                                ]
                            ),
                        ]
                    )
                })
            ),
        ]
    )
}

const formatTags = (tags: ReadonlyArray<string>): string =>
    Array.match(tags, {
        onEmpty: () => "None",
        onNonEmpty: Array.join(", "),
    })

const DEAD_TRANSITIONS = checkoutMachine.deadTransitions()
const UNREACHABLE_STATES = checkoutMachine.unreachableStates()
const MERMAID_DEFINITION = checkoutMachine.toMermaid()

const analysisView = <ParentMessage>(
    checkout: CheckoutState,
    transitionLog: ReadonlyArray<TransitionLogEntry>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [
            h.AriaLabel("State machine inspector"),
            h.Class(
                "border-(length:--surface-border-width) border-foreground bg-foreground text-background"
            ),
        ],
        [
            h.div(
                [h.Class("grid gap-6 px-5 py-6 sm:px-7")],
                [
                    h.div(
                        [],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-xs font-bold uppercase tracking-widest text-ring"
                                    ),
                                ],
                                ["Developer view"]
                            ),
                            h.h2(
                                [h.Class("mt-3 font-serif text-2xl")],
                                ["State machine inspector"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 max-w-2xl text-sm leading-6 opacity-70"
                                    ),
                                ],
                                [
                                    "The storefront below is driven by the same explicit machine shown here. Every interaction produces a Message and a deterministic transition.",
                                ]
                            ),
                        ]
                    ),
                    h.dl(
                        [h.Class("grid max-w-xs grid-cols-2 gap-6 text-xs")],
                        [
                            h.div(
                                [],
                                [
                                    h.dt(
                                        [h.Class("opacity-60")],
                                        ["Unreachable"]
                                    ),
                                    h.dd(
                                        [h.Class("mt-1 font-mono")],
                                        [formatTags(UNREACHABLE_STATES)]
                                    ),
                                ]
                            ),
                            h.div(
                                [],
                                [
                                    h.dt(
                                        [h.Class("opacity-60")],
                                        ["Dead transitions"]
                                    ),
                                    h.dd(
                                        [h.Class("mt-1 font-mono")],
                                        [String(DEAD_TRANSITIONS.length)]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "grid gap-5 border-t border-background/25 px-5 py-5 sm:px-7"
                    ),
                ],
                [
                    h.div(
                        [h.Class("grid gap-3 lg:grid-cols-4")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-xs font-bold uppercase tracking-widest opacity-60"
                                    ),
                                ],
                                ["Recent transitions"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-xs leading-5 opacity-80 lg:col-span-3"
                                    ),
                                ],
                                [transitionLogView(transitionLog, h)]
                            ),
                        ]
                    ),
                    h.ol(
                        [
                            h.AriaLabel("Machine states"),
                            h.Class("flex flex-wrap gap-2"),
                        ],
                        Array.map(checkoutMachine.stateTags, (tag) =>
                            h.keyed("li")(
                                tag,
                                [
                                    h.Class(
                                        clsx(
                                            "border-(length:--surface-border-width) px-2.5 py-1.5 font-mono text-xs",
                                            checkout._tag === tag
                                                ? "border-ring bg-ring/20"
                                                : "border-background/30 opacity-70"
                                        )
                                    ),
                                ],
                                [tag]
                            )
                        )
                    ),
                ]
            ),
            h.div(
                [h.Class("border-t border-background/25")],
                [
                    h.h3(
                        [
                            h.Class(
                                "px-5 py-4 text-xs font-bold uppercase tracking-widest opacity-60 sm:px-7"
                            ),
                        ],
                        ["Mermaid definition"]
                    ),
                    h.pre(
                        [
                            h.Class(
                                "max-h-96 overflow-auto border-t border-background/25 bg-black/25 p-5 font-mono text-xs leading-5 opacity-80 sm:p-7"
                            ),
                        ],
                        [MERMAID_DEFINITION]
                    ),
                ]
            ),
        ]
    )

const checkoutPanelView = <ParentMessage>(
    checkout: CheckoutState,
    toStateMachineMessage: (
        message: GotCheckoutMachineMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [
            h.Class(
                "@container border border-border bg-card px-5 py-7 sm:px-8 sm:py-9 @[56rem]:col-span-2"
            ),
        ],
        [
            h.div(
                [h.Class("mb-8 max-w-2xl")],
                [
                    h.div(
                        [
                            h.Class(
                                "text-xs font-bold uppercase tracking-widest text-ring"
                            ),
                        ],
                        [stateEyebrow(checkout)]
                    ),
                    h.h1(
                        [
                            h.Class(
                                "mt-3 font-serif text-3xl text-foreground sm:text-4xl"
                            ),
                        ],
                        [stateTitle(checkout)]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-3 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [stateDescription(checkout)]
                    ),
                ]
            ),
            checkoutStateView(checkout, toStateMachineMessage, h),
            h.div(
                [
                    h.Class(
                        "mt-7 border-t-(length:--surface-border-width) border-border pt-6"
                    ),
                ],
                [actionsView(checkout, toStateMachineMessage, h)]
            ),
        ]
    )

const orderSummaryView = <ParentMessage>(
    checkout: CheckoutState,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const pricing = orderPricing(checkout)
    const rowClass = "flex items-center justify-between gap-4"

    return h.aside(
        [
            h.AriaLabel("Order summary"),
            h.Class(
                "h-fit border border-border bg-muted p-5 sm:p-6 @[56rem]:sticky @[56rem]:top-6"
            ),
        ],
        [
            h.h2(
                [
                    h.Class(
                        "text-sm font-bold uppercase tracking-widest text-foreground"
                    ),
                ],
                ["Order summary"]
            ),
            h.div(
                [
                    h.Class(
                        "mt-5 grid grid-cols-4 gap-4 border-b-(length:--surface-border-width) border-border pb-5"
                    ),
                ],
                [
                    bookCoverView(true, h),
                    h.div(
                        [h.Class("col-span-3")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-serif text-base leading-5 text-foreground"
                                    ),
                                ],
                                ["Designing Durable Interfaces"]
                            ),
                            h.div(
                                [h.Class("mt-2 text-xs text-muted-foreground")],
                                [
                                    `${checkout.isShippingRequired ? "Hardcover" : "E-book"} · Qty 1`,
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-3 text-sm font-bold text-foreground"
                                    ),
                                ],
                                [formatMoney(pricing.subtotal)]
                            ),
                        ]
                    ),
                ]
            ),
            h.dl(
                [
                    h.Class(
                        "grid gap-3 border-b-(length:--surface-border-width) border-border py-5 text-sm"
                    ),
                ],
                [
                    h.div(
                        [h.Class(rowClass)],
                        [
                            h.dt(
                                [h.Class("text-muted-foreground")],
                                ["Subtotal"]
                            ),
                            h.dd(
                                [h.Class("font-medium")],
                                [formatMoney(pricing.subtotal)]
                            ),
                        ]
                    ),
                    ...Option.match(pricing.maybeDiscount, {
                        onNone: () => [],
                        onSome: ({ code, amount }) => [
                            h.div(
                                [h.Class(rowClass)],
                                [
                                    h.dt(
                                        [h.Class("text-muted-foreground")],
                                        [`Discount · ${code}`]
                                    ),
                                    h.dd(
                                        [h.Class("font-medium text-ring")],
                                        [`-${formatMoney(amount)}`]
                                    ),
                                ]
                            ),
                        ],
                    }),
                    h.div(
                        [h.Class(rowClass)],
                        [
                            h.dt(
                                [h.Class("text-muted-foreground")],
                                [
                                    checkout.isShippingRequired
                                        ? "Shipping"
                                        : "Email delivery",
                                ]
                            ),
                            h.dd([h.Class("font-medium")], ["Free"]),
                        ]
                    ),
                    h.div(
                        [h.Class(rowClass)],
                        [
                            h.dt(
                                [h.Class("text-muted-foreground")],
                                ["Estimated tax"]
                            ),
                            h.dd(
                                [h.Class("font-medium")],
                                [formatMoney(pricing.tax)]
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex items-baseline justify-between gap-4 pt-5")],
                [
                    h.div([h.Class("text-sm font-bold")], ["Total"]),
                    h.div(
                        [h.Class("font-serif text-2xl")],
                        [formatMoney(pricing.total)]
                    ),
                ]
            ),
            h.p(
                [h.Class("mt-5 text-xs leading-5 text-muted-foreground")],
                [
                    checkout.isShippingRequired
                        ? "Free tracked shipping in the United States."
                        : "Download links arrive immediately after purchase.",
                ]
            ),
        ]
    )
}

export const view = <ParentMessage>(
    checkout: CheckoutState,
    transitionLog: ReadonlyArray<TransitionLogEntry>,
    toStateMachineMessage: (
        message: GotCheckoutMachineMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "state-machine-demo min-h-full bg-background text-foreground"
            ),
        ],
        [
            h.header(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border bg-card"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("flex items-center gap-3")],
                                [
                                    h.div(
                                        [
                                            h.AriaHidden(true),
                                            h.Class(
                                                "grid h-9 w-9 place-items-center border-(length:--surface-border-width) border-foreground bg-foreground text-xs font-bold tracking-widest text-background"
                                            ),
                                        ],
                                        ["SP"]
                                    ),
                                    h.div(
                                        [],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-sm font-bold uppercase tracking-widest"
                                                    ),
                                                ],
                                                ["Signal Press"]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "hidden text-xs text-muted-foreground sm:block"
                                                    ),
                                                ],
                                                [
                                                    "Independent books on design and technology",
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex items-center gap-2 text-xs font-medium text-muted-foreground"
                                    ),
                                ],
                                [IconLock(), "Secure checkout"]
                            ),
                        ]
                    ),
                ]
            ),
            h.main(
                [
                    h.Class(
                        "@container mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pb-16 sm:pt-8"
                    ),
                ],
                [
                    analysisView(checkout, transitionLog, h),
                    progressView(checkout, h),
                    h.div(
                        [
                            h.Class(
                                "mt-6 grid gap-6 sm:mt-8 @[56rem]:grid-cols-3 @[56rem]:items-start"
                            ),
                        ],
                        [
                            checkoutPanelView(
                                checkout,
                                toStateMachineMessage,
                                h
                            ),
                            orderSummaryView(checkout, h),
                        ]
                    ),
                ]
            ),
            h.footer(
                [
                    h.Class(
                        "border-t-(length:--surface-border-width) border-border bg-card"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8"
                            ),
                        ],
                        [
                            h.div([], ["© Signal Press · Brooklyn, New York"]),
                            h.div(
                                [],
                                ["Questions? support@signalpress.example"]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
