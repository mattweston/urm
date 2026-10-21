/**
 * # Contacts Repository
 *  *
 */
import { Context, Effect, Schema } from "effect"
import type { ItemResult } from "../repository.ts"
import { DatabaseError } from "@urm/domain/errors"
import {
    Contact,
    CreateContactInput,
    UpdateDomainContactProfileInput,
} from "@urm/domain/schemas/contacts"
export interface ContactsRepositoryType {
    insert(
        domain_id: string,
        data: Schema.Schema.Type<typeof CreateContactInput>
    ): Effect.Effect<ItemResult<Contact>, DatabaseError, never>
    update(
        domain_id: string,
        id: string,
        data: Schema.Schema.Type<typeof UpdateDomainContactProfileInput>
    ): Effect.Effect<ItemResult<Contact>, DatabaseError, never>
    findById(
        domain_id: string,
        id: string
    ): Effect.Effect<Contact | null, DatabaseError, never>
    findMany(
        domain_id: string,
        options?: {
            limit?: number
        }
    ): Effect.Effect<Contact[], DatabaseError, never>
    delete(
        domain_id: string,
        id: string
    ): Effect.Effect<void, DatabaseError, never>
}

export class ContactsRepository extends Context.Service<
    ContactsRepository,
    ContactsRepositoryType
>()("ContactsRepository") {}
