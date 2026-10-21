import { Context } from "effect"
import type { DomainsRpcHandlers } from "./index.ts"

export class DomainsRpcHandlersTag extends Context.Service<
    DomainsRpcHandlersTag,
    DomainsRpcHandlers
>()("DomainsRpcHandlers") {}
