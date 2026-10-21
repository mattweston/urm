import { Context } from "effect"
import type { MailRpcHandlers } from "./index.ts"

export class MailRpcHandlersTag extends Context.Service<
    MailRpcHandlersTag,
    MailRpcHandlers
>()("MailRpcHandlers") {}
