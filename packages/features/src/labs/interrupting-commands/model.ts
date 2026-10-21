import { Schema as S } from "effect"
import { Upload } from "./upload.ts"

export const Model = S.Struct({
    nextId: S.Number,
    uploads: S.Array(Upload),
})

export type Model = typeof Model.Type
