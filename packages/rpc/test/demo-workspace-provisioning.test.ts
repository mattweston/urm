import * as ConfigProvider from "effect/ConfigProvider"
import { Effect, Layer, ManagedRuntime, Ref, Schema } from "effect"
import { RpcTest } from "effect/rpc"
import { describe, expect, it } from "vitest"
import { AuthPersistence } from "@urm/auth/auth-persistence"
import { DemoWorkspaceProvisioning } from "@urm/db"
import {
    AuthenticatedRequestContext,
    AuthenticatedRpcMiddleware,
} from "@urm/contracts/auth-legacy"
import { DemoWorkspaceRpcs } from "@urm/contracts/demo-workspaces"
import { ContactId } from "@urm/domain/schemas/contacts"
import { DemoWorkspaceRpcLive } from "../src/handlers/demo-workspaces/handlers.ts"

const contact_id = "demo-workspace-test-contact"

const auth_persistence_test_live = Layer.mock(AuthPersistence, {
    findRateLimitBucket: () => Effect.succeed(undefined),
    createRateLimitBucket: () => Effect.void,
    updateRateLimitBucket: () => Effect.void,
    recordRateLimitDenied: () => Effect.void,
})

const demo_workspace_provisioning_test_live = Layer.mock(
    DemoWorkspaceProvisioning,
    {
        provision: () => Effect.die("Provisioning must not be reached"),
    }
)

const provisioned_workspace = {
    workspace_id: "demo-workspace-id",
    expires_at: new Date("2026-08-01T00:00:00.000Z"),
    domains: [],
}

const auth_persistence_with_blocked_bucket_test_live = Layer.mock(
    AuthPersistence,
    {
        findRateLimitBucket: () =>
            Effect.succeed({
                id: "blocked-demo-provisioning-bucket",
                count: 7,
                blocked_until: Date.now() + 60_000,
            }),
        createRateLimitBucket: () => Effect.void,
        updateRateLimitBucket: () => Effect.void,
        recordRateLimitDenied: () => Effect.void,
    }
)

const authenticated_test_live = (domainId?: string) =>
    Layer.succeed(
        AuthenticatedRpcMiddleware,
        AuthenticatedRpcMiddleware.of((effect, options) =>
            Effect.provideService(effect, AuthenticatedRequestContext, {
                requestId: "demo-workspace-test",
                contactId: Schema.decodeUnknownSync(ContactId)(contact_id),
                headers: options.headers,
                ...(domainId === undefined ? {} : { domainId }),
            })
        )
    )

const demo_config = (is_demo: boolean) =>
    ConfigProvider.layer(
        ConfigProvider.fromUnknown({
            NODE_ENV: "development",
            IS_DEMO: is_demo,
            DATABASE_URL_DEV: "postgresql://localhost/primary",
            DATABASE_URL_DEMO: "postgresql://localhost/demo",
        })
    )

const make_runtime = (is_demo: boolean, domainId?: string) =>
    ManagedRuntime.make(
        Layer.merge(
            DemoWorkspaceRpcLive.pipe(
                Layer.provide(auth_persistence_test_live),
                Layer.provide(demo_workspace_provisioning_test_live),
                Layer.provide(demo_config(is_demo))
            ),
            authenticated_test_live(domainId)
        )
    )

describe("demo workspace provisioning RPC", () => {
    it("rejects direct provisioning on a non-demo deployment", async () => {
        const runtime = make_runtime(false)

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(DemoWorkspaceRpcs)
                    return yield* client["demo.workspace.provision"]({})
                }).pipe(Effect.scoped)
            )
        ).rejects.toThrow("Demo provisioning is unavailable")
    })

    it("requires the demo central host before provisioning", async () => {
        const runtime = make_runtime(true, "demo-domain")

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(DemoWorkspaceRpcs)
                    return yield* client["demo.workspace.provision"]({})
                }).pipe(Effect.scoped)
            )
        ).rejects.toThrow("Demo provisioning requires the central host")
    })

    it("enforces the persisted demo provisioning rate limit before provisioning", async () => {
        const provisioning_calls = await Effect.runPromise(Ref.make(0))
        const provisioning_test_live = Layer.mock(DemoWorkspaceProvisioning, {
            provision: () =>
                Ref.update(provisioning_calls, (calls) => calls + 1).pipe(
                    Effect.as(provisioned_workspace)
                ),
        })
        const runtime = ManagedRuntime.make(
            Layer.merge(
                DemoWorkspaceRpcLive.pipe(
                    Layer.provide(
                        auth_persistence_with_blocked_bucket_test_live
                    ),
                    Layer.provide(provisioning_test_live),
                    Layer.provide(demo_config(true))
                ),
                authenticated_test_live()
            )
        )

        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(DemoWorkspaceRpcs)
                    return yield* client["demo.workspace.provision"]({})
                }).pipe(Effect.scoped)
            )
        ).rejects.toThrow("Demo workspace rate limit reached")
        expect(await Effect.runPromise(Ref.get(provisioning_calls))).toBe(0)
    })
})
