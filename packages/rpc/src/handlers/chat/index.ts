import { Effect } from "effect"
import { Entity } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import { ChatCatalog, ChatRemote, SendChat } from "@urm/contracts/chat"
import { chat_catalog_id } from "@urm/domain/chat"
import { ChatRepository, type ChatPrincipal } from "./repository.ts"
const denied = () =>
    new RemoteServerError({ message: "Chat unavailable or access denied" })
export const ChatServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<ChatPrincipal, ChatRepository>(ChatCatalog, {
            read: ({ ids, principal }) =>
                Effect.gen(function* () {
                    const id = chat_catalog_id(
                        principal.domain_id,
                        principal.account_id
                    )
                    if (ids.some((requested) => requested !== id))
                        return yield* Effect.fail(denied())
                    const repository = yield* ChatRepository
                    return ids.length === 0
                        ? []
                        : [
                              {
                                  id,
                                  values: yield* repository.load_catalog(
                                      principal
                                  ),
                              },
                          ]
                }).pipe(Effect.mapError(denied)),
        }),
    ],
    mutations: [
        RemoteServer.mutation(
            SendChat,
            ({
                input,
                principal,
            }: {
                input: typeof SendChat.Input.Type
                principal: ChatPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.domain_id !== principal.domain_id ||
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(denied())
                    const repository = yield* ChatRepository
                    const catalog = yield* repository.send(
                        principal,
                        input.message
                    )
                    return {
                        output: { id: input.message.id },
                        entities: [
                            Entity.patch(ChatCatalog.ref(catalog.id), catalog),
                        ],
                    }
                }).pipe(Effect.mapError(denied))
        ),
    ],
})
RemoteServer.validate(ChatRemote, ChatServer)
