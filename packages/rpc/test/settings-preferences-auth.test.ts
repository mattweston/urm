import { Effect, Layer, ManagedRuntime, Ref, Schema } from "effect"
import { RpcTest } from "effect/unstable/rpc"
import { describe, expect, it } from "vitest"
import {
    ActiveDomainRequestContext,
    ActiveDomainRpcMiddleware,
    AuthenticatedRequestContext,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "@urm/contracts/auth-legacy"
import {
    MarketingAppearanceRepository,
    PreferencesRepository,
} from "@urm/contracts/repositories/settings"
import { SettingsRpcs } from "@urm/contracts/settings"
import { ContactId } from "@urm/domain/schemas/contacts"
import { SettingsRpcLive } from "../src/handlers/settings/handlers.ts"

const first_contact_id = "contact-00000000-0000-4000-8000-000000000001"
const second_contact_id = "contact-00000000-0000-4000-8000-000000000002"

const AuthenticatedRpcMiddlewareTestLive = Layer.succeed(
    AuthenticatedRpcMiddleware,
    AuthenticatedRpcMiddleware.of((effect, options) =>
        Effect.provideService(effect, AuthenticatedRequestContext, {
            requestId: "test-request",
            contactId: Schema.decodeUnknownSync(ContactId)(
                options.headers["x-test-contact-id"] ?? first_contact_id
            ),
            headers: options.headers,
        })
    )
)

const ActiveDomainRpcMiddlewareTestLive = Layer.succeed(
    ActiveDomainRpcMiddleware,
    ActiveDomainRpcMiddleware.of((effect) =>
        Effect.provideService(effect, ActiveDomainRequestContext, {
            domainId: "domain-00000000-0000-4000-8000-000000000001",
            hostname: "test.localhost",
        })
    )
)

const DomainManagerRpcMiddlewareTestLive = Layer.succeed(
    DomainManagerRpcMiddleware,
    DomainManagerRpcMiddleware.of((effect) => effect)
)

const makeRuntime = async () => {
    const requested_contact_ids = await Effect.runPromise(
        Ref.make<ReadonlyArray<string>>([])
    )
    const created_contact_ids = await Effect.runPromise(
        Ref.make<ReadonlyArray<string>>([])
    )
    const preferencesRepositoryTestLive = Layer.mock(PreferencesRepository, {
        findByContactId: (contact_id: string) =>
            Effect.gen(function* () {
                yield* Ref.update(requested_contact_ids, (ids) => [
                    ...ids,
                    contact_id,
                ])
                return null
            }),
        insert: (data) =>
            Effect.gen(function* () {
                yield* Ref.update(created_contact_ids, (ids) => [
                    ...ids,
                    data.contact_id,
                ])
                return {
                    item: {
                        id: "preference-1",
                        contact_id: data.contact_id,
                        theme: data.theme ?? "light",
                        language: data.language ?? "en",
                        notifications: data.notifications ?? true,
                        updated_at: data.updated_at,
                    },
                    txid: 0,
                }
            }),
    })
    const marketingAppearanceRepositoryTestLive = Layer.mock(
        MarketingAppearanceRepository,
        {}
    )
    const runtime = ManagedRuntime.make(
        Layer.mergeAll(
            SettingsRpcLive.pipe(
                Layer.provide(preferencesRepositoryTestLive),
                Layer.provide(marketingAppearanceRepositoryTestLive)
            ),
            AuthenticatedRpcMiddlewareTestLive,
            ActiveDomainRpcMiddlewareTestLive,
            DomainManagerRpcMiddlewareTestLive
        )
    )

    return { created_contact_ids, requested_contact_ids, runtime }
}

describe("authenticated preferences", () => {
    it("derives preference ownership from the authenticated contact", async () => {
        const { created_contact_ids, requested_contact_ids, runtime } =
            await makeRuntime()

        await runtime.runPromise(
            Effect.gen(function* () {
                const client = yield* RpcTest.makeClient(SettingsRpcs)
                yield* client.get_by_contact_id(
                    {},
                    {
                        headers: { "x-test-contact-id": second_contact_id },
                    }
                )
                return yield* client.set_theme(
                    { theme: "dark" },
                    {
                        headers: { "x-test-contact-id": second_contact_id },
                    }
                )
            }).pipe(Effect.scoped)
        )

        expect(await Effect.runPromise(Ref.get(requested_contact_ids))).toEqual(
            [second_contact_id, second_contact_id]
        )
        expect(await Effect.runPromise(Ref.get(created_contact_ids))).toEqual([
            second_contact_id,
        ])
    })
})
