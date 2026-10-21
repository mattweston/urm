import { Context } from "effect"
import type { ShopRpcHandlers } from "./index.ts"

export class ShopRpcHandlersTag extends Context.Service<
    ShopRpcHandlersTag,
    ShopRpcHandlers
>()("ShopRpcHandlers") {}
