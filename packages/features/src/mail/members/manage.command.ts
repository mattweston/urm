import { Effect, Schema as S } from "effect"
import { Command, File } from "foldkit"
import {
    FailedLoadingMembers,
    MemberCreated,
    MemberDeleted,
    MemberUpdated,
    MembersActionFailed,
    MembersLoaded,
    UploadAvatarFailed,
    UploadedAvatar,
} from "./manage.message.ts"
import { MemberDraft } from "./manage.model.ts"

type MemberAction = "create" | "delete" | "update"

const unavailable = (action: MemberAction) =>
    Effect.succeed(
        MembersActionFailed({
            action,
            error: "No members persistence adapter installed",
        })
    )

export const CreateMember = Command.define("CreateMember", {
    args: { draft: MemberDraft },
    messages: [MemberCreated, MembersActionFailed],
    execute: () => unavailable("create"),
})
export const UpdateMember = Command.define("UpdateMember", {
    args: { id: S.String, draft: MemberDraft },
    messages: [MemberUpdated, MembersActionFailed],
    execute: () => unavailable("update"),
})
export const DeleteMember = Command.define("DeleteMember", {
    args: { id: S.String },
    messages: [MemberDeleted, MembersActionFailed],
    execute: () => unavailable("delete"),
})
export const UploadAvatar = Command.define("UploadAvatar", {
    args: { file: File.File },
    messages: [UploadedAvatar, UploadAvatarFailed],
    execute: () =>
        Effect.succeed(
            UploadAvatarFailed({
                error: "No member upload adapter installed",
            })
        ),
})
export const LoadMembers = Command.define("LoadMembers", {
    messages: [MembersLoaded, FailedLoadingMembers],
    execute: Effect.succeed(
        FailedLoadingMembers({
            error: "No members persistence adapter installed",
        })
    ),
})
