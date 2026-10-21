import { Schema as S } from "effect"

import {
    CatalogStatus,
    LoggedTransition,
    PaintingStatus,
    RtRoute,
} from "./route.ts"

export const Model = S.Struct({
    route: RtRoute,
    transitionLog: S.Array(LoggedTransition),
    catalogStatus: CatalogStatus,
    paintingStatus: PaintingStatus,
    studioDraft: S.String,
    maybeSavedDraft: S.Option(S.String),
})

export type Model = typeof Model.Type
