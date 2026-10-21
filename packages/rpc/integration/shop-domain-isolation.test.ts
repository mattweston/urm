import {
    DB,
    makeDatabaseLiveFromUrl,
    makeMigratorLive,
    migrator,
    schema,
} from "@urm/db"
import {
    ActiveDomainRequestContext,
    ActiveDomainRpcMiddleware,
    AuthenticatedRequestContext,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "@urm/contracts/auth-legacy"
import { AuthPersistence } from "@urm/auth/auth-persistence"
import { ShopRpcs } from "@urm/contracts/shop"
import { DomainsRepository } from "@urm/contracts/repositories/domains"
import { ContactId, Email } from "@urm/domain/schemas/contacts"
import { Effect, Layer, ManagedRuntime, Option, Schema } from "effect"
import { RpcTest } from "effect/rpc"
import { eq, sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { ShopRpcLive } from "../src/handlers/shop/handlers.ts"
import { DomainsRepositoryLive } from "../src/handlers/domains/repository.ts"

const test_database_url = process.env.DATABASE_URL_TEST

if (test_database_url === undefined || test_database_url.length === 0) {
    throw new Error("DATABASE_URL_TEST is required for shop integration tests")
}

const database_test_live = makeDatabaseLiveFromUrl(
    test_database_url,
    "development"
)
const migrator_test_live = makeMigratorLive().pipe(
    Layer.provide(database_test_live)
)

const domain_a_id = "11111111-1111-4111-8111-111111111111"
const domain_b_id = "22222222-2222-4222-8222-222222222222"
const org_a_id = "31111111-1111-4111-8111-111111111111"
const org_b_id = "32222222-2222-4222-8222-222222222222"
const contact_id = "shop-integration-contact"
const product_b_id = "product-from-domain-b"
const product_b_variant_id = "product-variant-from-domain-b"
const cart_b_id = "cart-from-domain-b"
const cart_b_session_id = "cart-session-from-domain-b"
const order_b_id = "order-from-domain-b"

const active_domain_middleware_test_live = (domain_id: string) =>
    Layer.succeed(
        ActiveDomainRpcMiddleware,
        ActiveDomainRpcMiddleware.of((effect) =>
            Effect.provideService(effect, ActiveDomainRequestContext, {
                domainId: domain_id,
                hostname: `${domain_id}.localhost`,
            })
        )
    )

const authenticated_rpc_middleware_test_live = Layer.succeed(
    AuthenticatedRpcMiddleware,
    AuthenticatedRpcMiddleware.of((effect, options) =>
        Effect.provideService(effect, AuthenticatedRequestContext, {
            requestId: "shop-domain-isolation",
            contactId: Schema.decodeUnknownSync(ContactId)(contact_id),
            headers: options.headers,
        })
    )
)

const domain_manager_rpc_middleware_test_live = Layer.succeed(
    DomainManagerRpcMiddleware,
    DomainManagerRpcMiddleware.of((effect) => effect)
)

const auth_persistence_test_live = Layer.mock(AuthPersistence, {
    findRateLimitBucket: () => Effect.succeed(undefined),
    createRateLimitBucket: () => Effect.void,
    updateRateLimitBucket: () => Effect.void,
    recordRateLimitDenied: () => Effect.void,
})

const make_shop_runtime = (domain_id: string) =>
    ManagedRuntime.make(
        Layer.mergeAll(
            ShopRpcLive.pipe(
                Layer.provide(database_test_live),
                Layer.provide(auth_persistence_test_live)
            ),
            active_domain_middleware_test_live(domain_id),
            authenticated_rpc_middleware_test_live,
            domain_manager_rpc_middleware_test_live
        )
    )

const domains_repository_test_live = DomainsRepositoryLive.pipe(
    Layer.provide(database_test_live)
)

const create_domain_for_organisation = (
    active_domain_id: string,
    name: string
) =>
    Effect.gen(function* () {
        const repository = yield* DomainsRepository
        return yield* repository.createForOrganisationOwner(
            active_domain_id,
            contact_id,
            { name, slug: name }
        )
    }).pipe(Effect.provide(domains_repository_test_live))

const clean_test_database = Effect.gen(function* () {
    const db = yield* DB
    yield* db.execute(sql`TRUNCATE TABLE "contacts", "orgs" CASCADE`)
})

const seed_test_database = Effect.gen(function* () {
    const db = yield* DB
    const now = Date.now()
    const address = {
        first_name: "Shop",
        last_name: "Integration",
        line1: "1 Test Street",
        city: "Testville",
        province: "Test County",
        country: "GB",
        postal: "TE1 1ST",
    }

    yield* db.insert(schema.contacts).values({
        id: contact_id,
        name: "Shop Integration Contact",
        email: "shop-integration@example.test",
        updated_at: now,
    })
    yield* db.insert(schema.orgs).values([
        {
            id: org_a_id,
            name: "Shop Integration A",
            slug: "shop-integration-a",
            max_domains: 1,
        },
        {
            id: org_b_id,
            name: "Shop Integration B",
            slug: "shop-integration-b",
        },
    ])
    yield* db.insert(schema.org_contacts).values({
        org_id: org_a_id,
        contact_id,
        role: "owner",
        status: "active",
    })
    yield* db.insert(schema.domains).values([
        {
            id: domain_a_id,
            org_id: org_a_id,
            name: "shop-integration-a",
            created_by_contact_id: contact_id,
        },
        {
            id: domain_b_id,
            org_id: org_b_id,
            name: "shop-integration-b",
            created_by_contact_id: contact_id,
        },
    ])
    yield* db.insert(schema.products).values({
        id: product_b_id,
        domain_id: domain_b_id,
        name: "Domain B Product",
        slug: "domain-b-product",
        price: 1_000,
        imageUrl: "https://images.example.test/domain-b-product.jpg",
        isActive: true,
        isFeatured: false,
        createdAt: now,
        updatedAt: now,
    })
    yield* db.insert(schema.product_variants).values({
        id: product_b_variant_id,
        productId: product_b_id,
        name: "Default",
        stock: 5,
        options: {},
        priceOverride: 1_000,
        isActive: true,
        createdAt: now,
        updatedAt: now,
    })
    yield* db.insert(schema.carts).values({
        id: cart_b_id,
        domain_id: domain_b_id,
        sessionId: cart_b_session_id,
        currency: "USD",
        totalItems: 1,
        totalValue: 1_000,
        createdAt: now,
        updatedAt: now,
    })
    yield* db.insert(schema.cart_items).values({
        id: "cart-item-from-domain-b",
        cartId: cart_b_id,
        productId: product_b_id,
        productVariantId: product_b_variant_id,
        quantity: 1,
        productName: "Domain B Product",
        productSlug: "domain-b-product",
        productImageUrl: "https://images.example.test/domain-b-product.jpg",
        productPrice: 1_000,
        variantName: "Default",
        variantOptions: {},
        createdAt: now,
        updatedAt: now,
    })
    yield* db.insert(schema.orders).values({
        id: order_b_id,
        domain_id: domain_b_id,
        sessionId: cart_b_session_id,
        email: "buyer@example.test",
        currency: "USD",
        subtotal: 1_000,
        taxAmount: 0,
        shippingAmount: 0,
        discountAmount: 0,
        totalPrice: 1_000,
        billingAddress: address,
        shippingAddress: address,
        status: "pending",
        createdAt: now,
        updatedAt: now,
    })
})

beforeAll(async () => {
    await Effect.runPromise(migrator().pipe(Effect.provide(migrator_test_live)))
    await Effect.runPromise(
        clean_test_database.pipe(Effect.provide(database_test_live))
    )
    await Effect.runPromise(
        seed_test_database.pipe(Effect.provide(database_test_live))
    )
})

afterAll(async () => {
    await Effect.runPromise(
        clean_test_database.pipe(Effect.provide(database_test_live))
    )
})

describe("shop domain isolation", () => {
    it("does not read a product ID owned by another domain", async () => {
        const runtime = make_shop_runtime(domain_a_id)
        const product = await runtime.runPromise(
            Effect.gen(function* () {
                const client = yield* RpcTest.makeClient(ShopRpcs)
                return yield* client.products_get({ id: product_b_id })
            }).pipe(Effect.scoped)
        )

        expect(Option.isNone(product)).toBe(true)
    })

    it("does not expose a cart session or allow a foreign variant to be added", async () => {
        const runtime = make_shop_runtime(domain_a_id)
        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(ShopRpcs)
                    return yield* client.cart_get({
                        sessionId: cart_b_session_id,
                    })
                }).pipe(Effect.scoped)
            )
        ).rejects.toMatchObject({ _tag: "NotFoundError" })
        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(ShopRpcs)
                    return yield* client.cart_add({
                        input: {
                            sessionId: "cart-session-for-domain-a",
                            variantId: product_b_variant_id,
                            quantity: 1,
                        },
                    })
                }).pipe(Effect.scoped)
            )
        ).rejects.toMatchObject({ _tag: "NotFoundError" })
    })

    it("does not check out or retrieve an order owned by another domain", async () => {
        const runtime = make_shop_runtime(domain_a_id)
        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const client = yield* RpcTest.makeClient(ShopRpcs)
                    return yield* client.checkout_create({
                        input: {
                            sessionId: cart_b_session_id,
                            email: Schema.decodeUnknownSync(Email)(
                                "buyer@example.test"
                            ),
                            shippingAddress: {
                                firstName: "Shop",
                                lastName: "Integration",
                                line1: "1 Test Street",
                                city: "Testville",
                                province: "Test County",
                                country: "GB",
                                postal: "TE1 1ST",
                            },
                        },
                    })
                }).pipe(Effect.scoped)
            )
        ).rejects.toMatchObject({ _tag: "NotFoundError" })
        const order = await runtime.runPromise(
            Effect.gen(function* () {
                const client = yield* RpcTest.makeClient(ShopRpcs)
                return yield* client.checkout_order_get({
                    id: order_b_id,
                    sessionId: cart_b_session_id,
                })
            }).pipe(Effect.scoped)
        )

        expect(Option.isNone(order)).toBe(true)
    })

    it("enforces organisation-owner authority and the configured domain quota", async () => {
        await expect(
            Effect.runPromise(
                create_domain_for_organisation(
                    domain_b_id,
                    "foreign-organisation-domain"
                )
            )
        ).rejects.toMatchObject({ _tag: "AuthorizationError" })

        await expect(
            Effect.runPromise(
                create_domain_for_organisation(domain_a_id, "over-quota-domain")
            )
        ).rejects.toMatchObject({ _tag: "ConflictError" })

        await Effect.runPromise(
            Effect.gen(function* () {
                const db = yield* DB
                yield* db
                    .update(schema.orgs)
                    .set({ max_domains: 2 })
                    .where(eq(schema.orgs.id, org_a_id))
            }).pipe(Effect.provide(database_test_live))
        )

        const created = await Effect.runPromise(
            create_domain_for_organisation(
                domain_a_id,
                "organisation-second-domain"
            )
        )

        expect(created.item.org_id).toBe(org_a_id)
    })
})
