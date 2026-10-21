import { Match as M } from "effect"
import type { ContactType } from "../contacts/index.ts"
import type { Message } from "./sent.message.ts"
import type { Model } from "./sent.model.ts"

type UpdateReturn = readonly [Model, readonly []]

export const init = (): UpdateReturn => [
    {
        deliveries: [],
        contacts: [],
        loading: true,
        error: null,
    },
    [],
]

export const reflectContacts = (
    model: Model,
    contacts: ReadonlyArray<ContactType>
): Model => ({
    ...model,
    contacts: contacts.map(({ id, name, email }) => ({ id, name, email })),
})

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SentDeliveriesLoaded: ({ deliveries }) => [
                {
                    ...model,
                    deliveries: [...deliveries],
                    loading: false,
                    error: null,
                },
                [],
            ],
            SentDeliveriesFailed: ({ error }) => [
                { ...model, loading: false, error },
                [],
            ],
        })
    )
