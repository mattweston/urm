import { Schema as S } from "effect"

// Five variables of three different types. Everything the page shows is either
// one of these or worked out from them.
export const Model = S.Struct({
    count: S.Number,
    width: S.Number,
    height: S.Number,
    workspaceName: S.String,
    isPublished: S.Boolean,
})
export type Model = typeof Model.Type

export const init = (): readonly [Model, ReadonlyArray<never>] => [
    {
        count: 7,
        width: 12,
        height: 5,
        workspaceName: "Northwind",
        isPublished: false,
    },
    [],
]
