import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

import { Member } from "./members.data.ts"

export const MembersLoaded = taggedStruct("MembersLoaded", {
    members: S.Array(Member),
})

export const FailedLoadingMembers = taggedStruct("FailedLoadingMembers", {
    error: S.String,
})

export const MembersSearchChanged = taggedStruct("MembersSearchChanged", {
    value: S.String,
})

export const SelectedMemberChanged = taggedStruct("SelectedMemberChanged", {
    memberId: S.String,
})

export const ClickedCreateMember = taggedStruct("ClickedCreateMember")
export const ClickedEditMember = taggedStruct("ClickedEditMember", {
    memberId: S.String,
})
export const ClickedDeleteMember = taggedStruct("ClickedDeleteMember", {
    memberId: S.String,
})
export const ClosedMemberForm = taggedStruct("ClosedMemberForm")

export const UpdatedMemberDraft = taggedStruct("UpdatedMemberDraft", {
    field: S.Union([
        S.Literal("first"),
        S.Literal("last"),
        S.Literal("twitter"),
        S.Literal("avatar"),
        S.Literal("notes"),
    ]),
    value: S.String,
})

export const GotAvatarDropMessage = taggedStruct("GotAvatarDropMessage", {
    message: Ui.FileDrop.Message,
})

export const RemovedSelectedAvatarFile = taggedStruct(
    "RemovedSelectedAvatarFile",
    {
        fileIndex: S.Number,
    }
)

export const ClickedUploadAvatar = taggedStruct("ClickedUploadAvatar")
export const UploadedAvatar = taggedStruct("UploadedAvatar", {
    url: S.String,
})
export const UploadAvatarFailed = taggedStruct("UploadAvatarFailed", {
    error: S.String,
})

export const SubmittedMemberForm = taggedStruct("SubmittedMemberForm")

export const MemberCreated = taggedStruct("MemberCreated", {
    member: Member,
})

export const MemberUpdated = taggedStruct("MemberUpdated", {
    member: Member,
})

export const MemberDeleted = taggedStruct("MemberDeleted", {
    memberId: S.String,
})

export const MembersActionFailed = taggedStruct("MembersActionFailed", {
    action: S.Union([
        S.Literal("load"),
        S.Literal("create"),
        S.Literal("update"),
        S.Literal("delete"),
        S.Literal("upload"),
    ]),
    error: S.String,
})

export const Message = S.Union([
    MembersLoaded,
    FailedLoadingMembers,
    MembersSearchChanged,
    SelectedMemberChanged,
    ClickedCreateMember,
    ClickedEditMember,
    ClickedDeleteMember,
    ClosedMemberForm,
    UpdatedMemberDraft,
    GotAvatarDropMessage,
    RemovedSelectedAvatarFile,
    ClickedUploadAvatar,
    UploadedAvatar,
    UploadAvatarFailed,
    SubmittedMemberForm,
    MemberCreated,
    MemberUpdated,
    MemberDeleted,
    MembersActionFailed,
])

export type Message = typeof Message.Type
