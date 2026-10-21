import { Context } from "effect"
import type { ContactsRpcHandlers } from "./index.ts"

export class ContactsRpcHandlersTag extends Context.Service<
    ContactsRpcHandlersTag,
    ContactsRpcHandlers
>()("ContactsRpcHandlers") {}
