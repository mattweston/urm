import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { RtRoute } from "./route.ts"

export const ChangedRouteTransitionsRoute = taggedStruct(
    "ChangedRouteTransitionsRoute",
    {
        route: RtRoute,
        isColdLoad: S.Boolean,
    }
)
export const SucceededLoadRtCatalog = taggedStruct("SucceededLoadRtCatalog")
export const SucceededLoadRtPainting = taggedStruct("SucceededLoadRtPainting", {
    paintingId: S.Number,
})
export const UpdatedRtStudioDraft = taggedStruct("UpdatedRtStudioDraft", {
    value: S.String,
})
export const SucceededSaveRtDraft = taggedStruct("SucceededSaveRtDraft", {
    draft: S.String,
})

export const RouteTransitionsMessage = S.Union([
    ChangedRouteTransitionsRoute,
    SucceededLoadRtCatalog,
    SucceededLoadRtPainting,
    UpdatedRtStudioDraft,
    SucceededSaveRtDraft,
])
export type RouteTransitionsMessage = typeof RouteTransitionsMessage.Type
