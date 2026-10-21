/**
 * # Media Model
 *
 * Pairs Drizzle table with Effect schemas
 *
 * Re-exports schemas from @urm/shared (source of truth)
 * and tables from db/schema (database structure).
 *
 * This file is the "model aggregator" for the media feature:
 * - Drizzle table: images
 * - Effect schemas: Image, CreateImageInput, UpdateImageInput
 * - Error types: NotFoundError, DatabaseError, ConflictError
 */

import {
    Image,
    CreateImageInput,
    UpdateImageInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
} from "@urm/domain/schemas/media"

// Re-export Drizzle tables and inferred types
export { images } from "@urm/db/legacy-schema/media/images"
export type { Image as ImageRow, NewImage } from "@urm/db/legacy-schema/media/images"

// Re-export Effect schemas (used in routes and handlers)
export {
    Image,
    CreateImageInput,
    UpdateImageInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
}

export const ImagesModel = {
    insert: CreateImageInput,
    update: UpdateImageInput,
    select: Image,
}
