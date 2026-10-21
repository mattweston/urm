import { readFile, readdir } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
import { PgDialect } from "drizzle-orm/pg-core"
import { Effect, Schema } from "effect"
import { RemoteServer } from "foldkit-remote-server"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { Sql, SqlError, type SqlService } from "@urm/database/sql"
import { SaveLandingTemplateInput } from "@urm/domain/landing-templates"
import {
    LandingTemplatesRepository,
    LandingTemplatesRepositoryLive,
} from "../src/handlers/landing-templates/repository.ts"
import { LandingTemplatesServer } from "../src/handlers/landing-templates/remote.ts"

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
            catch: () =>
                new SqlError({ operation: "landing_templates_test_query" }),
        }),
    transaction: (effect) => effect,
}
const run = <A, E>(effect: Effect.Effect<A, E, LandingTemplatesRepository>) =>
    Effect.runPromise(
        effect.pipe(
            Effect.provide(LandingTemplatesRepositoryLive),
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
const template = Schema.decodeUnknownSync(SaveLandingTemplateInput)({
    template_id: null,
    expected_revision: 0,
    name: "Campaign",
    description: "Launch layout",
    category: "Marketing",
    tags: ["Launch", "launch"],
    document: {
        schema_version: 1,
        blocks: [
            {
                _tag: "Hero",
                id: "hero",
                heading: "Welcome",
                body: "Portable copy",
                actions: [],
                image: {
                    _tag: "DomainImage",
                    image_id: "image-one",
                    alt: "Artwork",
                },
            },
        ],
    },
})

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
        INSERT INTO users (id,created_at,updated_at) VALUES ('owner-one',1,1),('owner-two',1,1),('member-one',1,1);
        INSERT INTO auth_accounts (id,login_email,created_at,updated_at)
            VALUES ('owner-one','one@example.test',1,1),('owner-two','two@example.test',1,1),('member-one','member@example.test',1,1);
        INSERT INTO organizations (id,name,slug,kind,max_domains,created_at,updated_at)
            VALUES ('org-one','One','one','personal',1,1,1),('org-two','Two','two','personal',1,1,1);
        INSERT INTO domains (id,organization_id,created_by_user_id,name,slug,updated_at,publication_status,publication_access)
            VALUES ('domain-one','org-one','owner-one','One','domain-one',1,'draft','public'),
                   ('domain-two','org-two','owner-two','Two','domain-two',1,'draft','public');
        INSERT INTO organization_members (id,organization_id,user_id,role,status,created_at,updated_at)
            VALUES ('member-one','org-one','owner-one','owner','active',1,1),
                   ('member-two','org-two','owner-two','owner','active',1,1),
                   ('member-three','org-one','member-one','member','active',1,1);
        INSERT INTO account_sessions (id,account_id,token_hash,created_at,last_seen_at,expires_at,absolute_expires_at)
            VALUES ('session-one','owner-one','token-one',1,1,${expiry},${expiry}),
                   ('session-two','owner-two','token-two',1,1,${expiry},${expiry}),
                   ('session-three','member-one','token-three',1,1,${expiry},${expiry});
    `)
}, 30_000)
afterAll(async () => pg.close())
beforeEach(async () => pg.exec("TRUNCATE landing_templates"))

describe("landing templates PostgreSQL", () => {
    it("saves a portable organization template, checks revisions and isolates tenants", async () => {
        const handlers = RemoteServer.handlers(LandingTemplatesServer, owner)
        const created = await run(
            handlers.FoldkitRemoteMutate({
                requestId: "create-template",
                mutation: "SaveLandingTemplate",
                input: {
                    domain_id: owner.domain_id,
                    account_id: owner.account_id,
                    template,
                },
            })
        )
        expect(JSON.stringify(created.output)).toContain("Campaign")
        const catalog = await run(
            Effect.flatMap(LandingTemplatesRepository, (repository) =>
                repository.load(owner)
            )
        )
        expect(catalog.templates).toHaveLength(1)
        expect(catalog.templates[0]?.tags).toEqual(["launch"])
        expect(catalog.templates[0]?.document.blocks[0]).not.toHaveProperty(
            "image"
        )
        const id = catalog.templates[0]?.id ?? ""
        const stale = await run(
            Effect.flatMap(LandingTemplatesRepository, (repository) =>
                repository.save(owner, {
                    ...template,
                    template_id: id,
                    expected_revision: 0,
                })
            ).pipe(Effect.result)
        )
        expect(stale._tag).toBe("Failure")
        const foreign = await run(
            Effect.flatMap(LandingTemplatesRepository, (repository) =>
                repository.remove(other, id)
            ).pipe(Effect.result)
        )
        expect(foreign._tag).toBe("Failure")
        const removed = await run(
            Effect.flatMap(LandingTemplatesRepository, (repository) =>
                repository.remove(owner, id)
            )
        )
        expect(removed.catalog.templates).toEqual([])
    })
})
