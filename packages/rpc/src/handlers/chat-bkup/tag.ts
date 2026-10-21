import { Context } from "effect"
import type { ChatRpcHandlers } from "./index.ts"

export class ChatRpcHandlersTag extends Context.Service<
    ChatRpcHandlersTag,
    ChatRpcHandlers
>()("ChatRpcHandlers") {}
