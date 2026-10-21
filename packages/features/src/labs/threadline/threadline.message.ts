import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Route } from "./threadline.model.ts"

export const ChangedRoute = taggedStruct("ChangedRoute", { route: Route })
export const ChangedComposer = taggedStruct("ChangedComposer", {
    value: S.String,
})
export const SubmittedPost = taggedStruct("SubmittedPost")
export const CompletedPost = taggedStruct("CompletedPost", {
    id: S.String,
    body: S.String,
    is_success: S.Boolean,
})
export const ToggledLike = taggedStruct("ToggledLike", { id: S.String })
export const CompletedLike = taggedStruct("CompletedLike", {
    id: S.String,
    operation: S.Number,
    is_success: S.Boolean,
})
export const ToggledSave = taggedStruct("ToggledSave", { id: S.String })
export const ToggledFollow = taggedStruct("ToggledFollow", { handle: S.String })
export const ToggledOnline = taggedStruct("ToggledOnline")
export const ReceivedLivePost = taggedStruct("ReceivedLivePost")
export const RetriedNotice = taggedStruct("RetriedNotice", { id: S.Number })
export const DismissedNotice = taggedStruct("DismissedNotice", { id: S.Number })
export const Message = S.Union([
    ChangedRoute,
    ChangedComposer,
    SubmittedPost,
    CompletedPost,
    ToggledLike,
    CompletedLike,
    ToggledSave,
    ToggledFollow,
    ToggledOnline,
    ReceivedLivePost,
    RetriedNotice,
    DismissedNotice,
])
export type Message = typeof Message.Type
