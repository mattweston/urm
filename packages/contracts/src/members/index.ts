import { MemberRecord } from "@urm/domain/members"
export { MemberRecord } from "@urm/domain/members"
import { MemberDetails } from "@urm/domain/schemas/members"
import { Schema } from "effect"
import { Entity, Mutation, Query, Remote } from "foldkit-remote"
export { MemberDetails } from "@urm/domain/schemas/members"
export const RemoteMember = Entity.make("Member", MemberRecord)
export const MemberSummary = RemoteMember.select({
    id: true,
    domain_id: true,
    first: true,
    last: true,
    twitter: true,
    avatar: true,
    notes: true,
    updated_at: true,
})

export const DomainMembers = Query.make("DomainMembers", {
    Input: { domain_id: Schema.String },
    Result: RemoteMember,
})
export const CreateMember = Mutation.make("CreateMember", {
    Input: {
        id: Schema.String.check(
            Schema.isPattern(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
            )
        ),
        domain_id: Schema.String,
        ...MemberDetails.fields,
    },
    Output: { id: Schema.String },
})
export const UpdateMember = Mutation.make("UpdateMember", {
    Input: {
        id: Schema.String,
        domain_id: Schema.String,
        ...MemberDetails.fields,
    },
    Output: { id: Schema.String },
})
export const DeleteMember = Mutation.make("DeleteMember", {
    Input: { id: Schema.String, domain_id: Schema.String },
    Output: { id: Schema.String },
})
export const MembersRemote = Remote.define({
    entities: [RemoteMember],
    queries: [DomainMembers],
    mutations: [CreateMember, UpdateMember, DeleteMember],
})
