import { Context } from "effect"
import type { MembersRpcHandlers } from "./index.ts"

// Keep the tag isolated so handlers.ts does not import index.ts during init.
export class MembersRpcHandlersTag extends Context.Service<
    MembersRpcHandlersTag,
    MembersRpcHandlers
>()("MembersRpcHandlers") {}
