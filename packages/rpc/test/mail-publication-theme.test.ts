import { readFile, readdir } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
import { PgDialect } from "drizzle-orm/pg-core"
import { Effect } from "effect"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Sql, SqlError, type SqlService } from "@urm/db/sql"
import { load_publication_theme } from "../src/handlers/mail/repository.ts"

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
            catch: () => new SqlError({ operation: "publication_theme_test" }),
        }),
    transaction: (effect) => effect,
}
const owner = {
    account_id: "owner-one",
    contact_id: null,
    session_id: "session-one",
    domain_id: "domain-one",
}
const read_theme = (principal: typeof owner) =>
    Effect.runPromise(
        load_publication_theme(principal).pipe(
            Effect.provideService(Sql, sql_service)
        )
    )

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

describe("publication email theme PostgreSQL read", () => {
    it("uses the domain name until a root layout is saved", async () => {
        const fallback = await read_theme(owner)
        expect(fallback.brand_name).toBe("One")
        expect(fallback.site_theme.theme_id).toBe("default")

        await pg.query(
            "INSERT INTO publication_configurations (id,domain_id,subdomain_id,layout) VALUES ($1,$2,NULL,$3::jsonb)",
            [
                "root-one",
                "domain-one",
                JSON.stringify({
                    site_title: "One Studio",
                    theme_id: "default",
                    appearance: "dark",
                }),
            ]
        )
        const saved = await read_theme(owner)
        expect(saved.brand_name).toBe("One Studio")
        expect(saved.site_theme.appearance).toBe("dark")
    })

    it("requires a current session, workspace access and the Mail module", async () => {
        await expect(
            read_theme({ ...owner, domain_id: "domain-two" })
        ).rejects.toBeDefined()
        await expect(
            read_theme({ ...owner, session_id: "expired-session" })
        ).rejects.toBeDefined()
        await pg.exec(
            "UPDATE domains SET enabled_modules=ARRAY['Blog']::module_id[] WHERE id='domain-one'"
        )
        await expect(read_theme(owner)).rejects.toBeDefined()
    })
})
