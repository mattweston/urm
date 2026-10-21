import { readFile, readdir } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
import { PgDialect } from "drizzle-orm/pg-core"
import { Effect } from "effect"
import { RemoteServer } from "foldkit-remote-server"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { Sql, SqlError, type SqlService } from "@urm/database/sql"
import { default_logo_scene } from "@urm/domain/schemas/logos"
import {
    LogoDraftRepository,
    LogoDraftRepositoryLive,
} from "../src/handlers/logo-drafts/repository.ts"
import { LogoDraftsServer } from "../src/handlers/logo-drafts/remote.ts"

const pg = new PGlite()
const dialect = new PgDialect()
const sql_service: SqlService = {
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
            catch: () => new SqlError({ operation: "logo_drafts_test_query" }),
        }),
    transaction: (effect) => effect,
}
const run = <A, E>(effect: Effect.Effect<A, E, LogoDraftRepository>) =>
    Effect.runPromise(
        effect.pipe(
            Effect.provide(LogoDraftRepositoryLive),
            Effect.provideService(Sql, sql_service)
        )
    )
const owner = {
    account_id: "owner-one",
    contact_id: null,
    session_id: "session-one",
    domain_id: "domain-one",
}
const other = {
    account_id: "owner-two",
    contact_id: null,
    session_id: "session-two",
    domain_id: "domain-two",
}

beforeAll(async () => {
    const base = new URL("../../db/src/migrations/", import.meta.url)
    for (const entry of (await readdir(base, { withFileTypes: true }))
        .filter((candidate) => candidate.isDirectory())
        .sort((left, right) => left.name.localeCompare(right.name))) {
        await pg.exec(
            await readFile(new URL(`${entry.name}/migration.sql`, base), "utf8")
        )
    }
    const expiry = Date.now() + 86_400_000
    await pg.exec(`
        INSERT INTO users (id,created_at,updated_at) VALUES ('owner-one',1,1),('owner-two',1,1);
        INSERT INTO auth_accounts (id,login_email,created_at,updated_at)
            VALUES ('owner-one','one@example.test',1,1),('owner-two','two@example.test',1,1);
        INSERT INTO organizations (id,name,slug,kind,max_domains,created_at,updated_at)
            VALUES ('org-one','One','one','personal',1,1,1),('org-two','Two','two','personal',1,1,1);
        INSERT INTO domains (id,organization_id,created_by_user_id,name,slug,updated_at,publication_status,publication_access)
            VALUES ('domain-one','org-one','owner-one','One','domain-one',1,'draft','public'),
                   ('domain-two','org-two','owner-two','Two','domain-two',1,'draft','public');
        INSERT INTO organization_members (id,organization_id,user_id,role,status,created_at,updated_at)
            VALUES ('member-one','org-one','owner-one','owner','active',1,1),
                   ('member-two','org-two','owner-two','owner','active',1,1);
        INSERT INTO account_sessions (id,account_id,token_hash,created_at,last_seen_at,expires_at,absolute_expires_at)
            VALUES ('session-one','owner-one','token-one',1,1,${expiry},${expiry}),
                   ('session-two','owner-two','token-two',1,1,${expiry},${expiry});
    `)
}, 30_000)
afterAll(async () => pg.close())
beforeEach(async () => pg.exec("TRUNCATE logos"))

describe("logo drafts PostgreSQL", () => {
    it("excludes logos from deleted memberships and organizations", async () => {
        await run(
            Effect.flatMap(LogoDraftRepository, (repository) =>
                repository.save(other, {
                    logo_id: null,
                    expected_revision: 0,
                    name: "Other logo",
                    scene: default_logo_scene,
                })
            )
        )
        await pg.exec(
            "INSERT INTO organization_members (id,organization_id,user_id,role,status,created_at,updated_at) VALUES ('cross-member','org-two','owner-one','member','active',1,1)"
        )
        const catalog = () =>
            run(
                Effect.flatMap(LogoDraftRepository, (repository) =>
                    repository.load_catalog(owner)
                )
            )
        try {
            expect(
                (await catalog()).drafts.map((draft) => draft.domain_id)
            ).toEqual(["domain-two"])
            await pg.exec(
                "UPDATE organization_members SET deleted_at=1 WHERE id='cross-member'"
            )
            expect((await catalog()).drafts).toEqual([])
            await pg.exec(
                "UPDATE organization_members SET deleted_at=NULL WHERE id='cross-member'; UPDATE organizations SET deleted_at=1 WHERE id='org-two'"
            )
            expect((await catalog()).drafts).toEqual([])
        } finally {
            await pg.exec(
                "DELETE FROM organization_members WHERE id='cross-member'; UPDATE organizations SET deleted_at=NULL WHERE id='org-two'"
            )
        }
    })
    it("saves a domain draft, rejects stale saves, and isolates tenants", async () => {
        const handlers = RemoteServer.handlers(LogoDraftsServer, owner)
        const created = await run(
            handlers.FoldkitRemoteMutate({
                requestId: "create-logo",
                mutation: "SaveLogoDraft",
                input: {
                    domain_id: owner.domain_id,
                    account_id: owner.account_id,
                    draft: {
                        logo_id: null,
                        expected_revision: 0,
                        name: "Primary",
                        scene: default_logo_scene,
                    },
                },
            })
        )
        expect(JSON.stringify(created.output)).toContain("Primary")
        const catalog = await run(
            Effect.flatMap(LogoDraftRepository, (repository) =>
                repository.load_catalog(owner)
            )
        )
        expect(catalog.drafts).toHaveLength(1)
        expect(catalog.drafts[0]?.slug).toBe("domain-one")
        const detail = await run(
            Effect.flatMap(LogoDraftRepository, (repository) =>
                repository.load_detail(owner)
            )
        )
        expect(detail.logo?.revision).toBe(1)
        const id = detail.logo?.id ?? ""
        const stale = await run(
            Effect.flatMap(LogoDraftRepository, (repository) =>
                repository.save(owner, {
                    logo_id: id,
                    expected_revision: 0,
                    name: "Stale",
                    scene: default_logo_scene,
                })
            ).pipe(Effect.result)
        )
        expect(stale._tag).toBe("Failure")
        const foreign = await run(
            Effect.flatMap(LogoDraftRepository, (repository) =>
                repository.save(other, {
                    logo_id: id,
                    expected_revision: 1,
                    name: "Foreign",
                    scene: default_logo_scene,
                })
            ).pipe(Effect.result)
        )
        expect(foreign._tag).toBe("Failure")
        const saved = await run(
            Effect.flatMap(LogoDraftRepository, (repository) =>
                repository.save(owner, {
                    logo_id: id,
                    expected_revision: 1,
                    name: "Updated",
                    scene: default_logo_scene,
                })
            )
        )
        expect(saved.detail.logo?.revision).toBe(2)
        expect(saved.catalog.drafts).toHaveLength(1)
    })
})
