/**
 * # Settings Model
 *
 * Pairs Drizzle table with Effect schemas
 *
 * Re-exports schemas from @urm/shared (source of truth)
 * and tables from db/schema (database structure).
 *
 * This file is the "model aggregator" for the settings feature:
 * - Drizzle table: preferences
 * - Effect schemas: Preference, CreatePreferenceInput, UpdatePreferenceInput
 * - Error types: NotFoundError, DatabaseError, ConflictError
 */

import {
    Preference,
    CreatePreferenceInput,
    UpdatePreferenceInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
} from "@urm/domain/schemas/settings"
import { ValidationError } from "@urm/domain/errors"

// Re-export Drizzle tables and inferred types
export { preferences } from "@urm/db/legacy-schema/settings"
export type {
    Preference as PreferenceRow,
    NewPreference,
} from "@urm/db/legacy-schema/settings"

// Re-export Effect schemas (used in routes and handlers)
export {
    Preference,
    CreatePreferenceInput,
    UpdatePreferenceInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
    ValidationError,
}

export const PreferencesModel = {
    insert: CreatePreferenceInput,
    update: UpdatePreferenceInput,
    select: Preference,
}
