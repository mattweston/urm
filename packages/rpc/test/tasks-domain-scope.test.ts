import { Effect, Layer, ManagedRuntime, Ref, Schema } from "effect"
import { RpcTest } from "effect/rpc"
import { describe, expect, it } from "vitest"

import {
    ActiveDomainRequestContext,
    ActiveDomainRpcMiddleware,
    AuthenticatedRequestContext,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "@urm/contracts/auth-legacy"
import { TodoListItemsRepository } from "@urm/contracts/repositories/tasks"
import { TasksRpcs } from "@urm/contracts/tasks"
import { ContactId } from "@urm/domain/schemas/contacts"
import { TasksRpcLive } from "../src/handlers/tasks/handlers.ts"

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

const DomainManagerRpcMiddlewareTestLive = Layer.succeed(
    DomainManagerRpcMiddleware,
    DomainManagerRpcMiddleware.of((effect) => effect)
)

describe("domain-scoped tasks", () => {
    it("injects active domain ownership and authenticated creator server-side", async () => {
        const read_domain_ids = await Effect.runPromise(
            Ref.make<ReadonlyArray<string>>([])
        )
        const created_items = await Effect.runPromise(
            Ref.make<
                ReadonlyArray<
                    Readonly<{
                        domain_id: string
                        created_by_contact_id: string
                    }>
                >
            >([])
        )
        const TodoListItemsRepositoryTestLive = Layer.mock(
            TodoListItemsRepository,
            {
                findMany: (active_domain_id: string) =>
                    Effect.gen(function* () {
                        yield* Ref.update(read_domain_ids, (ids) => [
                            ...ids,
                            active_domain_id,
                        ])
                        return []
                    }),
                insert: (
                    active_domain_id: string,
                    created_by_contact_id: string,
                    data
                ) =>
                    Effect.gen(function* () {
                        yield* Ref.update(created_items, (items) => [
                            ...items,
                            {
                                domain_id: active_domain_id,
                                created_by_contact_id,
                            },
                        ])

                        return {
                            item: {
                                id: "task-1",
                                text: data.text,
                                completed: data.completed ?? false,
                                status: data.status ?? "active",
                                priority: data.priority ?? null,
                                order: data.order,
                                listId: data.listId,
                                createdByContactId: created_by_contact_id,
                                assigneeContactId: null,
                                relationshipType: data.relationshipType ?? null,
                                createdAt: 0,
                                updatedAt: 0,
                            },
                            txid: 0,
                        }
                    }),
            }
        )
        const runtime = ManagedRuntime.make(
            Layer.mergeAll(
                TasksRpcLive.pipe(
                    Layer.provide(TodoListItemsRepositoryTestLive)
                ),
                AuthenticatedRpcMiddlewareTestLive,
                ActiveDomainRpcMiddlewareTestLive,
                DomainManagerRpcMiddlewareTestLive
            )
        )

        await runtime.runPromise(
            Effect.gen(function* () {
                const client = yield* RpcTest.makeClient(TasksRpcs)
                yield* client.items_list({ listId: "default" })
                yield* client.items_create({
                    data: {
                        text: "Scoped task",
                        listId: "default",
                        order: 0,
                    },
                })
            }).pipe(Effect.scoped)
        )

        expect(await Effect.runPromise(Ref.get(read_domain_ids))).toEqual([
            domain_id,
        ])
        expect(await Effect.runPromise(Ref.get(created_items))).toEqual([
            {
                domain_id,
                created_by_contact_id: contact_id,
            },
        ])
    })
})
