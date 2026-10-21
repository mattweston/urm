/**
 * # Contacts Model
 *
 * Pairs Drizzle table with Effect schemas
 *
 * Re-exports schemas from @urm/shared (source of truth)
 * and table from db/schema (database structure).
 *
 * This file is the "model aggregator" for the contacts feature:
 * - Drizzle table: contacts
 * - Effect schemas: Contact, CreateContactInput, UpdateContactInput
 * - Error types: NotFoundError, DatabaseError, ConflictError
 */

import {
    Contact,
    CreateContactInput,
    UpdateContactInput,
    CreateContactRequest,
    NotFoundError,
    DatabaseError,
    ConflictError,
} from "@urm/domain/schemas/contacts"

// Re-export Drizzle table and inferred types
export { contacts } from "@urm/database/legacy-schema/contacts"
export type { Contact as ContactRow, NewContact } from "@urm/database/legacy-schema/contacts"

// Re-export Effect schemas (used in routes and handlers)
export {
    Contact,
    CreateContactInput,
    UpdateContactInput,
    CreateContactRequest,
    NotFoundError,
    DatabaseError,
    ConflictError,
}

export const ContactsModel = {
    insert: CreateContactInput,
    update: UpdateContactInput,
    select: Contact,
}
