import { PGlite } from "@electric-sql/pglite"
import { PgDialect } from "drizzle-orm/pg-core"
import { Effect, Layer } from "effect"
import { REMOTE_PROTOCOL_VERSION } from "foldkit-remote"
import { readFile, readdir } from "node:fs/promises"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Sql, SqlError, type SqlService } from "@urm/database/sql"
import {
    SysadminTelemetryRepository,
    SysadminTelemetryRepositoryLive,
    SysadminTelemetryWriter,
    SysadminTelemetryWriterLive,
    sysadmin_telemetry_handlers,
} from "@urm/rpc/handlers/sysadmin"

const pg = new PGlite()
const dialect = new PgDialect()
const service: SqlService = {
    query: (statement) =>
        Effect.tryPromise({
            try: async () => {
                const compiled = dialect.sqlToQuery(statement)
                const result = await pg.query<Record<string, unknown>>(
                    compiled.sql,
                    compiled.params
                )
                return result.rows
            },
            catch: () => new SqlError({ operation: "sysadmin_telemetry_test" }),
        }),
    transaction: (effect) => effect,
}
const services = Layer.mergeAll(
    SysadminTelemetryRepositoryLive,
    SysadminTelemetryWriterLive
).pipe(Layer.provide(Layer.succeed(Sql, service)))
const run = <A, E>(
    effect: Effect.Effect<
        A,
        E,
        SysadminTelemetryRepository | SysadminTelemetryWriter
    >
) => Effect.runPromise(effect.pipe(Effect.provide(services)))
const principal = {
    account_id: "operator",
    contact_id: null,
    session_id: "operator-session",
    domain_id: "domain-one",
}
const handlers = sysadmin_telemetry_handlers(principal)
const query = (
    all_tenants: boolean,
    domain_id = "domain-one",
    action?: string
) =>
    handlers.FoldkitRemoteQuery({
        query: "SysadminTelemetryQuery",
        input: {
            domain_id,
            all_tenants,
            refresh: 1,
            ...(action === undefined ? {} : { action }),
        },
        window: {},
    })
const read = (id: string) =>
    handlers.FoldkitRemoteRead({
        version: REMOTE_PROTOCOL_VERSION,
        requests: [
            {
                entity: "SysadminTelemetry",
                id,
                fields: [
                    "id",
                    "events",
                    "logs",
                    "errors",
                    "spans",
                    "has_more",
                    "scope_name",
                    "can_view_all",
                ],
            },
        ],
    })

beforeAll(async () => {
    const base = new URL(
        "../../../packages/database/src/migrations/",
        import.meta.url
    )
    for (const entry of (await readdir(base, { withFileTypes: true }))
        .filter((item) => item.isDirectory())
        .sort((left, right) => left.name.localeCompare(right.name)))
        await pg.exec(
            await readFile(new URL(`${entry.name}/migration.sql`, base), "utf8")
        )
    await pg.exec(`
        INSERT INTO organizations (id,name,slug,kind,max_domains,created_at,updated_at)
        VALUES ('org-one','One','one','customer',2,1,1),
               ('org-two','Two','two','customer',2,1,1);
        INSERT INTO users (id,name,created_at,updated_at)
        VALUES ('operator','Operator',1,1),('outsider','Outsider',1,1);
        INSERT INTO auth_accounts (id,login_email,created_at,updated_at)
        VALUES ('operator','operator@example.com',1,1);
        INSERT INTO organization_members (id,organization_id,user_id,role,status,created_at,updated_at)
        VALUES ('member-one','org-one','operator','sysadmin','active',1,1);
        INSERT INTO domains (id,organization_id,created_by_user_id,name,slug,publication_status,publication_access,created_at,updated_at)
        VALUES ('domain-one','org-one','operator','One','one','draft','public',1,1),
               ('domain-two','org-two','outsider','Two','two','draft','public',1,1);
        INSERT INTO account_sessions (id,account_id,token_hash,created_at,last_seen_at,expires_at,absolute_expires_at)
        VALUES ('operator-session','operator','session-hash',1,1,9999999999999,9999999999999);
        INSERT INTO audit_events (id,organization_id,domain_id,action,entity_type,result,metadata,created_at)
        VALUES ('own-event','org-one','domain-one','form.create','form','succeeded','{}',2),
               ('other-event','org-two','domain-two','form.create','form','succeeded','{}',3);
        INSERT INTO observability_logs (id,organization_id,domain_id,level,message,source,metadata,created_at)
        VALUES ('own-error','org-one','domain-one','error','failure','mail','{}',2),
               ('other-error','org-two','domain-two','error','failure','mail','{}',3);
        INSERT INTO observability_spans (id,organization_id,domain_id,span_id,trace_id,name,kind,status,started_at,attributes,created_at)
        VALUES ('own-span','org-one','domain-one','span-one','trace-one','form.create','server','ok',1,'{}',2),
               ('other-span','org-two','domain-two','span-two','trace-two','form.create','server','ok',1,'{}',3);
    `)
}, 30_000)
afterAll(async () => pg.close())

describe("PostgreSQL Sysadmin telemetry", () => {
    it("rejects records whose domain belongs to another organization", async () => {
        await expect(
            pg.exec(`
            INSERT INTO audit_events
                (id,organization_id,domain_id,action,entity_type,result,created_at)
            VALUES ('bad-scope','org-one','domain-two','bad','test','succeeded',1)
        `)
        ).rejects.toThrow(/foreign key constraint/)
    })

    it("isolates tenant rows and rejects cross-domain and global reads", async () => {
        const result = await run(query(false))
        const snapshot = JSON.stringify(
            await run(read(result.edges[0]?.id ?? ""))
        )
        expect(snapshot).toContain("own-event")
        expect(snapshot).toContain("own-error")
        expect(snapshot).toContain("span-one")
        expect(snapshot).not.toContain("other-event")
        expect(snapshot).not.toContain("other-error")
        expect(snapshot).not.toContain("span-two")
        await expect(run(query(true))).rejects.toMatchObject({
            _tag: "RemoteQueryError",
            message: "Sysadmin access denied",
        })
        await expect(run(query(false, "domain-two"))).rejects.toThrow(
            "Sysadmin access denied"
        )
        await expect(
            run(
                read(
                    JSON.stringify({
                        domain_id: "domain-one",
                        all_tenants: true,
                        refresh: 1,
                    })
                )
            )
        ).rejects.toThrow("Sysadmin access denied")
    })

    it("records successful account Remote mutations without payloads", async () => {
        await run(
            Effect.gen(function* () {
                const writer = yield* SysadminTelemetryWriter
                yield* writer.record_success(
                    principal,
                    "FormSave",
                    Date.now() - 10
                )
            })
        )
        const result = await pg.query<{ action: string; metadata: object }>(
            "SELECT action,metadata FROM audit_events WHERE action='FormSave'"
        )
        expect(result.rows).toEqual([{ action: "FormSave", metadata: {} }])
        const span = await pg.query<{ name: string }>(
            "SELECT name FROM observability_spans WHERE name='FormSave'"
        )
        expect(span.rows).toEqual([{ name: "FormSave" }])
        const logs = await pg.query<{ level: string; metadata: object }>(
            "SELECT level,metadata FROM observability_logs WHERE source='account_remote'"
        )
        expect(logs.rows).toEqual([{ level: "info", metadata: {} }])
    })

    it("records successful account Remote queries as scoped logs and spans", async () => {
        await run(
            Effect.gen(function* () {
                const writer = yield* SysadminTelemetryWriter
                yield* writer.record_query(
                    principal,
                    "AccountNavigationQuery",
                    Date.now() - 10
                )
            })
        )
        const spans = await pg.query<{
            organization_id: string
            domain_id: string
            name: string
            status: string
            attributes: object
        }>(
            "SELECT organization_id,domain_id,name,status,attributes FROM observability_spans WHERE name='AccountNavigationQuery'"
        )
        expect(spans.rows).toEqual([
            {
                organization_id: "org-one",
                domain_id: "domain-one",
                name: "AccountNavigationQuery",
                status: "ok",
                attributes: {},
            },
        ])
        const logs = await pg.query<{ message: string; metadata: object }>(
            "SELECT message,metadata FROM observability_logs WHERE message='Remote query AccountNavigationQuery succeeded'"
        )
        expect(logs.rows).toEqual([
            {
                message: "Remote query AccountNavigationQuery succeeded",
                metadata: {},
            },
        ])
        const events = await pg.query<{ id: string }>(
            "SELECT id FROM audit_events WHERE action='AccountNavigationQuery'"
        )
        expect(events.rows).toEqual([])
    })

    it("records failures without trusting the requested tenant scope", async () => {
        await run(
            Effect.gen(function* () {
                const writer = yield* SysadminTelemetryWriter
                yield* writer.record_failure(
                    { ...principal, domain_id: "domain-two" },
                    "FormSave",
                    Date.now() - 10
                )
            })
        )
        const events = await pg.query<{
            organization_id: string | null
            domain_id: string | null
            result: string
        }>(
            "SELECT organization_id,domain_id,result FROM audit_events WHERE action='FormSave' AND result='failed'"
        )
        expect(events.rows).toEqual([
            {
                organization_id: null,
                domain_id: null,
                result: "failed",
            },
        ])
        const errors = await pg.query<{ level: string; source: string }>(
            "SELECT level,source FROM observability_logs WHERE source='account_remote' AND level='error'"
        )
        expect(errors.rows).toEqual([
            { level: "error", source: "account_remote" },
        ])
    })

    it("allows a platform operator to read all tenants and filters events", async () => {
        await pg.exec(
            "UPDATE users SET platform_role='platform_sysadmin' WHERE id='operator'"
        )
        const result = await run(query(true, "domain-one", "form.create"))
        const snapshot = JSON.stringify(
            await run(read(result.edges[0]?.id ?? ""))
        )
        expect(snapshot).toContain("own-event")
        expect(snapshot).toContain("other-event")
        expect(snapshot).not.toContain('"action":"FormSave"')
    })
})
