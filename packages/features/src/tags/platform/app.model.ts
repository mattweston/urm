import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"

import { EntityTag, Tag } from "@urm/domain/schemas/tags"

export const DEFAULT_TAG_COLOR = "var(--primary)"

export const TAG_COLOR_OPTIONS = [
    { value: "var(--primary)", label: "Primary" },
    { value: "var(--destructive)", label: "Destructive" },
    { value: "var(--chart-1)", label: "Chart 1" },
    { value: "var(--chart-2)", label: "Chart 2" },
    { value: "var(--chart-3)", label: "Chart 3" },
    { value: "var(--chart-4)", label: "Chart 4" },
    { value: "var(--chart-5)", label: "Chart 5" },
] as const

export type TagColorOption = (typeof TAG_COLOR_OPTIONS)[number]

export const TagSortBy = S.Union([
    S.Literal("name"),
    S.Literal("created"),
    S.Literal("usage"),
])

export type TagSortBy = typeof TagSortBy.Type

export const Model = S.Struct({
    loading: S.Boolean,
    can_write: S.optionalKey(S.Boolean),
    error: S.NullOr(S.String),
    tags: S.Array(Tag),
    entityTags: S.Array(EntityTag),
    searchQuery: S.String,
    sortBy: TagSortBy,
    mutating: S.Boolean,
    directoryTagsSynced: S.Boolean,
    creatingName: S.String,
    creatingColor: S.String,
    creatingDescription: S.String,
    editingTagId: S.NullOr(S.String),
    editingName: S.String,
    editingColor: S.String,
    editingDescription: S.String,
    pendingDeleteTagId: S.NullOr(S.String),
    deleteConfirmationDialog: Ui.Dialog.Model,
})

export type Model = typeof Model.Type
