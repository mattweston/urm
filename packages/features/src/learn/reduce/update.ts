import { Match as M } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"

import type { Message } from "./message.ts"
import { initial_model, type Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const sum_prices = (prices: ReadonlyArray<string>): number =>
    prices.reduce((sum, price) => {
        const amount = Number(price)
        return Number.isFinite(amount) ? sum + amount : sum
    }, 0)

export const init = (): UpdateReturn => [initial_model, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ChangedPrice: ({ index, value }) => [
                modifyFields(model, {
                    prices: (prices) =>
                        prices.map((price, price_index) =>
                            price_index === index ? value : price
                        ),
                    sum: () => null,
                }),
                [],
            ],
            SubmittedReduce: () => [
                modifyFields(model, { sum: () => sum_prices(model.prices) }),
                [],
            ],
        })
    )
