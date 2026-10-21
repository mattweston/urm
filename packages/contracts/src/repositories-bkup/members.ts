/**
 * # Members Repository
 *  *
 */
import { Context, Effect, Schema } from "effect"
import type { ItemResult } from "../repository.ts"
import { DatabaseError } from "@urm/domain/errors"
import {
    CreateMemberInput,
    Member,
    UpdateMemberInput,
} from "@urm/domain/schemas/members"

export interface MembersRepositoryType {
    insert(
        domain_id: string,
        data: Schema.Schema.Type<typeof CreateMemberInput>
    ): Effect.Effect<ItemResult<Member>, DatabaseError, never>
    update(
        domain_id: string,
        id: string,
        data: Partial<Schema.Schema.Type<typeof UpdateMemberInput>>
    ): Effect.Effect<ItemResult<Member>, DatabaseError, never>
    findById(
        domain_id: string,
        id: string
    ): Effect.Effect<Member | null, DatabaseError, never>
    findMany(
        domain_id: string,
        options?: { limit?: number }
    ): Effect.Effect<Member[], DatabaseError, never>
    delete(
        domain_id: string,
        id: string
    ): Effect.Effect<void, DatabaseError, never>
}

export class MembersRepository extends Context.Service<
    MembersRepository,
    MembersRepositoryType
>()("MembersRepository") {}
