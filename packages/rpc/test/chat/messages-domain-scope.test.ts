import { Effect, Layer, ManagedRuntime, Ref, Schema } from "effect"
import { RpcTest } from "effect/unstable/rpc"
import { describe, expect, it } from "vitest"

import {
    ActiveDomainRequestContext,
    ActiveDomainRpcMiddleware,
    AuthenticatedRequestContext,
    AuthenticatedRpcMiddleware,
} from "@urm/contracts/auth-legacy"
import { ChatRpcs } from "@urm/contracts/chat-bkup"
import { ChatRepository } from "@urm/contracts/repositories/chat"
import { ContactId } from "@urm/domain/schemas/contacts"
import { ChatRpcLive } from "../../src/handlers/chat-bkup/handlers.ts"

const contact_id = "contact-00000000-0000-4000-8000-000000000001"
const domain_id = "domain-00000000-0000-4000-8000-000000000001"

const AuthenticatedRpcMiddlewareTestLive = Layer.succeed(
    AuthenticatedRpcMiddleware,
    AuthenticatedRpcMiddleware.of((effect, options) =>
        Effect.provideService(effect, AuthenticatedRequestContext, {
            requestId: "test-request",
            contactId: Schema.decodeUnknownSync(ContactId)(contact_id),
            headers: options.headers,
        })
    )
)

const ActiveDomainRpcMiddlewareTestLive = Layer.succeed(
    ActiveDomainRpcMiddleware,
    ActiveDomainRpcMiddleware.of((effect) =>
        Effect.provideService(effect, ActiveDomainRequestContext, {
            domainId: domain_id,
            hostname: "test.localhost",
        })
    )
)

describe("domain-scoped persisted chat messages", () => {
    it("supplies the active domain and authenticated contact to every message operation", async () => {
        const read_domain_ids = await Effect.runPromise(
            Ref.make<ReadonlyArray<string>>([])
        )
        const created_messages = await Effect.runPromise(
            Ref.make<
                ReadonlyArray<
                    Readonly<{ domain_id: string; contact_id: string }>
                >
            >([])
        )
        const ChatRepositoryTestLive = Layer.mock(ChatRepository, {
            findMany: (active_domain_id: string) =>
                Effect.gen(function* () {
                    yield* Ref.update(read_domain_ids, (ids) => [
                        ...ids,
                        active_domain_id,
                    ])
                    return []
                }),
            insert: (active_domain_id: string, data) =>
                Effect.gen(function* () {
                    yield* Ref.update(created_messages, (messages) => [
                        ...messages,
                        {
                            domain_id: active_domain_id,
                            contact_id: data.contact_id,
                        },
                    ])

                    return {
                        item: {
                            id: "message-1",
                            domain_id: active_domain_id,
                            contact_id: data.contact_id,
                            body: data.body,
                            updated_at: 0,
                        },
                        txid: 0,
                    }
                }),
        })
        const runtime = ManagedRuntime.make(
            Layer.mergeAll(
                ChatRpcLive.pipe(Layer.provide(ChatRepositoryTestLive)),
                AuthenticatedRpcMiddlewareTestLive,
                ActiveDomainRpcMiddlewareTestLive
            )
        )

        await runtime.runPromise(
            Effect.gen(function* () {
                const client = yield* RpcTest.makeClient(ChatRpcs)
                yield* client.list({})
                yield* client.send({
                    data: {
                        body: "Hello",
                    },
                })
            }).pipe(Effect.scoped)
        )

        expect(await Effect.runPromise(Ref.get(read_domain_ids))).toEqual([
            domain_id,
        ])
        expect(await Effect.runPromise(Ref.get(created_messages))).toEqual([
            {
                domain_id,
                contact_id,
            },
        ])
    })
})
