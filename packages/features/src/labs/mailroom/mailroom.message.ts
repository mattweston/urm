import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { StoredMailroom } from "./mailroom.model.ts"

export const LoadedMailroom = taggedStruct("LoadedMailroom", {
    stored: StoredMailroom,
})
export const FailedMailroomStorage = taggedStruct("FailedMailroomStorage")
export const ChangedComposeTo = taggedStruct("ChangedComposeTo", {
    value: S.String,
})
export const ChangedComposeSubject = taggedStruct("ChangedComposeSubject", {
    value: S.String,
})
export const ChangedComposeBody = taggedStruct("ChangedComposeBody", {
    value: S.String,
})
export const ClickedSaveDraft = taggedStruct("ClickedSaveDraft")
export const ClickedSendDraft = taggedStruct("ClickedSendDraft")
export const ClickedDiscardDraft = taggedStruct("ClickedDiscardDraft")
export const ClickedToggleStar = taggedStruct("ClickedToggleStar", {
    id: S.String,
})
export const ClickedArchive = taggedStruct("ClickedArchive", { id: S.String })
export const ClickedMarkRead = taggedStruct("ClickedMarkRead", { id: S.String })
export const ClickedReceiveMessage = taggedStruct("ClickedReceiveMessage")
export const PersistedMailroom = taggedStruct("PersistedMailroom")
export const RequestedMailroomNavigation = taggedStruct(
    "RequestedMailroomNavigation",
    {
        href: S.String,
    }
)
export const ConfirmedDiscardChanges = taggedStruct("ConfirmedDiscardChanges")
export const CancelledDiscardChanges = taggedStruct("CancelledDiscardChanges")
export const CompletedMailroomNavigation = taggedStruct(
    "CompletedMailroomNavigation"
)

export const Message = S.Union([
    LoadedMailroom,
    FailedMailroomStorage,
    ChangedComposeTo,
    ChangedComposeSubject,
    ChangedComposeBody,
    ClickedSaveDraft,
    ClickedSendDraft,
    ClickedDiscardDraft,
    ClickedToggleStar,
    ClickedArchive,
    ClickedMarkRead,
    ClickedReceiveMessage,
    PersistedMailroom,
    RequestedMailroomNavigation,
    ConfirmedDiscardChanges,
    CancelledDiscardChanges,
    CompletedMailroomNavigation,
])
export type Message = typeof Message.Type
