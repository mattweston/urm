import { Effect, Layer, ManagedRuntime, Ref, Schema } from "effect"
import { RpcTest } from "effect/rpc"
import { describe, expect, it } from "vitest"
import {
    AuthenticatedRequestContext,
    AuthenticatedRpcMiddleware,
} from "@urm/contracts/auth-legacy"
import { DomainsRpcs } from "@urm/contracts/domains"
import { DomainsRepository } from "@urm/contracts/repositories/domains"
import { ContactId } from "@urm/domain/schemas/contacts"
import { DomainsRpcLive } from "../../src/handlers/domains/handlers.ts"

const contact_id = "contact-00000000-0000-4000-8000-000000000001"

describe("organisation domain creation", () => {
    it("uses the authenticated contact as the explicit creator in the active organisation", async () => {
        const created_by = await Effect.runPromise(
            Ref.make<ReadonlyArray<string>>([])
        )
        const repository = Layer.mock(DomainsRepository, {
            createForOrganisationOwner: (active_domain_id, contact_id, input) =>
                Effect.gen(function* () {
                    yield* Ref.update(created_by, (values) => [
                        ...values,
                        `${active_domain_id}:${contact_id}`,
                    ])
                    return {
                        item: {
                            id: "demo-domain",
                            org_id: "organisation-a",
                            name: input.name,
                            created_by_contact_id: contact_id,
                            created_at: new Date(0),
                            updated_at: new Date(0),
                        },
                        txid: 0,
                    }
                }),
        })
        const authenticated = Layer.succeed(
            AuthenticatedRpcMiddleware,
            AuthenticatedRpcMiddleware.of((effect, options) =>
                Effect.provideService(effect, AuthenticatedRequestContext, {
                    requestId: "test-request",
                    contactId: Schema.decodeUnknownSync(ContactId)(contact_id),
                    headers: options.headers,
                    domainId: "source-domain",
                })
            )
        )
        const runtime = ManagedRuntime.make(
            Layer.merge(
                DomainsRpcLive.pipe(Layer.provide(repository)),
                authenticated
            )
        )

        await runtime.runPromise(
            Effect.gen(function* () {
                const client = yield* RpcTest.makeClient(DomainsRpcs)
                return yield* client["domains.create"]({
                    data: { name: "demo-domain", slug: "demo-domain" },
                })
            }).pipe(Effect.scoped)
        )

        expect(await Effect.runPromise(Ref.get(created_by))).toEqual([
            `source-domain:${contact_id}`,
        ])
    })

    it("rejects central sessions before attempting organisation creation", async () => {
        const repository = Layer.mock(DomainsRepository, {
            createForOrganisationOwner: () =>
                Effect.die(
                    "central sessions must not reach organisation creation"
                ),
        })
        const authenticated = Layer.succeed(
            AuthenticatedRpcMiddleware,
            AuthenticatedRpcMiddleware.of((effect, options) =>
                Effect.provideService(effect, AuthenticatedRequestContext, {
                    requestId: "test-request",
                    contactId: Schema.decodeUnknownSync(ContactId)(contact_id),
                    headers: options.headers,
                })
            )
        )
        const runtime = ManagedRuntime.make(
            Layer.merge(
                DomainsRpcLive.pipe(Layer.provide(repository)),
                authenticated
            )
        )

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(DomainsRpcs)
                    return yield* client["domains.create"]({
                        data: { name: "central-domain", slug: "central-domain" },
                    })
                }).pipe(Effect.scoped)
            )
        ).rejects.toThrow("Organisation domain scope is required")
    })
})
