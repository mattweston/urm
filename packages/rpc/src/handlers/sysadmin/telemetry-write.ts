import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { Sql, query_rows } from "@urm/database/sql"
import type { AccountPrincipal } from "@urm/auth"

interface Principal extends AccountPrincipal {
    readonly domain_id: string
}
const Domain = Schema.Struct({ organization_id: Schema.String })

const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        record_query: (
            principal: Principal,
            query: string,
            started_at: number
        ) =>
            Effect.gen(function* () {
                const rows = yield* query_rows(
                    Domain,
                    sql`SELECT organization_id FROM domains
                        WHERE id=${principal.domain_id} LIMIT 1`
                )
                const organization_id = rows[0]?.organization_id
                if (organization_id === undefined) return
                const created_at = Date.now()
                const trace_id = randomUUID().replaceAll("-", "")
                const span_id = randomUUID().replaceAll("-", "").slice(0, 16)
                yield* db.transaction(
                    Effect.gen(function* () {
                        const transaction = yield* Sql
                        yield* transaction.query(
                            sql`INSERT INTO observability_spans
                                (id,organization_id,domain_id,actor_user_id,span_id,
                                    trace_id,name,kind,status,started_at,ended_at,
                                    attributes,created_at)
                                VALUES (${randomUUID()},${organization_id},${principal.domain_id},
                                    ${principal.account_id},${span_id},${trace_id},${query},
                                    'server','ok',${started_at},${created_at},'{}'::jsonb,
                                    ${created_at})`
                        )
                        yield* transaction.query(
                            sql`INSERT INTO observability_logs
                                (id,organization_id,domain_id,actor_user_id,
                                    level,message,source,trace_id,span_id,
                                    session_id,metadata,created_at)
                                VALUES (${randomUUID()},${organization_id},${principal.domain_id},
                                    ${principal.account_id},'info',
                                    ${`Remote query ${query} succeeded`},
                                    'account_remote',${trace_id},${span_id},
                                    ${principal.session_id},'{}'::jsonb,${created_at})`
                        )
                    })
                )
            }).pipe(Effect.provideService(Sql, db)),
        record_success: (
            principal: Principal,
            action: string,
            started_at: number
        ) =>
            Effect.gen(function* () {
                const rows = yield* query_rows(
                    Domain,
                    sql`SELECT organization_id FROM domains
                        WHERE id=${principal.domain_id} LIMIT 1`
                )
                const organization_id = rows[0]?.organization_id
                if (organization_id === undefined) return
                const created_at = Date.now()
                const trace_id = randomUUID().replaceAll("-", "")
                const span_id = randomUUID().replaceAll("-", "").slice(0, 16)
                yield* db.transaction(
                    Effect.gen(function* () {
                        const transaction = yield* Sql
                        yield* transaction.query(
                            sql`INSERT INTO audit_events
                                (id,organization_id,domain_id,actor_user_id,action,
                                    entity_type,result,trace_id,metadata,created_at)
                                VALUES (${randomUUID()},${organization_id},${principal.domain_id},
                                    ${principal.account_id},${action},'remote_mutation',
                                    'succeeded',${trace_id},'{}'::jsonb,${created_at})`
                        )
                        yield* transaction.query(
                            sql`INSERT INTO observability_spans
                                (id,organization_id,domain_id,actor_user_id,span_id,
                                    trace_id,name,kind,status,started_at,ended_at,
                                    attributes,created_at)
                                VALUES (${randomUUID()},${organization_id},${principal.domain_id},
                                    ${principal.account_id},${span_id},${trace_id},${action},
                                    'server','ok',${started_at},${created_at},'{}'::jsonb,
                                    ${created_at})`
                        )
                        yield* transaction.query(
                            sql`INSERT INTO observability_logs
                                (id,organization_id,domain_id,actor_user_id,
                                    level,message,source,trace_id,span_id,
                                    session_id,metadata,created_at)
                                VALUES (${randomUUID()},${organization_id},${principal.domain_id},
                                    ${principal.account_id},'info',
                                    ${`Remote mutation ${action} succeeded`},
                                    'account_remote',${trace_id},${span_id},
                                    ${principal.session_id},'{}'::jsonb,${created_at})`
                        )
                    })
                )
            }).pipe(Effect.provideService(Sql, db)),
        record_failure: (
            principal: Principal,
            action: string,
            started_at: number
        ) =>
            Effect.gen(function* () {
                const created_at = Date.now()
                const trace_id = randomUUID().replaceAll("-", "")
                const span_id = randomUUID().replaceAll("-", "").slice(0, 16)
                yield* db.transaction(
                    Effect.gen(function* () {
                        const transaction = yield* Sql
                        yield* transaction.query(
                            sql`INSERT INTO audit_events
                                (id,actor_user_id,action,entity_type,result,
                                    reason_class,trace_id,metadata,created_at)
                                VALUES (${randomUUID()},${principal.account_id},${action},
                                    'remote_mutation','failed','remote_error',
                                    ${trace_id},'{}'::jsonb,${created_at})`
                        )
                        yield* transaction.query(
                            sql`INSERT INTO observability_logs
                                (id,actor_user_id,level,message,source,trace_id,
                                    span_id,session_id,metadata,created_at)
                                VALUES (${randomUUID()},${principal.account_id},'error',
                                    ${`Remote mutation ${action} failed`},'account_remote',
                                    ${trace_id},${span_id},${principal.session_id},
                                    '{}'::jsonb,${created_at})`
                        )
                        yield* transaction.query(
                            sql`INSERT INTO observability_spans
                                (id,actor_user_id,span_id,trace_id,name,kind,
                                    status,started_at,ended_at,attributes,created_at)
                                VALUES (${randomUUID()},${principal.account_id},${span_id},
                                    ${trace_id},${action},'server','error',${started_at},
                                    ${created_at},'{}'::jsonb,${created_at})`
                        )
                    })
                )
            }).pipe(Effect.provideService(Sql, db)),
    }
})

export class SysadminTelemetryWriter extends Context.Service<
    SysadminTelemetryWriter,
    Effect.Success<typeof make>
>()("@urm/rpc/SysadminTelemetryWriter") {}
export const SysadminTelemetryWriterLive = Layer.effect(
    SysadminTelemetryWriter,
    make
)
