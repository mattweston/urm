/**
 * # Members Model
 *
 * Pairs Drizzle table with Effect schemas
 *
 * Re-exports schemas from @urm/shared (source of truth)
 * and tables from db/schema (database structure).
 *
 * This file is the "model aggregator" for the members feature:
 * - Drizzle table: members
 * - Effect schemas: Member, CreateMemberInput, UpdateMemberInput
 * - Error types: NotFoundError, DatabaseError, ConflictError
 */

import {
    Member,
    CreateMemberInput,
    UpdateMemberInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
} from "@urm/domain/schemas/members"
import { ValidationError } from "@urm/domain/errors"

// Re-export Drizzle tables and inferred types
export { members } from "@urm/database/legacy-schema/members"
export type {
    Member as MemberRow,
    NewMember,
} from "@urm/database/legacy-schema/members"

// Re-export Effect schemas (used in routes and handlers)
export {
    Member,
    CreateMemberInput,
    UpdateMemberInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
    ValidationError,
}

export const MembersModel = {
    insert: CreateMemberInput,
    update: UpdateMemberInput,
    select: Member,
}
