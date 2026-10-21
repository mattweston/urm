import { Schema as S } from "effect"

export const Model = S.Struct({
    status: S.Literals(["Idle", "Starting", "Streaming"]),
    errorMessage: S.Option(S.String),
})

export type Model = typeof Model.Type
