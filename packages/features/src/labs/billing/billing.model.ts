import { Schema as S } from "effect"

// Only what the reader can change. Every price, total and verdict on the page
// is a function of these five numbers, computed in `billing.plan.ts` on the
// way to the view, so there is no second copy that can fall out of date.
export const Model = S.Struct({
    seats: S.Number,
    contacts: S.Number,
    emailsPerContact: S.Number,
    budget: S.Number,
    isBilledAnnually: S.Boolean,
})
export type Model = typeof Model.Type

export const init = (): readonly [Model, ReadonlyArray<never>] => [
    {
        seats: 8,
        contacts: 12_000,
        emailsPerContact: 4,
        budget: 150,
        isBilledAnnually: false,
    },
    [],
]
