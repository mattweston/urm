/** # Authorized logo drafts and cross-workspace catalog */
import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/database/sql"
import {
    LogoDraftCatalog,
    LogoDraftDetail,
    LogoDraftError,
    LogoDraftRecord,
    LogoDraftSummary,
    SaveLogoDraftInput,
} from "@urm/domain/logo-drafts"

export interface LogoDraftPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const Domain = Schema.Struct({ organization_id: Schema.String })
const denied = (message = "Logo draft unavailable or access denied") =>
    new LogoDraftError({ message })
const organization = Effect.fn("LogoDrafts.organization")(function* (
    principal: LogoDraftPrincipal,
    write: boolean
) {
    yield* require_account_domain(principal, principal.domain_id, write, null)
    const domains = yield* query_rows(
        Domain,
        sql`SELECT organization_id FROM domains WHERE id=${principal.domain_id}`
    )
    if (!domains[0]) return yield* Effect.fail(denied())
    return domains[0].organization_id
})
const load_detail = Effect.fn("LogoDrafts.loadDetail")(function* (
    principal: LogoDraftPrincipal
) {
    yield* organization(principal, false)
    const rows = yield* query_rows(
        LogoDraftRecord,
        sql`SELECT id,domain_id,organization_id,name,scene,revision,created_by_user_id,updated_by_user_id,created_at::float8 AS created_at,updated_at::float8 AS updated_at
            FROM logos WHERE domain_id=${principal.domain_id} ORDER BY updated_at DESC,id LIMIT 1`
    )
    return LogoDraftDetail.make({
        id: principal.domain_id,
        logo: rows[0] ?? null,
    })
})
/**
 * Lists reusable logos only from organizations the caller can currently access.
 * Authorization for the selected workspace does not cover other catalog rows;
 * each joined membership and organization must still be active and undeleted.
 */
const load_catalog = Effect.fn("LogoDrafts.loadCatalog")(function* (
    principal: LogoDraftPrincipal
) {
    yield* organization(principal, false)
    const drafts = yield* query_rows(
        LogoDraftSummary,
        sql`SELECT DISTINCT ON (d.id) d.id AS domain_id,d.slug,l.scene
            FROM domains d
            JOIN organizations o ON o.id=d.organization_id AND o.deleted_at IS NULL
            JOIN organization_members m ON m.organization_id=d.organization_id AND m.user_id=${principal.account_id} AND m.status='active' AND m.deleted_at IS NULL
            JOIN logos l ON l.domain_id=d.id
            ORDER BY d.id,l.updated_at DESC,l.id DESC`
    )
    return LogoDraftCatalog.make({
        id: `${principal.account_id}/${principal.domain_id}`,
        domain_id: principal.domain_id,
        drafts,
    })
})
const save = Effect.fn("LogoDrafts.save")(function* (
    principal: LogoDraftPrincipal,
    draft: typeof SaveLogoDraftInput.Type
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const organization_id = yield* organization(principal, true)
            const tx = yield* Sql
            const scene = JSON.stringify(draft.scene)
            const now = Date.now()
            if (draft.logo_id === null) {
                if (draft.expected_revision !== 0)
                    return yield* Effect.fail(
                        denied("A new logo must start at revision zero")
                    )
                yield* tx.query(
                    sql`INSERT INTO logos (id,domain_id,organization_id,name,scene,revision,created_by_user_id,updated_by_user_id,created_at,updated_at)
                        VALUES (${randomUUID()},${principal.domain_id},${organization_id},${draft.name},${scene}::jsonb,1,${principal.account_id},${principal.account_id},${now},${now})`
                )
            } else {
                const rows = yield* query_rows(
                    LogoDraftRecord,
                    sql`SELECT id,domain_id,organization_id,name,scene,revision,created_by_user_id,updated_by_user_id,created_at::float8 AS created_at,updated_at::float8 AS updated_at
                        FROM logos WHERE id=${draft.logo_id} AND organization_id=${organization_id} AND (domain_id IS NULL OR domain_id=${principal.domain_id}) FOR UPDATE`
                )
                const previous = rows[0]
                if (!previous) return yield* Effect.fail(denied())
                if (previous.revision !== draft.expected_revision)
                    return yield* Effect.fail(
                        denied(
                            "This logo draft changed elsewhere; reload before saving"
                        )
                    )
                yield* tx.query(
                    sql`UPDATE logos SET domain_id=${principal.domain_id},name=${draft.name},scene=${scene}::jsonb,revision=${previous.revision + 1},updated_by_user_id=${principal.account_id},updated_at=${now} WHERE id=${previous.id} AND organization_id=${organization_id}`
                )
            }
            return {
                detail: yield* load_detail(principal),
                catalog: yield* load_catalog(principal),
            }
        })
    )
})
const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        load_detail: (principal: LogoDraftPrincipal) =>
            load_detail(principal).pipe(Effect.provideService(Sql, db)),
        load_catalog: (principal: LogoDraftPrincipal) =>
            load_catalog(principal).pipe(Effect.provideService(Sql, db)),
        save: (
            principal: LogoDraftPrincipal,
            draft: typeof SaveLogoDraftInput.Type
        ) => save(principal, draft).pipe(Effect.provideService(Sql, db)),
    }
})
export class LogoDraftRepository extends Context.Service<
    LogoDraftRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/LogoDraftRepository") {}
export const LogoDraftRepositoryLive = Layer.effect(LogoDraftRepository, make)
