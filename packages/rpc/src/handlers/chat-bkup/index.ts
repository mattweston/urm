/**
 * # Chat RPC
 */

import { Effect, type Schema } from "effect"
import type {
    ActiveDomainRequestContext,
    AuthenticatedRequestContext,
} from "@urm/contracts/auth-legacy"
import {
    Message,
    SendMessageRequest,
    DatabaseError,
    ConflictError,
} from "@urm/domain/schemas/chat"

// Extract types from Effect schemas
export type MessageType = Schema.Schema.Type<typeof Message>
export type SendMessageRequestType = Schema.Schema.Type<
    typeof SendMessageRequest
>

export {
    ChatRpcs,
    ChatThreadRpcs,
    MessagesListRpc,
    MessagesSendRpc,
} from "@urm/contracts/chat-bkup"

export { ChatRpcLive, ChatRpcHandlersTagLive } from "./handlers.ts"
export {
    ChatThreadRpcLive,
    ChatThreadRpcHandlersTagLive,
} from "./thread-handlers.ts"
export { ChatThreadRpcHandlersTag } from "./thread-tag.ts"
export {
    UrmbotLanguageModelDemoLive,
    UrmbotLanguageModelLive,
} from "./urmbot-model.ts"
export { ChatRpcHandlersTag } from "./tag.ts"
export { ChatRepositoryLive } from "./repository.ts"

export type ChatRpcHandlers = {
    list: (params: {
        after?: number
    }) => Effect.Effect<
        MessageType[],
        DatabaseError,
        ActiveDomainRequestContext | AuthenticatedRequestContext
    >
    send: (params: {
        data: SendMessageRequestType
    }) => Effect.Effect<
        { item: MessageType; txid: number },
        DatabaseError | ConflictError,
        ActiveDomainRequestContext | AuthenticatedRequestContext
    >
}
