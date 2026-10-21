import { Match as M, Option } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"
import {
    LoadCartlaneStorage,
    PersistCartlane,
    PlaceCartlaneOrder,
} from "./cartlane.command.ts"
import { addCartLine, productForId, updateCartLine } from "./cartlane.domain.ts"
import type { Message } from "./cartlane.message.ts"
import { initialModel, type Model } from "./cartlane.model.ts"
import { Route } from "./cartlane.route.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()
export const init = (): UpdateReturn => [
    initialModel(),
    [LoadCartlaneStorage()],
]
const persist = (model: Model) =>
    PersistCartlane({ cart: model.cart, last_order: model.last_order })

const submit = (model: Model): UpdateReturn => {
    if (!model.is_online)
        return [
            evo(model, {
                checkout_result: () =>
                    Option.some({
                        _tag: "Failed",
                        message:
                            "Checkout is paused while offline. Your basket is still available.",
                        is_recoverable: true,
                    }),
            }),
            [],
        ]
    const request = {
        idempotency_key: model.idempotency_key,
        lines: model.cart,
        name: model.checkout_form.name,
        email: model.checkout_form.email,
        address: model.checkout_form.address,
        city: model.checkout_form.city,
        postal_code: model.checkout_form.postal_code,
        card_number: model.checkout_form.card_number,
        agree_to_terms: model.checkout_form.agree_to_terms,
    }
    return [
        evo(model, {
            submission_state: () => "Submitting",
            checkout_result: () => Option.none(),
            last_submitted_cart: () => model.cart,
        }),
        [PlaceCartlaneOrder({ ledger: model.ledger, request })],
    ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ChangedRoute: ({ route }) => [
                evo(model, { route: () => route }),
                [],
            ],
            ClickedAddProduct: ({ product_id }) => {
                const next = evo(model, {
                    cart: () => addCartLine(model.cart, product_id),
                    notice: () =>
                        Option.map(
                            productForId(product_id),
                            ({ name }) => `${name} added to your basket.`
                        ),
                })
                return [next, [persist(next)]]
            },
            ClickedIncreaseQuantity: ({ product_id }) => {
                const line = model.cart.find(
                    (candidate) => candidate.product_id === product_id
                )
                if (line === undefined) return [model, []]
                const next = evo(model, {
                    cart: () =>
                        updateCartLine(
                            model.cart,
                            product_id,
                            line.quantity + 1
                        ),
                })
                return [next, [persist(next)]]
            },
            ClickedDecreaseQuantity: ({ product_id }) => {
                const line = model.cart.find(
                    (candidate) => candidate.product_id === product_id
                )
                if (line === undefined) return [model, []]
                const next = evo(model, {
                    cart: () =>
                        updateCartLine(
                            model.cart,
                            product_id,
                            line.quantity - 1
                        ),
                })
                return [next, [persist(next)]]
            },
            ClickedRemoveProduct: ({ product_id }) => {
                const next = evo(model, {
                    cart: () => updateCartLine(model.cart, product_id, 0),
                })
                return [next, [persist(next)]]
            },
            ChangedCheckoutName: ({ value }) => [
                evo(model, {
                    checkout_form: (form) => evo(form, { name: () => value }),
                }),
                [],
            ],
            ChangedCheckoutEmail: ({ value }) => [
                evo(model, {
                    checkout_form: (form) => evo(form, { email: () => value }),
                }),
                [],
            ],
            ChangedCheckoutAddress: ({ value }) => [
                evo(model, {
                    checkout_form: (form) =>
                        evo(form, { address: () => value }),
                }),
                [],
            ],
            ChangedCheckoutCity: ({ value }) => [
                evo(model, {
                    checkout_form: (form) => evo(form, { city: () => value }),
                }),
                [],
            ],
            ChangedCheckoutPostalCode: ({ value }) => [
                evo(model, {
                    checkout_form: (form) =>
                        evo(form, { postal_code: () => value }),
                }),
                [],
            ],
            ChangedCheckoutCardNumber: ({ value }) => [
                evo(model, {
                    checkout_form: (form) =>
                        evo(form, { card_number: () => value }),
                }),
                [],
            ],
            ToggledCheckoutTerms: () => [
                evo(model, {
                    checkout_form: (form) =>
                        evo(form, { agree_to_terms: (value) => !value }),
                }),
                [],
            ],
            SubmittedCheckout: () => submit(model),
            ClickedSubmitDuplicate: () =>
                submit(evo(model, { cart: () => model.last_submitted_cart })),
            ToggledOnline: () => [
                evo(model, { is_online: (value) => !value }),
                [],
            ],
            DismissedNotice: () => [
                evo(model, { notice: () => Option.none() }),
                [],
            ],
            LoadedCartlaneStorage: ({ cart, last_order, idempotency_key }) => [
                evo(model, {
                    cart: () => cart,
                    last_order: () => last_order,
                    idempotency_key: () => idempotency_key,
                    storage_state: () => "Ready",
                }),
                [],
            ],
            FailedCartlaneStorage: () => [
                evo(model, { storage_state: () => "Failed" }),
                [],
            ],
            PersistedCartlane: () => [model, []],
            CompletedCheckout: ({ ledger, result }) => {
                if (result._tag !== "Succeeded")
                    return [
                        evo(model, {
                            ledger: () => ledger,
                            checkout_result: () => Option.some(result),
                            submission_state: () => "Idle",
                        }),
                        [],
                    ]
                const next = evo(model, {
                    route: () =>
                        Route.cases.Order.make({ order_id: result.order.id }),
                    ledger: () => ledger,
                    last_order: () => Option.some(result.order),
                    checkout_result: () => Option.some(result),
                    submission_state: () => "Idle",
                    cart: () => [],
                    notice: () => Option.some(result.message),
                })
                return [next, [persist(next)]]
            },
        })
    )
