/**
 * # Contacts RPC
 *
 * Effect version similar to [Solid Example: With Trpc](https://tanstack.com/start/latest/docs/framework/solid/examples/with-trpc?path=examples%2Fsolid%2Fwith-trpc%2Fsrc%2Fserver%2Fserver.ts)
 */

import { type Schema } from "effect"
import type { RpcGroup } from "effect/rpc"
import { ContactsRpcs } from "@urm/contracts/contacts-old"
import { Contact } from "@urm/domain/schemas/contacts"

// Extract types from Effect schemas
export type ContactType = Schema.Schema.Type<typeof Contact>

export {
    ContactsRpcs,
    ContactsListRpc,
    ContactsGetRpc,
    ContactsCreateRpc,
    ContactsUpdateRpc,
    ContactsDeleteRpc,
} from "@urm/contracts/contacts-old"

export { ContactsRpcLive, ContactsRpcHandlersTagLive } from "./handlers.js"
export { ContactsRpcHandlersTag } from "./tag.js"

export { ContactsRepository } from "@urm/contracts/repositories/contacts"
export { ContactsRepositoryLive } from "./repository.js"

export type ContactsRpcHandlers = RpcGroup.HandlersFrom<
    RpcGroup.Rpcs<typeof ContactsRpcs>
>
