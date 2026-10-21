import { Match as M } from "effect"

import type { Message } from "./stats.message.ts"
import type { Model } from "./stats.model.ts"

type UpdateReturn = readonly [Model, readonly []]

export const init = (): UpdateReturn => [
    {
        deliveries: [],
        observedAt: 0,
        loading: true,
        error: null,
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            MailStatsLoaded: ({ deliveries, observedAt }) => [
                {
                    deliveries: [...deliveries],
                    observedAt,
                    loading: false,
                    error: null,
                },
                [],
            ],
            MailStatsFailed: ({ error }) => [
                { ...model, loading: false, error },
                [],
            ],
        })
    )
