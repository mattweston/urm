import { Schema } from "effect"

export const Member = Schema.Struct({
    id: Schema.String,
    first: Schema.String,
    last: Schema.String,
    twitter: Schema.optional(Schema.String),
    avatar: Schema.optional(Schema.String),
    notes: Schema.optional(Schema.String),
    updated_at: Schema.Number,
    deleted_at: Schema.optional(Schema.Number),
})
export type Member = typeof Member.Type

export const CreateMemberInput = Schema.Struct({
    id: Schema.String,
    first: Schema.String,
    last: Schema.String,
    twitter: Schema.optional(Schema.String),
    avatar: Schema.optional(Schema.String),
    notes: Schema.optional(Schema.String),
    updated_at: Schema.Number,
})

export type CreateMemberInput = Schema.Schema.Type<typeof CreateMemberInput>

export const UpdateMemberInput = Schema.Struct({
    id: Schema.String,
    first: Schema.optional(Schema.String),
    last: Schema.optional(Schema.String),
    twitter: Schema.optional(Schema.String),
    avatar: Schema.optional(Schema.String),
    notes: Schema.optional(Schema.String),
    updated_at: Schema.Number,
})

export type UpdateMemberInput = Schema.Schema.Type<typeof UpdateMemberInput>

export { ConflictError, DatabaseError, NotFoundError } from "../errors.ts"

const name = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(255)
)
export const MemberDetails = Schema.Struct({
    first: name,
    last: name,
    twitter: Schema.NullOr(Schema.Trimmed.check(Schema.isMaxLength(255))),
    avatar: Schema.NullOr(Schema.Trimmed.check(Schema.isMaxLength(2048))),
    notes: Schema.NullOr(Schema.String.check(Schema.isMaxLength(100_000))),
})
