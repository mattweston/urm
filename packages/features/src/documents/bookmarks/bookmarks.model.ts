import { Schema as S } from "effect"

export const Bookmark = S.Struct({
    id: S.String,
    title: S.String,
    href: S.String,
    tags: S.Array(S.String),
    updated_at: S.Number,
})
export type Bookmark = typeof Bookmark.Type

export const Model = S.Struct({
    bookmarks: S.Array(Bookmark),
    can_write: S.optionalKey(S.Boolean),
    query: S.String,
    title: S.String,
    href: S.String,
    tags: S.String,
    editing_id: S.Option(S.String),
    status: S.Literals(["loading", "ready", "saving", "error"]),
    error: S.Option(S.String),
})
export type Model = typeof Model.Type
