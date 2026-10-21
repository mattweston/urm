import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { ChannelId, RelayMessage, ThreadReply } from "./relay.model.ts"

export const ChangedChannel = taggedStruct("ChangedChannel", {
    channel: ChannelId,
})
export const ChangedComposer = taggedStruct("ChangedComposer", {
    value: S.String,
})
export const SubmittedMessage = taggedStruct("SubmittedMessage")
export const CompletedPublish = taggedStruct("CompletedPublish", {
    request_id: S.String,
    published: RelayMessage,
    is_success: S.Boolean,
})
export const ClickedReaction = taggedStruct("ClickedReaction", { id: S.String })
export const ToggledConnection = taggedStruct("ToggledConnection")
export const RequestedTeammateUpdate = taggedStruct("RequestedTeammateUpdate")
export const GotTeammateMessage = taggedStruct("GotTeammateMessage", {
    message: RelayMessage,
})
export const ClickedLoadEarlier = taggedStruct("ClickedLoadEarlier")
export const LoadedEarlier = taggedStruct("LoadedEarlier", {
    messages: S.Array(RelayMessage),
})
export const OpenedThread = taggedStruct("OpenedThread", { id: S.String })
export const LoadedThread = taggedStruct("LoadedThread", {
    channel: ChannelId,
    id: S.String,
    replies: S.Array(ThreadReply),
    is_available: S.Boolean,
})
export const ClosedThread = taggedStruct("ClosedThread")
export const ChangedThreadDraft = taggedStruct("ChangedThreadDraft", {
    value: S.String,
})
export const SubmittedThreadReply = taggedStruct("SubmittedThreadReply")
export const Message = S.Union([
    ChangedChannel,
    ChangedComposer,
    SubmittedMessage,
    CompletedPublish,
    ClickedReaction,
    ToggledConnection,
    RequestedTeammateUpdate,
    GotTeammateMessage,
    ClickedLoadEarlier,
    LoadedEarlier,
    OpenedThread,
    LoadedThread,
    ClosedThread,
    ChangedThreadDraft,
    SubmittedThreadReply,
])
export type Message = typeof Message.Type
