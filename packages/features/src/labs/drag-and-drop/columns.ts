import { Schema as S } from "effect"

export const DemoCard = S.Struct({
    id: S.String,
    label: S.String,
})
export type DemoCard = typeof DemoCard.Type

export const DemoColumn = S.Struct({
    id: S.String,
    label: S.String,
    cards: S.Array(DemoCard),
})
export type DemoColumn = typeof DemoColumn.Type
