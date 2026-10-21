import { Context } from "effect"
import type { HandlersFrom } from "effect/rpc/RpcGroup"

import {
    ChatListTurnsRpc,
    ChatOpenThreadRpc,
    ChatSubmitTurnRpc,
} from "@urm/contracts/chat-bkup"

export type ChatThreadRpcHandlers = HandlersFrom<
    | typeof ChatOpenThreadRpc
    | typeof ChatListTurnsRpc
    | typeof ChatSubmitTurnRpc
>

export class ChatThreadRpcHandlersTag extends Context.Service<
    ChatThreadRpcHandlersTag,
    ChatThreadRpcHandlers
>()("ChatThreadRpcHandlers") {}
