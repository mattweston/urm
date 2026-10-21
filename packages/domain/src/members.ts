import { Schema } from "effect"

import { MemberDetails } from "./schemas/members.ts"

export const MemberRecord = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    first: Schema.String,
    last: Schema.String,
    twitter: Schema.NullOr(Schema.String),
    avatar: Schema.NullOr(Schema.String),
    notes: Schema.NullOr(Schema.String),
    updated_at: Schema.Number,
})
export type MemberRecord = typeof MemberRecord.Type

export { MemberDetails } from "./schemas/members.ts"
export const SaveMemberCommand = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    ...MemberDetails.fields,
})
export type SaveMemberCommand = typeof SaveMemberCommand.Type

export class MembersWriteError extends Schema.TaggedErrorClass<MembersWriteError>()(
    "MembersWriteError",
    { message: Schema.String }
) {}
