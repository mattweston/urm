import { PGlite } from "@electric-sql/pglite"
import { PgDialect } from "drizzle-orm/pg-core"
import { Effect, Layer, Schema } from "effect"
import { REMOTE_PROTOCOL_VERSION } from "foldkit-remote"
import { readFile, readdir } from "node:fs/promises"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Sql, SqlError, type SqlService } from "@urm/db/sql"
import {
    SysadminSessionsRepository,
    SysadminSessionsRepositoryLive,
    sysadmin_process_handlers,
    sysadmin_sessions_handlers,
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
            catch: () => new SqlError({ operation: "sysadmin_test" }),
        }),
    transaction: (effect) => effect,
}
const repository = SysadminSessionsRepositoryLive.pipe(
    Layer.provide(Layer.succeed(Sql, service))
)
const run = <A, E>(effect: Effect.Effect<A, E, SysadminSessionsRepository>) =>
    Effect.runPromise(effect.pipe(Effect.provide(repository)))
const principal = {
    account_id: "operator",
    contact_id: null,
    session_id: "operator-session",
    domain_id: "domain-one",
}
const handlers = sysadmin_sessions_handlers(principal)
const query = (all_tenants: boolean, domain_id = "domain-one") =>
    handlers.FoldkitRemoteQuery({
        query: "SysadminSessionsQuery",
        input: { domain_id, all_tenants, as_of: Date.now() },
        window: {},
    })

beforeAll(async () => {
    const base = new URL(
        "../../../packages/db/src/migrations/",
        import.meta.url
    )
    for (const entry of (await readdir(base, { withFileTypes: true }))
        .filter((item) => item.isDirectory())
        .sort((left, right) => left.name.localeCompare(right.name)))
        await pg.exec(
            await readFile(new URL(`${entry.name}/migration.sql`, base), "utf8")
        )
    const future = Date.now() + 60_000
    await pg.exec(`
        INSERT INTO organizations (id,name,slug,kind,max_domains,created_at,updated_at)
        VALUES ('org-one','One','one','customer',2,1,1),
               ('org-two','Two','two','customer',2,1,1);
        INSERT INTO users (id,name,created_at,updated_at)
        VALUES ('operator','Operator',1,1),('peer','Peer',1,1),('outsider','Outsider',1,1);
        INSERT INTO auth_accounts (id,login_email,created_at,updated_at)
        VALUES ('operator','operator@example.com',1,1),
               ('peer','peer@example.com',1,1),
               ('outsider','outsider@example.com',1,1);
        INSERT INTO organization_members (id,organization_id,user_id,role,status,created_at,updated_at)
        VALUES ('m1','org-one','operator','sysadmin','active',1,1),
               ('m2','org-one','peer','member','active',1,1),
               ('m3','org-two','outsider','member','active',1,1);
        INSERT INTO domains (id,organization_id,created_by_user_id,name,slug,publication_status,publication_access,created_at,updated_at)
        VALUES ('domain-one','org-one','operator','One','one','draft','public',1,1),
               ('domain-two','org-two','outsider','Two','two','draft','public',1,1);
    `)
    await pg.query(
        `INSERT INTO account_sessions (id,account_id,token_hash,created_at,last_seen_at,expires_at,absolute_expires_at)
        VALUES ('operator-session','operator','hash-operator',1,1,$1,$1),
               ('peer-session','peer','hash-peer',1,2,$1,$1),
               ('outside-session','outsider','hash-outsider',1,3,$1,$1)`,
        [future]
    )
}, 30_000)
afterAll(async () => pg.close())

describe("PostgreSQL Sysadmin sessions", () => {
    it("shows tenant members and rejects global or cross-domain requests", async () => {
        const result = await run(query(false))
        const read = await run(
            handlers.FoldkitRemoteRead({
                version: REMOTE_PROTOCOL_VERSION,
                requests: [
                    {
                        entity: "SysadminSessions",
                        id: result.edges[0]?.id ?? "",
                        fields: [
                            "id",
                            "sessions",
                            "as_of",
                            "has_more",
                            "scope_name",
                            "can_view_all",
                        ],
                    },
                ],
            })
        )
        expect(() => Schema.decodeUnknownSync(Schema.Json)(read)).not.toThrow()
        expect(JSON.stringify(read)).toContain("peer-session")
        expect(JSON.stringify(read)).not.toContain("outside-session")
        await expect(run(query(true))).rejects.toThrow("Sysadmin access denied")
        await expect(run(query(false, "domain-two"))).rejects.toThrow(
            "Sysadmin access denied"
        )
    })

    it("requires an active sysadmin membership and lets a platform sysadmin select all tenants", async () => {
        await pg.exec(
            "UPDATE organization_members SET status='suspended' WHERE id='m1'"
        )
        await expect(run(query(false))).rejects.toThrow(
            "Sysadmin access denied"
        )
        await pg.exec(
            "UPDATE users SET platform_role='platform_sysadmin' WHERE id='operator'"
        )
        const result = await run(query(true))
        const read = await run(
            handlers.FoldkitRemoteRead({
                version: REMOTE_PROTOCOL_VERSION,
                requests: [
                    {
                        entity: "SysadminSessions",
                        id: result.edges[0]?.id ?? "",
                        fields: [
                            "id",
                            "sessions",
                            "as_of",
                            "has_more",
                            "scope_name",
                            "can_view_all",
                        ],
                    },
                ],
            })
        )
        expect(JSON.stringify(read)).toContain("outside-session")
    })

    it("restricts process snapshots to platform operators on query and read", async () => {
        const process_handlers = sysadmin_process_handlers(principal)
        const input = { domain_id: "domain-one", refresh: Date.now() }
        await pg.exec("UPDATE users SET platform_role=NULL WHERE id='operator'")
        await expect(
            run(
                process_handlers.FoldkitRemoteQuery({
                    query: "SysadminProcessQuery",
                    input,
                    window: {},
                })
            )
        ).rejects.toThrow("Sysadmin access denied")
        await pg.exec(
            "UPDATE users SET platform_role='platform_sysadmin' WHERE id='operator'"
        )
        const result = await run(
            process_handlers.FoldkitRemoteQuery({
                query: "SysadminProcessQuery",
                input,
                window: {},
            })
        )
        const read = () =>
            run(
                process_handlers.FoldkitRemoteRead({
                    version: REMOTE_PROTOCOL_VERSION,
                    requests: [
                        {
                            entity: "SysadminProcess",
                            id: result.edges[0]?.id ?? "",
                            fields: ["id", "metrics", "system"],
                        },
                    ],
                })
            )
        const snapshot = await read()
        expect(() =>
            Schema.decodeUnknownSync(Schema.Json)(snapshot)
        ).not.toThrow()
        expect(JSON.stringify(snapshot)).toContain('"pid"')
        await pg.exec("UPDATE users SET platform_role=NULL WHERE id='operator'")
        await expect(read()).rejects.toThrow("Sysadmin access denied")
    })
})
