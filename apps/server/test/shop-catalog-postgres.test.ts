import { PGlite } from "@electric-sql/pglite"
import { PgDialect } from "drizzle-orm/pg-core"
import { Effect, Exit, Layer, Schema } from "effect"
import { REMOTE_PROTOCOL_VERSION } from "foldkit-remote"
import { readFile, readdir } from "node:fs/promises"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { Sql, SqlError, type SqlService } from "@urm/database/sql"
import { ShopCheckoutInput } from "@urm/domain/shop"
import {
    ShopCatalogRepository,
    ShopCatalogRepositoryLive,
    ShopCartRepository,
    ShopCartRepositoryLive,
    ShopOrderRepository,
    ShopOrderRepositoryLive,
    shop_catalog_remote_handlers,
    shop_cart_remote_handlers,
    shop_order_remote_handlers,
} from "@urm/rpc/handlers/shop"

const pg = new PGlite()
const dialect = new PgDialect()
const make_sql = (in_transaction = false): SqlService => ({
    query: (statement) =>
        Effect.tryPromise({
            try: async () => {
                const compiled = dialect.sqlToQuery(statement)
                const result = await pg.query<Record<string, unknown>>(
                    compiled.sql,
                    compiled.params
                )
                return result.rows.map((row) =>
                    Object.fromEntries(
                        Object.entries(row).map(([name, value]) => [
                            name,
                            result.fields.some(
                                (field) =>
                                    field.name === name &&
                                    field.dataTypeID === 20
                            ) && value !== null
                                ? String(value)
                                : value,
                        ])
                    )
                )
            },
            catch: () => new SqlError({ operation: "test_query" }),
        }),
    transaction: (effect) =>
        in_transaction
            ? effect
            : Effect.gen(function* () {
                  yield* Effect.promise(() => pg.exec("BEGIN"))
                  const result = yield* Effect.exit(
                      effect.pipe(Effect.provideService(Sql, make_sql(true)))
                  )
                  yield* Effect.promise(() =>
                      pg.exec(Exit.isSuccess(result) ? "COMMIT" : "ROLLBACK")
                  )
                  if (Exit.isFailure(result))
                      return yield* Effect.failCause(result.cause)
                  return result.value
              }),
})
const repository_layer = () =>
    ShopCatalogRepositoryLive.pipe(
        Layer.provide(Layer.succeed(Sql, make_sql()))
    )
const principal = {
    account_id: "user-1",
    contact_id: null,
    session_id: "session-1",
    domain_id: "domain-1",
}
const run = <A, E>(effect: Effect.Effect<A, E, ShopCatalogRepository>) =>
    Effect.runPromise(effect.pipe(Effect.provide(repository_layer())))
const run_cart = <A, E>(effect: Effect.Effect<A, E, ShopCartRepository>) =>
    Effect.runPromise(
        effect.pipe(
            Effect.provide(
                ShopCartRepositoryLive.pipe(
                    Layer.provide(Layer.succeed(Sql, make_sql()))
                )
            )
        )
    )
const run_order = <A, E>(effect: Effect.Effect<A, E, ShopOrderRepository>) =>
    Effect.runPromise(
        effect.pipe(
            Effect.provide(
                ShopOrderRepositoryLive.pipe(
                    Layer.provide(Layer.succeed(Sql, make_sql()))
                )
            )
        )
    )
const product_fields = {
    name: "Book",
    slug: "book",
    description: null,
    price: 1200,
    inventory: 5,
    image_url: "https://example.com/book.png",
    image_id: null,
    collection_ids: ["collection-1"],
    is_active: true,
    is_featured: false,
}

beforeAll(async () => {
    const base = new URL(
        "../../../packages/database/src/migrations/",
        import.meta.url
    )
    for (const entry of (await readdir(base, { withFileTypes: true }))
        .filter((item) => item.isDirectory())
        .sort((left, right) => left.name.localeCompare(right.name))) {
        await pg.exec(
            await readFile(new URL(`${entry.name}/migration.sql`, base), "utf8")
        )
    }
}, 30_000)
beforeEach(async () => {
    await pg.exec("TRUNCATE organizations,users,contacts CASCADE")
    const future = Date.now() + 60_000
    await pg.exec(`
        INSERT INTO organizations (id,name,slug,kind,max_domains,created_at,updated_at)
        VALUES ('org-1','Org','org','customer',2,1,1);
        INSERT INTO users (id,created_at,updated_at) VALUES ('user-1',1,1);
        INSERT INTO organization_members (id,organization_id,user_id,role,status,created_at,updated_at)
        VALUES ('member-1','org-1','user-1','owner','active',1,1);
        INSERT INTO auth_accounts (id,login_email,created_at,updated_at)
        VALUES ('user-1','user@example.com',1,1);
        INSERT INTO domains (id,organization_id,created_by_user_id,name,slug,publication_status,publication_access,created_at,updated_at)
        VALUES ('domain-1','org-1','user-1','One','one','draft','public',1,1),
               ('domain-2','org-1','user-1','Two','two','draft','public',1,1);
    `)
    await pg.query(
        "INSERT INTO account_sessions (id,account_id,token_hash,created_at,last_seen_at,expires_at,absolute_expires_at) VALUES ('session-1','user-1','token-1',1,1,$1,$1)",
        [future]
    )
})
afterAll(async () => {
    await pg.close()
})

describe("canonical Shop catalog repository", () => {
    it("serves the account Remote query and mutation with scope checks", async () => {
        const handlers = shop_catalog_remote_handlers(principal)
        const query = await run(
            handlers.FoldkitRemoteQuery({
                query: "DomainShopCatalog",
                input: { domain_id: "domain-1" },
                window: {},
            })
        )
        expect(query.edges).toHaveLength(1)
        expect(query.edges[0]?.id).toBe("domain-1")

        const changed = await run(
            handlers.FoldkitRemoteMutate({
                requestId: "create-books",
                mutation: "ChangeShopCatalog",
                input: {
                    domain_id: "domain-1",
                    action: {
                        _tag: "create_collection",
                        id: "collection-1",
                        name: "Books",
                        slug: "books",
                        description: null,
                        image_url: null,
                        is_active: true,
                    },
                },
            })
        )
        expect(changed.output).toMatchObject({
            catalog: { id: "domain-1", collections: [{ id: "collection-1" }] },
        })
        expect(JSON.stringify(changed.entities)).toContain("collection-1")
        const read = await run(
            handlers.FoldkitRemoteRead({
                version: REMOTE_PROTOCOL_VERSION,
                requests: [
                    {
                        entity: "ShopCatalog",
                        id: "domain-1",
                        fields: ["id", "collections"],
                    },
                ],
            })
        )
        expect(JSON.stringify(read)).toContain("collection-1")
        await pg.exec(`
            INSERT INTO product_collections (id,domain_id,name,slug,is_active,created_at,updated_at)
            VALUES ('private-collection','domain-2','Private','private',true,1,1)
        `)
        expect(
            (
                await run(
                    Effect.result(
                        handlers.FoldkitRemoteRead({
                            version: REMOTE_PROTOCOL_VERSION,
                            requests: [
                                {
                                    entity: "ShopCatalog",
                                    id: "domain-2",
                                    fields: ["id", "collections"],
                                },
                            ],
                        })
                    )
                )
            )._tag
        ).toBe("Failure")
        expect(
            (
                await run(
                    Effect.result(
                        handlers.FoldkitRemoteQuery({
                            query: "DomainShopCatalog",
                            input: { domain_id: "domain-2" },
                            window: {},
                        })
                    )
                )
            )._tag
        ).toBe("Failure")
        expect(
            (
                await run(
                    Effect.result(
                        handlers.FoldkitRemoteMutate({
                            requestId: "impersonated-write",
                            mutation: "ChangeShopCatalog",
                            input: {
                                domain_id: "domain-1",
                                account_id: "someone-else",
                                action: {
                                    _tag: "create_collection",
                                    id: "collection-2",
                                    name: "More",
                                    slug: "more",
                                    description: null,
                                    image_url: null,
                                    is_active: true,
                                },
                            },
                        })
                    )
                )
            )._tag
        ).toBe("Failure")
    })

    it("creates and updates domain-owned products, variants, and collections", async () => {
        const catalog = await run(
            Effect.gen(function* () {
                const repository = yield* ShopCatalogRepository
                yield* repository.change_catalog(principal, {
                    _tag: "create_collection",
                    id: "collection-1",
                    name: "Books",
                    slug: "books",
                    description: null,
                    image_url: null,
                    is_active: true,
                })
                return yield* repository.change_catalog(principal, {
                    _tag: "create_product",
                    id: "product-1",
                    variant_id: "variant-1",
                    ...product_fields,
                })
            })
        )
        expect(catalog.products.map((row) => row.id)).toEqual(["product-1"])
        expect(catalog.variants[0]).toMatchObject({
            id: "variant-1",
            stock: 5,
            price: 1200,
        })
        expect(catalog.memberships[0]).toMatchObject({
            product_id: "product-1",
            collection_id: "collection-1",
        })

        const updated = await run(
            Effect.gen(function* () {
                const repository = yield* ShopCatalogRepository
                return yield* repository.change_catalog(principal, {
                    _tag: "update_product",
                    id: "product-1",
                    variant_id: "unused-variant",
                    ...product_fields,
                    price: 1800,
                    inventory: 3,
                    collection_ids: [],
                })
            })
        )
        expect(updated.products[0]?.price).toBe(1800)
        expect(updated.variants[0]).toMatchObject({
            id: "variant-1",
            stock: 3,
            price: 1800,
        })
        expect(updated.memberships).toEqual([])
    })

    it("refuses cross-domain references and unauthorized access", async () => {
        await pg.exec(`
            INSERT INTO product_collections (id,domain_id,name,slug,is_active,created_at,updated_at)
            VALUES ('other-collection','domain-2','Other','other',true,1,1)
        `)
        await expect(
            run(
                Effect.gen(function* () {
                    const repository = yield* ShopCatalogRepository
                    return yield* repository.change_catalog(principal, {
                        _tag: "create_product",
                        id: "product-1",
                        variant_id: "variant-1",
                        ...product_fields,
                        collection_ids: ["other-collection"],
                    })
                })
            )
        ).rejects.toBeDefined()
        const rows = await pg.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM products"
        )
        expect(rows.rows[0]?.count).toBe(0)

        await expect(
            run(
                Effect.gen(function* () {
                    const repository = yield* ShopCatalogRepository
                    return yield* repository.change_catalog(principal, {
                        _tag: "create_product",
                        id: "product-foreign-image",
                        variant_id: "variant-foreign-image",
                        ...product_fields,
                        collection_ids: [],
                        image_url:
                            "/api/uploads/domain-2/shop/00000000-0000-0000-0000-000000000001",
                    })
                })
            )
        ).rejects.toBeDefined()

        await pg.exec(
            "UPDATE organization_members SET role='member' WHERE id='member-1'"
        )
        await expect(
            run(
                Effect.gen(function* () {
                    const repository = yield* ShopCatalogRepository
                    return yield* repository.change_catalog(principal, {
                        _tag: "create_collection",
                        id: "collection-1",
                        name: "Books",
                        slug: "books",
                        description: null,
                        image_url: null,
                        is_active: true,
                    })
                })
            )
        ).rejects.toBeDefined()
        await pg.exec(
            "UPDATE organization_members SET role='owner' WHERE id='member-1'"
        )

        await pg.exec(
            "UPDATE domains SET enabled_modules=ARRAY['Mail']::module_id[] WHERE id='domain-1'"
        )
        await expect(
            run(
                Effect.gen(function* () {
                    const repository = yield* ShopCatalogRepository
                    return yield* repository.load_catalog(principal)
                })
            )
        ).rejects.toBeDefined()
    })
})

describe("canonical Shop cart repository", () => {
    const seed_variant = async (
        domain_id: string,
        suffix: string,
        stock = 5
    ) => {
        await pg.query(
            "INSERT INTO products (id,domain_id,name,slug,description,price,image_url,image_id,is_active,is_featured,created_at,updated_at) VALUES ($1,$2,'Book',$3,NULL,1200,'https://example.com/book.png',NULL,true,false,1,1)",
            [`product-${suffix}`, domain_id, `book-${suffix}`]
        )
        await pg.query(
            "INSERT INTO product_variants (id,domain_id,product_id,name,description,sku,price,currency,stock,is_active,created_at,updated_at) VALUES ($1,$2,$3,'Default',NULL,NULL,1200,'USD',$4,true,1,1)",
            [`variant-${suffix}`, domain_id, `product-${suffix}`, stock]
        )
    }

    it("serves cart and orders through account Remote with domain and session guards", async () => {
        await seed_variant("domain-1", "one")
        const cart_handlers = shop_cart_remote_handlers(principal)
        await expect(
            run_cart(
                cart_handlers.FoldkitRemoteMutate({
                    requestId: "wrong-domain",
                    mutation: "ChangeShopCart",
                    input: {
                        domain_id: "domain-2",
                        action: {
                            _tag: "add_item",
                            session_id: "shop-admin-preview",
                            variant_id: "variant-one",
                            quantity: 1,
                        },
                    },
                })
            )
        ).rejects.toBeDefined()
        await expect(
            run_cart(
                cart_handlers.FoldkitRemoteMutate({
                    requestId: "wrong-session",
                    mutation: "ChangeShopCart",
                    input: {
                        domain_id: "domain-1",
                        action: {
                            _tag: "add_item",
                            session_id: "customer-session",
                            variant_id: "variant-one",
                            quantity: 1,
                        },
                    },
                })
            )
        ).rejects.toBeDefined()
        const changed = await run_cart(
            cart_handlers.FoldkitRemoteMutate({
                requestId: "add-admin-item",
                mutation: "ChangeShopCart",
                input: {
                    domain_id: "domain-1",
                    account_id: "user-1",
                    action: {
                        _tag: "add_item",
                        session_id: "shop-admin-preview",
                        variant_id: "variant-one",
                        quantity: 1,
                    },
                },
            })
        )
        expect(changed.output).toMatchObject({
            state: { id: "domain-1", snapshot: { item_count: 1 } },
        })
        const read = await run_cart(
            cart_handlers.FoldkitRemoteRead({
                version: REMOTE_PROTOCOL_VERSION,
                requests: [
                    {
                        entity: "ShopCartState",
                        id: "domain-1",
                        fields: ["id", "snapshot"],
                    },
                ],
            })
        )
        expect(JSON.stringify(read)).toContain("variant-one")
        const order_handlers = shop_order_remote_handlers(principal)
        const list = await run_order(
            order_handlers.FoldkitRemoteQuery({
                query: "DomainShopOrders",
                input: { domain_id: "domain-1" },
                window: {},
            })
        )
        expect(list.edges).toHaveLength(1)
        await expect(
            run_order(
                order_handlers.FoldkitRemoteQuery({
                    query: "DomainShopOrders",
                    input: { domain_id: "domain-2" },
                    window: {},
                })
            )
        ).rejects.toBeDefined()
    })

    it("blocks disabled Shop reads and read-only cart writes", async () => {
        const cart_handlers = shop_cart_remote_handlers(principal)
        const order_handlers = shop_order_remote_handlers(principal)
        await pg.exec(
            "UPDATE domains SET enabled_modules=ARRAY['Mail']::module_id[] WHERE id='domain-1'"
        )
        await expect(
            run_cart(
                cart_handlers.FoldkitRemoteQuery({
                    query: "DomainShopCart",
                    input: { domain_id: "domain-1" },
                    window: {},
                })
            )
        ).rejects.toBeDefined()
        await expect(
            run_order(
                order_handlers.FoldkitRemoteQuery({
                    query: "DomainShopOrders",
                    input: { domain_id: "domain-1" },
                    window: {},
                })
            )
        ).rejects.toBeDefined()
        await pg.exec(
            "UPDATE domains SET enabled_modules=ARRAY['Shop']::module_id[] WHERE id='domain-1'"
        )
        await pg.exec(
            "UPDATE organization_members SET role='member' WHERE id='member-1'"
        )
        const read = await run_cart(
            cart_handlers.FoldkitRemoteQuery({
                query: "DomainShopCart",
                input: { domain_id: "domain-1" },
                window: {},
            })
        )
        expect(read.edges).toHaveLength(1)
        await expect(
            run_cart(
                cart_handlers.FoldkitRemoteMutate({
                    requestId: "read-only-write",
                    mutation: "ChangeShopCart",
                    input: {
                        domain_id: "domain-1",
                        action: {
                            _tag: "clear",
                            session_id: "shop-admin-preview",
                        },
                    },
                })
            )
        ).rejects.toBeDefined()
    })

    it("adds, updates, removes, and clears snapshot cart lines", async () => {
        await seed_variant("domain-1", "one")
        const added = await run_cart(
            Effect.gen(function* () {
                const repository = yield* ShopCartRepository
                return yield* repository.change_cart(principal, {
                    _tag: "add_item",
                    session_id: "admin-cart",
                    variant_id: "variant-one",
                    quantity: 2,
                })
            })
        )
        expect(added).toMatchObject({ item_count: 2, total_price: 2400 })
        expect(added?.items[0]).toMatchObject({
            product_name: "Book",
            product_price: 1200,
            quantity: 2,
        })
        const item_id = added?.items[0]?.id
        if (item_id === undefined) throw new Error("Cart item was not created")
        const updated = await run_cart(
            Effect.gen(function* () {
                const repository = yield* ShopCartRepository
                return yield* repository.change_cart(principal, {
                    _tag: "update_item",
                    session_id: "admin-cart",
                    item_id,
                    quantity: 3,
                })
            })
        )
        expect(updated).toMatchObject({ item_count: 3, total_price: 3600 })
        const removed = await run_cart(
            Effect.gen(function* () {
                const repository = yield* ShopCartRepository
                return yield* repository.change_cart(principal, {
                    _tag: "remove_item",
                    session_id: "admin-cart",
                    item_id,
                })
            })
        )
        expect(removed).toMatchObject({ item_count: 0, total_price: 0 })
        const cleared = await run_cart(
            Effect.gen(function* () {
                const repository = yield* ShopCartRepository
                return yield* repository.change_cart(principal, {
                    _tag: "clear",
                    session_id: "admin-cart",
                })
            })
        )
        expect(cleared?.items).toEqual([])
    })

    it("rolls back unavailable and foreign-domain variant additions", async () => {
        await seed_variant("domain-1", "one", 1)
        await seed_variant("domain-2", "two", 5)
        const repository = await Effect.runPromise(
            ShopCartRepository.pipe(
                Effect.provide(
                    ShopCartRepositoryLive.pipe(
                        Layer.provide(Layer.succeed(Sql, make_sql()))
                    )
                )
            )
        )
        await expect(
            run_cart(
                repository.change_cart(principal, {
                    _tag: "add_item",
                    session_id: "admin-cart",
                    variant_id: "variant-two",
                    quantity: 1,
                })
            )
        ).rejects.toBeDefined()
        await expect(
            run_cart(
                repository.change_cart(principal, {
                    _tag: "add_item",
                    session_id: "admin-cart",
                    variant_id: "variant-one",
                    quantity: 2,
                })
            )
        ).rejects.toBeDefined()
        expect(
            (
                await pg.query<{ count: number }>(
                    "SELECT count(*)::int AS count FROM carts"
                )
            ).rows[0]?.count
        ).toBe(0)
    })

    it("keeps legacy options and notes while checkout includes only selected lines", async () => {
        await seed_variant("domain-1", "one")
        await seed_variant("domain-1", "two")
        await pg.exec("UPDATE products SET discount=100 WHERE id='product-one'")
        await pg.exec(
            "UPDATE product_variants SET price_override=1500,options='{\"binding\":\"hardback\"}' WHERE id='variant-one'"
        )
        const first = await run_cart(
            Effect.gen(function* () {
                const repository = yield* ShopCartRepository
                return yield* repository.change_cart(principal, {
                    _tag: "add_item",
                    session_id: "admin-cart",
                    variant_id: "variant-one",
                    quantity: 1,
                })
            })
        )
        expect(first?.items[0]).toMatchObject({
            product_price: 1400,
            variant_options: { binding: "hardback" },
        })
        const second = await run_cart(
            Effect.gen(function* () {
                const repository = yield* ShopCartRepository
                return yield* repository.change_cart(principal, {
                    _tag: "add_item",
                    session_id: "admin-cart",
                    variant_id: "variant-two",
                    quantity: 1,
                })
            })
        )
        const item_id = second?.items.find(
            (item) => item.variant_id === "variant-two"
        )?.id
        if (item_id === undefined) throw new Error("Second item missing")
        await run_cart(
            Effect.gen(function* () {
                const repository = yield* ShopCartRepository
                return yield* repository.change_cart(principal, {
                    _tag: "set_item_note",
                    session_id: "admin-cart",
                    item_id,
                    note: "Hold for later",
                })
            })
        )
        const selected = await run_cart(
            Effect.gen(function* () {
                const repository = yield* ShopCartRepository
                return yield* repository.change_cart(principal, {
                    _tag: "set_item_selected",
                    session_id: "admin-cart",
                    item_id,
                    is_selected: false,
                })
            })
        )
        expect(selected).toMatchObject({ item_count: 2, total_price: 1400 })
        expect(
            selected?.items.find((item) => item.id === item_id)
        ).toMatchObject({
            note: "Hold for later",
            is_selected: false,
        })
        if (selected === null) throw new Error("Cart missing")
        const input = Schema.decodeUnknownSync(ShopCheckoutInput)({
            session_id: "admin-cart",
            checkout_key: `${selected.cart.id}:${selected.cart.updated_at}`,
            email: "buyer@example.com",
            shipping_address: {
                firstName: "Ada",
                lastName: "Lovelace",
                line1: "1 Main St",
                city: "London",
                province: "London",
                country: "GB",
                postal: "SW1A 1AA",
            },
        })
        const order = await run_order(
            Effect.gen(function* () {
                const repository = yield* ShopOrderRepository
                return yield* repository.create_pending_order(principal, input)
            })
        )
        expect(order.order.total_price).toBe(1400)
        expect(order.items).toMatchObject([
            { variant_options: { binding: "hardback" }, product_price: 1400 },
        ])
        const remaining = await run_cart(
            Effect.gen(function* () {
                const repository = yield* ShopCartRepository
                return yield* repository.load_cart(principal, "admin-cart")
            })
        )
        expect(remaining?.items).toMatchObject([
            { variant_id: "variant-two", note: "Hold for later" },
        ])
    })

    it("creates one pending order with immutable line snapshots and an idempotent key", async () => {
        await seed_variant("domain-1", "one")
        const cart = await run_cart(
            Effect.gen(function* () {
                const repository = yield* ShopCartRepository
                return yield* repository.change_cart(principal, {
                    _tag: "add_item",
                    session_id: "admin-cart",
                    variant_id: "variant-one",
                    quantity: 2,
                })
            })
        )
        if (cart === null) throw new Error("Cart was not created")
        const input = Schema.decodeUnknownSync(ShopCheckoutInput)({
            session_id: "admin-cart",
            checkout_key: `${cart.cart.id}:${cart.cart.updated_at}`,
            email: "buyer@example.com",
            shipping_address: {
                firstName: "Ada",
                lastName: "Lovelace",
                line1: "1 Main St",
                city: "London",
                province: "London",
                country: "GB",
                postal: "SW1A 1AA",
            },
        })
        const order = await run_order(
            Effect.gen(function* () {
                const repository = yield* ShopOrderRepository
                return yield* repository.create_pending_order(principal, input)
            })
        )
        expect(order.order).toMatchObject({
            status: "pending",
            total_price: 2400,
            checkout_key: input.checkout_key,
        })
        expect(order.items[0]).toMatchObject({
            product_name: "Book",
            product_price: 1200,
            quantity: 2,
        })
        expect(
            (
                await pg.query<{ count: number }>(
                    "SELECT count(*)::int AS count FROM cart_items"
                )
            ).rows[0]?.count
        ).toBe(0)
        await pg.exec(
            "UPDATE products SET name='Renamed' WHERE id='product-one'"
        )
        const replay = await run_order(
            Effect.gen(function* () {
                const repository = yield* ShopOrderRepository
                return yield* repository.create_pending_order(principal, input)
            })
        )
        expect(replay.order.id).toBe(order.order.id)
        expect(replay.items[0]?.product_name).toBe("Book")
        const orders = await run_order(
            Effect.gen(function* () {
                const repository = yield* ShopOrderRepository
                return yield* repository.list_orders(principal)
            })
        )
        expect(orders).toHaveLength(1)
    })

    it("rejects stale checkout keys and reduced stock without creating an order", async () => {
        await seed_variant("domain-1", "one")
        const cart = await run_cart(
            Effect.gen(function* () {
                const repository = yield* ShopCartRepository
                return yield* repository.change_cart(principal, {
                    _tag: "add_item",
                    session_id: "admin-cart",
                    variant_id: "variant-one",
                    quantity: 2,
                })
            })
        )
        if (cart === null) throw new Error("Cart was not created")
        const input = Schema.decodeUnknownSync(ShopCheckoutInput)({
            session_id: "admin-cart",
            checkout_key: `${cart.cart.id}:${cart.cart.updated_at}`,
            email: "buyer@example.com",
            shipping_address: {
                firstName: "Ada",
                lastName: "Lovelace",
                line1: "1 Main St",
                city: "London",
                province: "London",
                country: "GB",
                postal: "SW1A 1AA",
            },
        })
        const item_id = cart.items[0]?.id
        if (item_id === undefined) throw new Error("Cart item was not created")
        const revised_cart = await run_cart(
            Effect.gen(function* () {
                const repository = yield* ShopCartRepository
                return yield* repository.change_cart(principal, {
                    _tag: "update_item",
                    session_id: "admin-cart",
                    item_id,
                    quantity: 3,
                })
            })
        )
        if (revised_cart === null) throw new Error("Cart disappeared")
        expect(revised_cart.cart.updated_at).toBeGreaterThan(
            cart.cart.updated_at
        )
        await expect(
            run_order(
                Effect.gen(function* () {
                    const repository = yield* ShopOrderRepository
                    return yield* repository.create_pending_order(
                        principal,
                        input
                    )
                })
            )
        ).rejects.toBeDefined()
        await pg.exec(
            "UPDATE product_variants SET stock=1 WHERE id='variant-one'"
        )
        await expect(
            run_order(
                Effect.gen(function* () {
                    const repository = yield* ShopOrderRepository
                    return yield* repository.create_pending_order(
                        principal,
                        Schema.decodeUnknownSync(ShopCheckoutInput)({
                            ...input,
                            checkout_key: `${revised_cart.cart.id}:${revised_cart.cart.updated_at}`,
                        })
                    )
                })
            )
        ).rejects.toBeDefined()
        expect(
            (
                await pg.query<{ count: number }>(
                    "SELECT count(*)::int AS count FROM orders"
                )
            ).rows[0]?.count
        ).toBe(0)
    })
})
