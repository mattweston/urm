import { Option, Schema as S } from "effect"

// The gallery filter box, plus which food is being navigated to. The active
// slug is what arms the view transition: it survives the route change so the
// gallery can identify the matching card when Back renders it as the
// incoming state.
export const Model = S.Struct({
    maybeFoodSlug: S.Option(S.String),
    maybeActiveFoodSlug: S.Option(S.String),
    filterText: S.String,
})

export type Model = typeof Model.Type

export const init = (
    maybeFoodSlug: Option.Option<string>
): readonly [Model, ReadonlyArray<never>] => [
    {
        maybeFoodSlug,
        maybeActiveFoodSlug: maybeFoodSlug,
        filterText: "",
    },
    [],
]
