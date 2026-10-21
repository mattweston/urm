import { Schema as S } from "effect"

// The three properties the host writes onto the custom element. Everything the
// element sends back arrives as a Message and lands here.
export const Model = S.Struct({
    label: S.String,
    rating: S.Number,
    accent: S.String,
})

export type Model = typeof Model.Type

export const init = (): readonly [Model, ReadonlyArray<never>] => [
    {
        label: "Foldkit",
        rating: 4,
        accent: "var(--chart-1)",
    },
    [],
]
