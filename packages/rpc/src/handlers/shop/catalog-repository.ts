import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows, type SqlService } from "@urm/database/sql"
import {
    ShopCatalogAction,
    ShopCatalogError,
    ShopCollection,
    ShopMembership,
    ShopProduct,
    ShopVariant,
} from "@urm/domain/shop"

export interface ShopCatalogPrincipal extends AccountPrincipal {
    readonly domain_id: string
}

const Id = Schema.Struct({ id: Schema.String })
const unavailable = () =>
    new ShopCatalogError({
        message: "Shop catalog unavailable, changed, or access denied",
    })

const authorize_shop = Effect.fn("Shop.authorize")(function* (
    principal: ShopCatalogPrincipal,
    write = false
) {
    yield* require_account_domain(principal, principal.domain_id, write, "Shop")
})

const load_catalog = Effect.fn("Shop.loadCatalog")(function* (
    principal: ShopCatalogPrincipal
) {
    yield* authorize_shop(principal)
    const domain_id = principal.domain_id
    const products = yield* query_rows(
        ShopProduct,
        sql`SELECT id,domain_id,name,slug,description,price,image_url,image_id,is_active,is_featured,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM products WHERE domain_id=${domain_id} ORDER BY updated_at DESC,id LIMIT 101`
    )
    const variants = yield* query_rows(
        ShopVariant,
        sql`SELECT id,domain_id,product_id,name,description,sku,price,currency,stock,is_active,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM product_variants WHERE domain_id=${domain_id} ORDER BY updated_at DESC,id LIMIT 301`
    )
    const collections = yield* query_rows(
        ShopCollection,
        sql`SELECT id,domain_id,name,slug,description,image_url,is_active,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM product_collections WHERE domain_id=${domain_id} ORDER BY updated_at DESC,id LIMIT 101`
    )
    const memberships = yield* query_rows(
        ShopMembership,
        sql`SELECT id,domain_id,product_id,collection_id,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM product_collection_memberships WHERE domain_id=${domain_id} ORDER BY updated_at DESC,id LIMIT 501`
    )
    if (
        products.length > 100 ||
        variants.length > 300 ||
        collections.length > 100 ||
        memberships.length > 500
    )
        return yield* Effect.fail(unavailable())
    return { id: domain_id, products, variants, collections, memberships }
})

const change_catalog = Effect.fn("Shop.changeCatalog")(function* (
    principal: ShopCatalogPrincipal,
    input: ShopCatalogAction
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const domain_id = principal.domain_id
            const owner = yield* query_rows(
                Id,
                sql`SELECT id FROM domains WHERE id=${domain_id} FOR UPDATE`
            )
            if (owner.length !== 1) return yield* Effect.fail(unavailable())
            yield* authorize_shop(principal, true)
            const action =
                yield* Schema.decodeUnknownEffect(ShopCatalogAction)(input)
            const current = yield* load_catalog(principal)
            const now = Date.now()

            if (
                action._tag === "create_collection" ||
                action._tag === "update_collection"
            ) {
                const existing = current.collections.find(
                    (row) => row.id === action.id
                )
                if (
                    current.collections.some(
                        (row) =>
                            row.slug === action.slug && row.id !== action.id
                    ) ||
                    (action._tag === "create_collection" &&
                        (existing !== undefined ||
                            current.collections.length >= 100)) ||
                    (action._tag === "update_collection" &&
                        existing === undefined)
                )
                    return yield* Effect.fail(unavailable())
                if (action._tag === "create_collection")
                    yield* tx.query(
                        sql`INSERT INTO product_collections (id,domain_id,name,slug,description,image_url,is_active,created_at,updated_at) VALUES (${action.id},${domain_id},${action.name},${action.slug},${action.description},${action.image_url},${action.is_active},${now},${now})`
                    )
                else
                    yield* tx.query(
                        sql`UPDATE product_collections SET name=${action.name},slug=${action.slug},description=${action.description},image_url=${action.image_url},is_active=${action.is_active},updated_at=${now} WHERE id=${action.id} AND domain_id=${domain_id}`
                    )
            } else if (action._tag === "set_product_collections") {
                const product = current.products.find(
                    (row) => row.id === action.product_id
                )
                if (product === undefined)
                    return yield* Effect.fail(unavailable())
                yield* replace_memberships(
                    tx,
                    current,
                    domain_id,
                    action.product_id,
                    action.collection_ids,
                    now
                )
            } else {
                const existing = current.products.find(
                    (row) => row.id === action.id
                )
                if (
                    current.products.some(
                        (row) =>
                            row.slug === action.slug && row.id !== action.id
                    ) ||
                    (action._tag === "create_product" &&
                        (existing !== undefined ||
                            current.products.length >= 100 ||
                            current.variants.length >= 300)) ||
                    (action._tag === "update_product" && existing === undefined)
                )
                    return yield* Effect.fail(unavailable())
                if (action.image_url.startsWith("/api/uploads/")) {
                    const prefix = `/api/uploads/${encodeURIComponent(domain_id)}/`
                    if (
                        !action.image_url.startsWith(prefix) ||
                        !/^(shop|media)\/[0-9a-f-]{36}$/.test(
                            action.image_url.slice(prefix.length)
                        )
                    )
                        return yield* Effect.fail(unavailable())
                }
                if (action.image_id !== null) {
                    const image = yield* query_rows(
                        Id,
                        sql`SELECT id FROM images WHERE id=${action.image_id} AND domain_id=${domain_id} LIMIT 1`
                    )
                    if (image.length !== 1)
                        return yield* Effect.fail(unavailable())
                }
                if (action._tag === "create_product") {
                    yield* tx.query(
                        sql`INSERT INTO products (id,domain_id,name,slug,description,price,image_url,image_id,is_active,is_featured,created_at,updated_at) VALUES (${action.id},${domain_id},${action.name},${action.slug},${action.description},${action.price},${action.image_url},${action.image_id},${action.is_active},${action.is_featured},${now},${now})`
                    )
                    yield* tx.query(
                        sql`INSERT INTO product_variants (id,domain_id,product_id,name,description,sku,price,currency,stock,is_active,created_at,updated_at) VALUES (${action.variant_id},${domain_id},${action.id},'Default',NULL,NULL,${action.price},'USD',${action.inventory},${action.is_active},${now},${now})`
                    )
                } else {
                    yield* tx.query(
                        sql`UPDATE products SET name=${action.name},slug=${action.slug},description=${action.description},price=${action.price},image_url=${action.image_url},image_id=${action.image_id},is_active=${action.is_active},is_featured=${action.is_featured},updated_at=${now} WHERE id=${action.id} AND domain_id=${domain_id}`
                    )
                    const default_variant = current.variants.find(
                        (row) =>
                            row.product_id === action.id &&
                            row.name === "Default"
                    )
                    if (default_variant === undefined) {
                        if (current.variants.length >= 300)
                            return yield* Effect.fail(unavailable())
                        yield* tx.query(
                            sql`INSERT INTO product_variants (id,domain_id,product_id,name,description,sku,price,currency,stock,is_active,created_at,updated_at) VALUES (${action.variant_id},${domain_id},${action.id},'Default',NULL,NULL,${action.price},'USD',${action.inventory},${action.is_active},${now},${now})`
                        )
                    } else
                        yield* tx.query(
                            sql`UPDATE product_variants SET price=${action.price},stock=${action.inventory},is_active=${action.is_active},updated_at=${now} WHERE id=${default_variant.id} AND domain_id=${domain_id} AND product_id=${action.id}`
                        )
                }
                yield* replace_memberships(
                    tx,
                    current,
                    domain_id,
                    action.id,
                    action.collection_ids,
                    now
                )
            }
            return yield* load_catalog(principal)
        })
    )
})

const replace_memberships = Effect.fn("Shop.replaceMemberships")(function* (
    tx: SqlService,
    current: Effect.Success<ReturnType<typeof load_catalog>>,
    domain_id: string,
    product_id: string,
    collection_ids: ReadonlyArray<string>,
    now: number
) {
    const unique_ids = [...new Set(collection_ids)]
    const existing_count = current.memberships.filter(
        (row) => row.product_id === product_id
    ).length
    if (
        unique_ids.length > 100 ||
        current.memberships.length - existing_count + unique_ids.length > 500 ||
        unique_ids.some(
            (id) =>
                !current.collections.some((collection) => collection.id === id)
        )
    )
        return yield* Effect.fail(unavailable())
    yield* tx.query(
        sql`DELETE FROM product_collection_memberships WHERE domain_id=${domain_id} AND product_id=${product_id}`
    )
    yield* Effect.forEach(unique_ids, (collection_id) =>
        tx.query(
            sql`INSERT INTO product_collection_memberships (id,domain_id,product_id,collection_id,created_at,updated_at) VALUES (${randomUUID()},${domain_id},${product_id},${collection_id},${now},${now})`
        )
    )
})

const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        authorize_shop: (principal: ShopCatalogPrincipal, write = false) =>
            authorize_shop(principal, write).pipe(
                Effect.provideService(Sql, db)
            ),
        load_catalog: (principal: ShopCatalogPrincipal) =>
            load_catalog(principal).pipe(Effect.provideService(Sql, db)),
        change_catalog: (
            principal: ShopCatalogPrincipal,
            action: ShopCatalogAction
        ) =>
            change_catalog(principal, action).pipe(
                Effect.provideService(Sql, db)
            ),
    }
})

export class ShopCatalogRepository extends Context.Service<
    ShopCatalogRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/ShopCatalogRepository") {}
export const ShopCatalogRepositoryLive = Layer.effect(
    ShopCatalogRepository,
    make
)
