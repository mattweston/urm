import { Schema } from "effect"

export const SysadminAccountSession = Schema.Struct({
    id: Schema.String,
    user_id: Schema.String,
    user_name: Schema.optional(Schema.String),
    user_email: Schema.optional(Schema.String),
    status: Schema.Literals(["active", "expired", "revoked"]),
    created_at: Schema.Number,
    last_seen_at: Schema.Number,
    expires_at: Schema.Number,
    revoked_at: Schema.optional(Schema.Number),
})
export type SysadminAccountSession = typeof SysadminAccountSession.Type

export const SysadminAccountSessions = Schema.Struct({
    id: Schema.String,
    sessions: Schema.Array(SysadminAccountSession),
    as_of: Schema.Number,
    has_more: Schema.Boolean,
    scope_name: Schema.String,
    can_view_all: Schema.Boolean,
})
export type SysadminAccountSessions = typeof SysadminAccountSessions.Type
