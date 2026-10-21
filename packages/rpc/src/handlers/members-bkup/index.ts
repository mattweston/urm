/**
 * # Members RPC
 */
import { Effect, type Schema } from "effect"
import type { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"
import {
    CreateMemberInput,
    Member,
    DatabaseError,
    NotFoundError,
    UpdateMemberInput,
} from "@urm/domain/schemas/members"

// Extract types from Effect schemas
export type MemberType = Schema.Schema.Type<typeof Member>

export {
    MembersRpcs,
    MembersListRpc,
    MembersGetRpc,
    MembersCreateRpc,
    MembersUpdateRpc,
    MembersDeleteRpc,
} from "@urm/contracts/members-old"

export { MembersRpcLive, MembersRpcHandlersTagLive } from "./handlers.js"
export { MembersRpcHandlersTag } from "./tag.ts"

export { MembersRepository } from "@urm/contracts/repositories/members"
export { MembersRepositoryLive } from "./repository.js"

export type MembersRpcHandlers = {
    "members.list": () => Effect.Effect<
        MemberType[],
        DatabaseError,
        ActiveDomainRequestContext
    >
    "members.get": (params: {
        id: string
    }) => Effect.Effect<
        MemberType,
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "members.create": (params: {
        data: Schema.Schema.Type<typeof CreateMemberInput>
    }) => Effect.Effect<
        { item: MemberType; txid: number },
        DatabaseError,
        ActiveDomainRequestContext
    >
    "members.update": (params: {
        id: string
        data: Schema.Schema.Type<typeof UpdateMemberInput>
    }) => Effect.Effect<
        { item: MemberType; txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
    "members.delete": (params: {
        id: string
    }) => Effect.Effect<
        { txid: number },
        NotFoundError | DatabaseError,
        ActiveDomainRequestContext
    >
}
