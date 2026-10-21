import { Schema as S } from "effect"

import { Member } from "./members.data.ts"

export const Model = S.Struct({
    loading: S.Boolean,
    error: S.NullOr(S.String),
    members: S.Array(Member),
})

export type Model = typeof Model.Type
