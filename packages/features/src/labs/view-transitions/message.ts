import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ChangedViewTransitionsRoute = taggedStruct(
    "ChangedViewTransitionsRoute",
    {
        maybeFoodSlug: S.Option(S.String),
    }
)
export const FocusedViewTransitionsFood = taggedStruct(
    "FocusedViewTransitionsFood",
    {
        foodSlug: S.String,
    }
)
export const UpdatedViewTransitionsFilterText = taggedStruct(
    "UpdatedViewTransitionsFilterText",
    { filterText: S.String }
)

export const ViewTransitionsMessage = S.Union([
    ChangedViewTransitionsRoute,
    FocusedViewTransitionsFood,
    UpdatedViewTransitionsFilterText,
])
export type ViewTransitionsMessage = typeof ViewTransitionsMessage.Type
