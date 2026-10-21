import { Effect, Layer, ManagedRuntime, Schema } from "effect"
import { RpcTest } from "effect/rpc"
import { describe, expect, it } from "vitest"

import {
    ActiveDomainRequestContext,
    ActiveDomainRpcMiddleware,
    AuthenticatedRequestContext,
    AuthenticatedRpcMiddleware,
} from "@urm/contracts/auth-legacy"
import { ChatThreadRpcs } from "@urm/contracts/chat-bkup"
import { ContactId } from "@urm/domain/schemas/contacts"
import { AuthPersistence } from "@urm/auth/auth-persistence"
import { ChatThreadRpcLive } from "../../src/handlers/chat-bkup/thread-handlers.ts"
import {
    UrmbotLanguageModel,
    UrmbotLanguageModelDemoLive,
} from "../../src/handlers/chat-bkup/urmbot-model.ts"

const UrmbotLanguageModelTestLive = Layer.succeed(
    UrmbotLanguageModel,
    UrmbotLanguageModel.of({
        answer: () =>
            Effect.succeed("URMBot can help with supported URM questions."),
    })
)

const firstContactId = "contact-00000000-0000-4000-8000-000000000001"
const otherContactId = "contact-00000000-0000-4000-8000-000000000002"
const firstDomainId = "domain-00000000-0000-4000-8000-000000000001"
const otherDomainId = "domain-00000000-0000-4000-8000-000000000002"

const AuthenticatedRpcMiddlewareTestLive = Layer.succeed(
    AuthenticatedRpcMiddleware,
    AuthenticatedRpcMiddleware.of((effect, options) =>
        Effect.provideService(effect, AuthenticatedRequestContext, {
            requestId: "test-request",
            contactId: Schema.decodeUnknownSync(ContactId)(
                options.headers["x-test-contact-id"] ?? firstContactId
            ),
            headers: options.headers,
        })
    )
)

const ActiveDomainRpcMiddlewareTestLive = Layer.succeed(
    ActiveDomainRpcMiddleware,
    ActiveDomainRpcMiddleware.of((effect, options) =>
        Effect.provideService(effect, ActiveDomainRequestContext, {
            domainId: options.headers["x-test-domain-id"] ?? firstDomainId,
            hostname: "test.localhost",
        })
    )
)

const AuthPersistenceTestLive = Layer.mock(AuthPersistence, {
    findRateLimitBucket: () => Effect.succeed(undefined),
    createRateLimitBucket: () => Effect.void,
    updateRateLimitBucket: () => Effect.void,
    recordRateLimitDenied: () => Effect.void,
})

const ChatThreadTestLive = Layer.mergeAll(
    ChatThreadRpcLive.pipe(
        Layer.provide(UrmbotLanguageModelTestLive),
        Layer.provide(AuthPersistenceTestLive)
    ),
    AuthenticatedRpcMiddlewareTestLive,
    ActiveDomainRpcMiddlewareTestLive
)

const contactHeaders = (contactId: string, domainId = firstDomainId) => ({
    "x-test-contact-id": contactId,
    "x-test-domain-id": domainId,
})

describe("authenticated URMBot chat", () => {
    it("uses a deterministic response in demo mode", async () => {
        const answer = await Effect.runPromise(
            Effect.gen(function* () {
                const model = yield* UrmbotLanguageModel
                return yield* model.answer({
                    sourceTitle: "Demo",
                    sourceReference: "demo",
                    sourceBody: "Demo content",
                    question: "What can I do?",
                    conversationContext: "",
                })
            }).pipe(Effect.provide(UrmbotLanguageModelDemoLive))
        )

        expect(answer).toContain("unavailable in this demo workspace")
    })

    it("creates a contact-owned thread and returns a cited URMBot response", async () => {
        const runtime = ManagedRuntime.make(ChatThreadTestLive)

        const result = await runtime.runPromise(
            Effect.gen(function* () {
                const client = yield* RpcTest.makeClient(ChatThreadRpcs)
                const thread = yield* client.open_thread(
                    {},
                    {
                        headers: contactHeaders(firstContactId),
                    }
                )
                const response = yield* client.submit_turn(
                    {
                        data: {
                            thread_id: thread.id,
                            text: "How can URMBot help?",
                        },
                    },
                    {
                        headers: contactHeaders(firstContactId),
                    }
                )
                const turns = yield* client.list_turns(
                    { thread_id: thread.id },
                    {
                        headers: contactHeaders(firstContactId),
                    }
                )

                return {
                    thread,
                    response,
                    turns,
                }
            }).pipe(Effect.scoped)
        )

        expect(result.thread.kind).toBe("agent")
        expect(result.response.user_turn.author.kind).toBe("contact")
        expect(result.response.thread.id).toBe(result.thread.id)
        expect(result.response.assistant_turn.author.id).toBe("urmbot")
        expect(result.response.assistant_turn.citations[0]?.source_id).toBe(
            "public/urmbot"
        )
        expect(result.turns).toHaveLength(2)
    })

    it("does not expose a contact-owned thread to another contact", async () => {
        const runtime = ManagedRuntime.make(ChatThreadTestLive)

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(ChatThreadRpcs)
                    const thread = yield* client.open_thread(
                        {},
                        {
                            headers: contactHeaders(firstContactId),
                        }
                    )

                    return yield* client.list_turns(
                        { thread_id: thread.id },
                        {
                            headers: contactHeaders(otherContactId),
                        }
                    )
                }).pipe(Effect.scoped)
            )
        ).rejects.toThrow("Chat thread not found.")
    })

    it("does not expose a contact's thread on another domain", async () => {
        const runtime = ManagedRuntime.make(ChatThreadTestLive)

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(ChatThreadRpcs)
                    const thread = yield* client.open_thread(
                        {},
                        {
                            headers: contactHeaders(
                                firstContactId,
                                firstDomainId
                            ),
                        }
                    )

                    return yield* client.list_turns(
                        { thread_id: thread.id },
                        {
                            headers: contactHeaders(
                                firstContactId,
                                otherDomainId
                            ),
                        }
                    )
                }).pipe(Effect.scoped)
            )
        ).rejects.toThrow("Chat thread not found.")
    })
})
