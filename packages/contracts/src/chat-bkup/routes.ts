import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/unstable/rpc"
import {
    ConflictError,
    ChatThread,
    ChatTurn,
    DatabaseError,
    Message,
    SubmitChatTurn,
} from "@urm/domain/schemas/chat"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
} from "../auth-legacy/rpc-middleware.ts"

const SendAuthenticatedMessage = Schema.Struct({
    author: Schema.optional(Schema.String),
    body: Schema.String,
    timestamp: Schema.optional(Schema.Number),
})

export const ChatOpenThreadRpc = Rpc.make("open_thread", {
    payload: Schema.Struct({}),
    success: ChatThread,
    error: DatabaseError,
})

export const ChatListTurnsRpc = Rpc.make("list_turns", {
    payload: Schema.Struct({
        thread_id: Schema.String,
    }),
    success: Schema.Array(ChatTurn),
    error: DatabaseError,
})

export const ChatSubmitTurnRpc = Rpc.make("submit_turn", {
    payload: Schema.Struct({
        data: SubmitChatTurn,
    }),
    success: Schema.Struct({
        thread: ChatThread,
        user_turn: ChatTurn,
        assistant_turn: ChatTurn,
    }),
    error: Schema.Union([DatabaseError, ConflictError]),
})

// Unnamespaced. "list" is also registered by DocumentsListRpc, and both groups
// are merged into one router in apps/server/src/rpc/layer.ts — nothing in the
// type system flags the clash. New routes should be "feature.action".
export const MessagesListRpc = Rpc.make("list", {
    payload: Schema.Struct({
        after: Schema.optional(Schema.Number),
    }),
    success: Schema.Array(Message),
    error: DatabaseError,
})

export const MessagesSendRpc = Rpc.make("send", {
    payload: Schema.Struct({
        data: SendAuthenticatedMessage,
    }),
    success: Schema.Struct({
        item: Message,
        txid: Schema.Number,
    }),
    error: Schema.Union([DatabaseError, ConflictError]),
})

export const ChatThreadRpcs = RpcGroup.make(
    ChatOpenThreadRpc,
    ChatListTurnsRpc,
    ChatSubmitTurnRpc
)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)

export const ChatRpcs = RpcGroup.make(MessagesListRpc, MessagesSendRpc)
    .middleware(ActiveDomainRpcMiddleware)
    .middleware(AuthenticatedRpcMiddleware)
