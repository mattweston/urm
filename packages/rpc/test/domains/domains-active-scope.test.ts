import { Effect, Layer, ManagedRuntime, Ref, Schema } from "effect"
import { RpcTest } from "effect/unstable/rpc"
import { describe, expect, it } from "vitest"

import {
    AuthenticatedRequestContext,
    AuthenticatedRpcMiddleware,
} from "@urm/contracts/auth-legacy"
import { DomainsRpcs } from "@urm/contracts/domains"
import {
    DomainsRepository,
    type DomainAdminWithInfo,
} from "@urm/contracts/repositories/domains"
import { ContactId } from "@urm/domain/schemas/contacts"
import { type Domain, type DomainHostname } from "@urm/domain/schemas/domains"
import { DomainsRpcLive } from "../../src/handlers/domains/handlers.ts"

const contact_id = "contact-00000000-0000-4000-8000-000000000001"
const domain_a_id = "domain-a"
const domain_b_id = "domain-b"
const org_id = "org-a"

const domain_a: Domain = {
    id: domain_a_id,
    org_id,
    name: "domain-a",
    created_by_contact_id: contact_id,
    created_at: new Date(0),
    updated_at: new Date(0),
}

const domain_b: Domain = {
    id: domain_b_id,
    org_id,
    name: "domain-b",
    created_by_contact_id: contact_id,
    created_at: new Date(0),
    updated_at: new Date(0),
}

const hostname: DomainHostname = {
    id: "hostname-a",
    domain_id: domain_a_id,
    hostname: "domain-a.urm.dev",
    apex_hostname: "domain-a.urm.dev",
    kind: "apex",
    status: "pending_dns",
    is_primary: true,
    verification_token: "verification-token",
    created_at: new Date(0),
    updated_at: new Date(0),
}

const makeDomainAdmin = (
    domain_id: string,
    role: DomainAdminWithInfo["role"] = "admin"
): DomainAdminWithInfo => ({
    id: `${domain_id}-${contact_id}`,
    domain_id,
    contact_id,
    role,
    status: "active",
    created_at: new Date(0),
})

const AuthenticatedRpcMiddlewareTestLive = Layer.succeed(
    AuthenticatedRpcMiddleware,
    AuthenticatedRpcMiddleware.of((effect, options) =>
        Effect.provideService(effect, AuthenticatedRequestContext, {
            requestId: "test-request",
            contactId: Schema.decodeUnknownSync(ContactId)(contact_id),
            headers: options.headers,
            ...(options.headers["x-test-domain-id"] === undefined
                ? {}
                : { domainId: options.headers["x-test-domain-id"] }),
        })
    )
)

const makeTestRuntime = async () => {
    const read_domain_ids = await Effect.runPromise(
        Ref.make<ReadonlyArray<string>>([])
    )
    const domainsRepositoryTestLive = Layer.mock(DomainsRepository, {
        findAdmin: (domain_id: string) =>
            Effect.succeed(makeDomainAdmin(domain_id)),
        findById: (domain_id: string) =>
            Effect.gen(function* () {
                yield* Ref.update(read_domain_ids, (ids) => [...ids, domain_id])
                return domain_id === domain_a_id ? domain_a : domain_b
            }),
    })
    const runtime = ManagedRuntime.make(
        Layer.merge(
            DomainsRpcLive.pipe(Layer.provide(domainsRepositoryTestLive)),
            AuthenticatedRpcMiddlewareTestLive
        )
    )

    return { read_domain_ids, runtime }
}

const makeHostnameDeleteRuntime = async () => {
    const deleted_hostname_ids = await Effect.runPromise(
        Ref.make<ReadonlyArray<string>>([])
    )
    const domainsRepositoryTestLive = Layer.mock(DomainsRepository, {
        findAdmin: (domain_id: string) =>
            Effect.succeed(makeDomainAdmin(domain_id, "viewer")),
        findHostnameByIdForContact: (
            hostname_id: string,
            requested_contact_id: string
        ) =>
            Effect.succeed(
                hostname_id === hostname.id &&
                    requested_contact_id === contact_id
                    ? hostname
                    : null
            ),
        softDeleteHostnameForContact: (hostname_id: string) =>
            Ref.update(deleted_hostname_ids, (ids) => [...ids, hostname_id]),
    })
    const runtime = ManagedRuntime.make(
        Layer.merge(
            DomainsRpcLive.pipe(Layer.provide(domainsRepositoryTestLive)),
            AuthenticatedRpcMiddlewareTestLive
        )
    )

    return { deleted_hostname_ids, runtime }
}

describe("domain-scoped domain RPC", () => {
    it("rejects a different domain before querying it, even when the contact administers both", async () => {
        const { read_domain_ids, runtime } = await makeTestRuntime()

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(DomainsRpcs)
                    return yield* client["domains.get"](
                        { id: domain_b_id },
                        {
                            headers: { "x-test-domain-id": domain_a_id },
                        }
                    )
                }).pipe(Effect.scoped)
            )
        ).rejects.toThrow("Domain not found")

        expect(await Effect.runPromise(Ref.get(read_domain_ids))).toEqual([])
    })

    it("returns only the active domain from a scoped browser session", async () => {
        const { runtime } = await makeTestRuntime()

        const domains = await runtime.runPromise(
            Effect.gen(function* () {
                const client = yield* RpcTest.makeClient(DomainsRpcs)
                return yield* client["domains.list"](
                    {},
                    {
                        headers: { "x-test-domain-id": domain_a_id },
                    }
                )
            }).pipe(Effect.scoped)
        )

        expect(domains).toEqual([domain_a])
    })

    it("does not delete a hostname from a forged ID or a non-manager role", async () => {
        const { deleted_hostname_ids, runtime } =
            await makeHostnameDeleteRuntime()

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(DomainsRpcs)
                    return yield* client["domains.hostnames.delete"]({
                        id: "forged-hostname",
                    })
                }).pipe(Effect.scoped)
            )
        ).rejects.toThrow("Hostname not found")

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(DomainsRpcs)
                    return yield* client["domains.hostnames.delete"]({
                        id: hostname.id,
                    })
                }).pipe(Effect.scoped)
            )
        ).rejects.toThrow("Hostname not found")

        expect(await Effect.runPromise(Ref.get(deleted_hostname_ids))).toEqual(
            []
        )
    })
})
