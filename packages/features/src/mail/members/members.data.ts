import { Schema as S } from "effect"

import type { Member as RemoteMember } from "@urm/domain/schemas/members"

export const Member = S.Struct({
    id: S.String,
    first: S.String,
    last: S.String,
    twitter: S.String,
    avatar: S.String,
    notes: S.String,
    updated_at: S.Number,
})

export type Member = typeof Member.Type

export const toUiMember = (member: RemoteMember): Member => ({
    id: member.id,
    first: member.first,
    last: member.last,
    twitter: member.twitter ?? "",
    avatar: member.avatar ?? "",
    notes: member.notes ?? "",
    updated_at: member.updated_at,
})

export const toUiMembers = (
    members: ReadonlyArray<RemoteMember>
): ReadonlyArray<Member> => members.map(toUiMember)
