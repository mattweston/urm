import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { VideoId, WatchPanel } from "./streambox.model.ts"

export const ChangedVideo = taggedStruct("ChangedVideo", { id: VideoId })
export const SelectedPanel = taggedStruct("SelectedPanel", {
    panel: WatchPanel,
})
export const ToggledPlayback = taggedStruct("ToggledPlayback")
export const SoughtVideo = taggedStruct("SoughtVideo", { time: S.Number })
export const ToggledMute = taggedStruct("ToggledMute")
export const ToggledTheater = taggedStruct("ToggledTheater")
export const ToggledLike = taggedStruct("ToggledLike")
export const ToggledSave = taggedStruct("ToggledSave")
export const ToggledFollow = taggedStruct("ToggledFollow")
export const ToggledOnline = taggedStruct("ToggledOnline")
export const ChangedCatalogQuery = taggedStruct("ChangedCatalogQuery", {
    value: S.String,
})
export const ChangedCommentQuery = taggedStruct("ChangedCommentQuery", {
    value: S.String,
})
export const ChangedCommentSort = taggedStruct("ChangedCommentSort", {
    sort: S.Literals(["Featured", "Newest"]),
})
export const Message = S.Union([
    ChangedVideo,
    SelectedPanel,
    ToggledPlayback,
    SoughtVideo,
    ToggledMute,
    ToggledTheater,
    ToggledLike,
    ToggledSave,
    ToggledFollow,
    ToggledOnline,
    ChangedCatalogQuery,
    ChangedCommentQuery,
    ChangedCommentSort,
])
export type Message = typeof Message.Type
