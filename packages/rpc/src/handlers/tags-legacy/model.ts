/**
 * # Tags RPC Model
 *
 * Pairs Drizzle table with Effect schemas
 *
 * Re-exports schemas from @urm/shared (source of truth)
 * and tables from db/schema (database structure).
 *
 * This file is the "model aggregator" for the tags feature:
 * - Drizzle tables: tags, entity_tags
 * - Effect schemas: Tag, EntityTag, CreateTagInput, UpdateTagInput, CreateEntityTagInput, SetTagsForEntityInput
 * - Error types: NotFoundError, DatabaseError, ConflictError
 */

import {
    Tag,
    EntityTag,
    CreateTagInput,
    UpdateTagInput,
    CreateEntityTagInput,
    SetTagsForEntityInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
    ValidationError,
} from "@urm/domain/schemas/tags"

// Re-export Drizzle tables and inferred types
export { tags } from "@urm/database/legacy-schema/tags"
export { entity_tags } from "@urm/database/legacy-schema/tags"
export type { Tag as TagRow, NewTag } from "@urm/database/legacy-schema/tags"
export type {
    EntityTag as EntityTagRow,
    NewEntityTag,
} from "@urm/database/legacy-schema/tags"

// Re-export Effect schemas (used in routes and handlers)
export {
    Tag,
    EntityTag,
    CreateTagInput,
    UpdateTagInput,
    CreateEntityTagInput,
    SetTagsForEntityInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
    ValidationError,
}

export const TagsModel = {
    insert: CreateTagInput,
    update: UpdateTagInput,
    select: Tag,
}

export const EntityTagsModel = {
    insert: CreateEntityTagInput,
    select: EntityTag,
}
