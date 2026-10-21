/**
 * # Audit Domain Schemas
 *
 * Schemas for audit event queries and results.
 */

import { Schema } from "effect"
import { DatabaseError } from "../errors.ts"

export const AuditEventFilter = Schema.Struct({
    action: Schema.optional(Schema.String),
    result: Schema.optional(Schema.String),
    reason_class: Schema.optional(Schema.String),
    contact_id: Schema.optional(Schema.String),
    domain_id: Schema.optional(Schema.String),
    date_from: Schema.optional(Schema.Date),
    date_to: Schema.optional(Schema.Date),
    limit: Schema.optional(Schema.Number),
    offset: Schema.optional(Schema.Number),
})
export type AuditEventFilter = Schema.Schema.Type<typeof AuditEventFilter>

// Legacy audit wire contract; actor identity will migrate to auth accounts.
// contact_id is who the event is about; actor_contact_id is who performed it.
// They differ whenever an admin acts on someone else, which is the whole value
// of the record. Only contact_id is filterable.
export const AuditEventItem = Schema.Struct({
    id: Schema.String,
    action: Schema.String,
    entity_type: Schema.String,
    entity_id: Schema.optional(Schema.String),
    result: Schema.String,
    reason_class: Schema.optional(Schema.String),
    contact_id: Schema.optional(Schema.String),
    actor_contact_id: Schema.optional(Schema.String),
    session_id: Schema.optional(Schema.String),
    request_id: Schema.optional(Schema.String),
    created_at: Schema.Date,
})
export type AuditEventItem = Schema.Schema.Type<typeof AuditEventItem>

export const AuditEventList = Schema.Struct({
    items: Schema.Array(AuditEventItem),
    total: Schema.Number,
})
export type AuditEventList = Schema.Schema.Type<typeof AuditEventList>

export { DatabaseError }
