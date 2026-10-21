/**
 * # Chat RPC Handlers
 *
 * Effect RPC handlers for chat messages operations.
 * Uses generic repository for database operations.
 *
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import {
    ActiveDomainRequestContext,
    AuthenticatedRequestContext,
} from "@urm/contracts/auth-legacy"
import { ChatRpcs } from "@urm/contracts/chat-bkup"
import { ChatRepository } from "@urm/contracts"
import { ChatRpcHandlersTag } from "./tag.ts"
import { DatabaseError } from "@urm/domain/schemas/chat"

const ChatRpcHandlersLive = Effect.gen(function* () {
    const repo = yield* ChatRepository

    return ChatRpcs.of({
        // List messages (optionally filtered by timestamp)
        list: ({ after }) =>
            Effect.gen(function* () {
                const context = yield* AuthenticatedRequestContext
                const active_domain = yield* ActiveDomainRequestContext
                const messages = yield* repo
                    .findMany(active_domain.domainId, {
                        limit: 50,
                        contact_id: context.contactId,
                    })
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to fetch messages",
                                })
                        )
                    )

                if (after === undefined || after === 0) {
                    return messages
                }

                return messages.filter((message) => message.updated_at > after)
            }),

        // Send a message
        send: ({ data }) =>
            Effect.gen(function* () {
                const context = yield* AuthenticatedRequestContext
                const active_domain = yield* ActiveDomainRequestContext
                return yield* repo
                    .insert(active_domain.domainId, {
                        ...data,
                        contact_id: context.contactId,
                    })
                    .pipe(
                        Effect.mapError(
                            () =>
                                new DatabaseError({
                                    message: "Failed to insert message",
                                })
                        )
                    )
            }),
    })
})

export const ChatRpcLive = ChatRpcs.toLayer(ChatRpcHandlersLive)

export const ChatRpcHandlersTagLive = Layer.effect(
    ChatRpcHandlersTag,
    ChatRpcHandlersLive
)
