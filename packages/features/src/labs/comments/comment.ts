import { Schema as S } from "effect"

export const Comment = S.Struct({
    id: S.String,
    author: S.String,
    content: S.String,
    created_at: S.Number,
    updated_at: S.Number,
})
export type Comment = typeof Comment.Type
