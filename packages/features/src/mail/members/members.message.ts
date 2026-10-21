import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { Member } from "./members.data.ts"

export const MembersLoaded = taggedStruct("MembersLoaded", {
    members: S.Array(Member),
})

export const FailedLoadingMembers = taggedStruct("FailedLoadingMembers", {
    error: S.String,
})

export const Message = S.Union([MembersLoaded, FailedLoadingMembers])

export type Message = typeof Message.Type
