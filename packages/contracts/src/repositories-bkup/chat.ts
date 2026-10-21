/**
 * # Chat Repository
 *
 * Server-side read/write path for chat messages. Implemented in
 * packages/rpc/src/handlers/chat/repository.ts via Layer.effect().
 */

import { Context, Effect } from "effect"
import type { ItemResult } from "../repository.ts"
import { DatabaseError } from "@urm/domain/errors"
import {
    SendMessageRequest,
    UpdateMessageRequest,
    type Message,
} from "@urm/domain/schemas/chat"

export interface ChatRepositoryType {
    insert(
        domain_id: string,
        data: SendMessageRequest
    ): Effect.Effect<ItemResult<Message>, DatabaseError, never>
    update(
        domain_id: string,
        id: string,
        data: UpdateMessageRequest
    ): Effect.Effect<ItemResult<Message>, DatabaseError, never>
    findById(
        domain_id: string,
        id: string
    ): Effect.Effect<Message | null, DatabaseError, never>
    findMany(
        domain_id: string,
        options: {
            limit?: number
            contact_id: string
        }
    ): Effect.Effect<Message[], DatabaseError, never>
    delete(
        domain_id: string,
        id: string
    ): Effect.Effect<void, DatabaseError, never>
}

export class ChatRepository extends Context.Service<
    ChatRepository,
    ChatRepositoryType
>()("ChatRepository") {}
