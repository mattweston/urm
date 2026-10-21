import { Schema as S } from "effect"
import { File } from "foldkit"
import * as Ui from "@foldkit/ui"

import { Member } from "./members.data.ts"

export const MemberDraft = S.Struct({
    first: S.String,
    last: S.String,
    twitter: S.String,
    avatar: S.String,
    notes: S.String,
})
export type MemberDraft = typeof MemberDraft.Type

export const FormMode = S.Union([
    S.Literal("detail"),
    S.Literal("create"),
    S.Literal("edit"),
])

export const Model = S.Struct({
    loading: S.Boolean,
    error: S.NullOr(S.String),
    members: S.Array(Member),
    search: S.String,
    selectedMemberId: S.String,
    formMode: FormMode,
    draft: MemberDraft,
    avatarDrop: Ui.FileDrop.Model,
    selectedAvatarFiles: S.Array(File.File),
    uploadBusy: S.Boolean,
    submitting: S.Boolean,
})

export type Model = typeof Model.Type
