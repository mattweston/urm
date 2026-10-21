import { Context, Effect, Layer, Schema } from "effect"
import { sql } from "drizzle-orm"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/database/sql"
import {
    SubdomainRecord,
    SubdomainAction,
    SubdomainError,
} from "@urm/domain/subdomains"
export interface SubdomainsPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const denied = () =>
    new SubdomainError({
        message: "Subdomain unavailable, changed or access denied.",
    })
const authorize_subdomains = Effect.fn("Subdomains.authorize")(function* (
    principal: SubdomainsPrincipal,
    domain_id: string,
    write = false
) {
    if (domain_id !== principal.domain_id) return yield* Effect.fail(denied())
    yield* require_account_domain(principal, domain_id, write, null)
})
const load_catalog = Effect.fn("Subdomains.load")(function* (
    principal: SubdomainsPrincipal
) {
    yield* authorize_subdomains(principal, principal.domain_id)
    const subdomains = yield* query_rows(
        SubdomainRecord,
        sql`SELECT id,domain_id,name,slug,kind,status,access,expires_at::float8 AS expires_at,updated_at::float8 AS updated_at FROM subdomains WHERE domain_id=${principal.domain_id} ORDER BY updated_at DESC,id LIMIT 101`
    )
    if (subdomains.length > 100)
        return yield* Effect.fail(
            new SubdomainError({
                message: "This workspace supports up to 100 subdomains.",
            })
        )
    return { id: principal.domain_id, subdomains }
})
const change_subdomains = Effect.fn("Subdomains.change")(function* (
    principal: SubdomainsPrincipal,
    input: SubdomainAction
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const d = principal.domain_id
            yield* tx.query(
                sql`SELECT id FROM domains WHERE id=${d} FOR UPDATE`
            )
            yield* authorize_subdomains(principal, d, true)
            const action =
                yield* Schema.decodeUnknownEffect(SubdomainAction)(input)
            const current = yield* load_catalog(principal)
            const existing = current.subdomains.find(
                (row) => row.id === action.id
            )
            if (action._tag !== "create" && existing === undefined)
                return yield* Effect.fail(denied())
            if (action._tag !== "delete") {
                if (
                    [
                        "www",
                        "dev",
                        "staging",
                        "prod",
                        "app",
                        "mail",
                        "newsletter",
                    ].includes(action.slug) ||
                    current.subdomains.some(
                        (row) =>
                            row.id !== action.id && row.slug === action.slug
                    )
                )
                    return yield* Effect.fail(
                        new SubdomainError({
                            message:
                                "This subdomain slug is reserved or already in use.",
                        })
                    )
            }
            if (action._tag === "create") {
                if (existing !== undefined || current.subdomains.length >= 100)
                    return yield* Effect.fail(denied())
                const now = Date.now()
                yield* tx.query(
                    sql`INSERT INTO subdomains (id,domain_id,name,slug,kind,status,access,expires_at,created_at,updated_at) VALUES (${action.id},${d},${action.name},${action.slug},${action.kind},${action.status},${action.access},${action.expires_at},${now},${now})`
                )
            } else if (action._tag === "update") {
                const history = yield* tx.query(
                    sql`SELECT id FROM publication_deployment_jobs WHERE domain_id=${d} AND subdomain_id=${action.id} LIMIT 1`
                )
                if (
                    history.length > 0 &&
                    existing !== undefined &&
                    (existing.slug !== action.slug ||
                        existing.status !== action.status ||
                        existing.access !== action.access ||
                        existing.expires_at !== action.expires_at)
                )
                    return yield* Effect.fail(
                        new SubdomainError({
                            message:
                                "This site has deployment history. Hostname, status, access and expiry changes require a provider migration first.",
                        })
                    )
                yield* tx.query(
                    sql`UPDATE subdomains SET name=${action.name},slug=${action.slug},kind=${action.kind},status=${action.status},access=${action.access},expires_at=${action.expires_at},updated_at=${Date.now()} WHERE id=${action.id} AND domain_id=${d}`
                )
            } else {
                const dependencies = yield* tx.query(
                    sql`SELECT id FROM pages WHERE domain_id=${d} AND subdomain_id=${action.id} UNION ALL SELECT id FROM publication_blog_posts WHERE domain_id=${d} AND subdomain_id=${action.id} UNION ALL SELECT id FROM publication_releases WHERE domain_id=${d} AND subdomain_id=${action.id} UNION ALL SELECT id FROM publication_deployment_jobs WHERE domain_id=${d} AND subdomain_id=${action.id} UNION ALL SELECT id FROM publication_configurations WHERE domain_id=${d} AND subdomain_id=${action.id} LIMIT 1`
                )
                if (dependencies.length > 0)
                    return yield* Effect.fail(
                        new SubdomainError({
                            message:
                                "Move or remove this site's content and deployment dependencies before deleting it.",
                        })
                    )
                yield* tx.query(
                    sql`DELETE FROM subdomains WHERE domain_id=${d} AND id=${action.id}`
                )
            }
            return yield* load_catalog(principal)
        })
    )
})
const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        authorize_subdomains: (
            ...args: Parameters<typeof authorize_subdomains>
        ) => authorize_subdomains(...args).pipe(Effect.provideService(Sql, db)),
        load_catalog: (...args: Parameters<typeof load_catalog>) =>
            load_catalog(...args).pipe(Effect.provideService(Sql, db)),
        change_subdomains: (...args: Parameters<typeof change_subdomains>) =>
            change_subdomains(...args).pipe(Effect.provideService(Sql, db)),
    }
})
export class SubdomainsRepository extends Context.Service<
    SubdomainsRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/SubdomainsRepository") {}
export const SubdomainsRepositoryLive = Layer.effect(SubdomainsRepository, make)
