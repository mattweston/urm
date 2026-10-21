import { readFile, readdir } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
import { PgDialect } from "drizzle-orm/pg-core"
import { Effect, Schema } from "effect"
import { REMOTE_PROTOCOL_VERSION } from "foldkit-remote"
import { RemoteServer } from "foldkit-remote-server"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { Sql, SqlError, type SqlService } from "@urm/database/sql"
import { DEFAULT_SPOTIFY_PLAYLIST_ID } from "@urm/domain/schemas/settings"
import { AccountNavigation } from "@urm/contracts/account-preferences"
import { SidebarPreference } from "@urm/domain/schemas/modules"
import {
    AccountPreferencesRepository,
    AccountPreferencesRepositoryLive,
} from "../src/handlers/account-preferences/repository.ts"
import { AccountPreferencesServer } from "../src/handlers/account-preferences/remote.ts"

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
            catch: () => new SqlError({ operation: "preferences_test_query" }),
        }),
    transaction: (effect) => effect,
}
const run = <A, E>(effect: Effect.Effect<A, E, AccountPreferencesRepository>) =>
    Effect.runPromise(
        effect.pipe(
            Effect.provide(AccountPreferencesRepositoryLive),
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
beforeEach(async () => {
    await pg.exec(
        "TRUNCATE appearance_preferences,spotify_preferences,sidebar_preferences; UPDATE domains SET enabled_modules=NULL,module_settings_version=NULL"
    )
})

describe("account preferences PostgreSQL ownership", () => {
    it("serves navigation through Remote with the real repository", async () => {
        const handlers = RemoteServer.handlers(AccountPreferencesServer, owner)
        const query = await run(
            handlers.FoldkitRemoteQuery({
                query: "AccountNavigationQuery",
                input: { domain_id: owner.domain_id },
                window: {},
            })
        )
        expect(query.edges[0]?.id).toBe("owner-one/domain-one")
        const changed = await run(
            handlers.FoldkitRemoteMutate({
                requestId: "save-navigation-one",
                mutation: "SaveAccountSidebar",
                input: {
                    account_id: owner.account_id,
                    domain_id: owner.domain_id,
                    sidebar_order: ["Stats", "Settings"],
                    hidden_modules: ["Chat"],
                },
            })
        )
        expect(
            Schema.decodeUnknownSync(AccountNavigation)(changed.output)
                .hidden_modules
        ).toEqual(["Chat"])
        const read = await run(
            handlers.FoldkitRemoteRead({
                version: REMOTE_PROTOCOL_VERSION,
                requests: [
                    {
                        entity: "AccountNavigation",
                        id: "owner-one/domain-one",
                        fields: ["id", "hidden_modules"],
                    },
                ],
            })
        )
        expect(JSON.stringify(read)).toContain("Chat")
    })

    it("defaults, upserts and keeps accounts isolated", async () => {
        const result = await run(
            Effect.gen(function* () {
                const repository = yield* AccountPreferencesRepository
                const initial = yield* repository.load(owner)
                yield* repository.save_appearance(owner, {
                    theme: "dark",
                    font: "inter",
                    code_font: "theme",
                })
                yield* repository.save_spotify(
                    owner,
                    DEFAULT_SPOTIFY_PLAYLIST_ID
                )
                yield* repository.save_appearance(owner, {
                    theme: "light",
                    font: "inter",
                    code_font: "theme",
                })
                const saved = yield* repository.load(owner)
                const untouched = yield* repository.load(other)
                return { initial, saved, untouched }
            })
        )
        expect(result.initial.appearance.is_saved).toBe(false)
        expect(result.saved.appearance).toMatchObject({
            theme: "light",
            font: "inter",
            is_saved: true,
        })
        expect(result.saved.spotify.is_saved).toBe(true)
        expect(result.untouched.appearance.is_saved).toBe(false)
        const count = await pg.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM appearance_preferences"
        )
        expect(count.rows[0]?.count).toBe(1)
    })

    it("refuses a principal whose session has no workspace access", async () => {
        const result = await Effect.runPromise(
            Effect.flatMap(AccountPreferencesRepository, (repository) =>
                repository.load({ ...owner, domain_id: "domain-two" })
            ).pipe(
                Effect.result,
                Effect.provide(AccountPreferencesRepositoryLive),
                Effect.provideService(Sql, sql_service)
            )
        )
        expect(result._tag).toBe("Failure")
    })

    it("keeps sidebar preferences personal and restricts module switches", async () => {
        const member = {
            account_id: "member-one",
            contact_id: null,
            session_id: "session-three",
            domain_id: "domain-one",
        }
        const input = Schema.decodeUnknownSync(SidebarPreference)({
            sidebar_order: ["Stats", "Settings", "Stats"],
            hidden_modules: ["Chat", "Settings"],
        })
        const result = await run(
            Effect.gen(function* () {
                const repository = yield* AccountPreferencesRepository
                const baseline = yield* repository.load_navigation(member)
                const saved = yield* repository.save_sidebar(member, input)
                const owner_navigation =
                    yield* repository.load_navigation(owner)
                const member_modules = yield* repository
                    .save_modules(member, [])
                    .pipe(Effect.result)
                const owner_modules = yield* repository.save_modules(owner, [])
                return {
                    saved,
                    baseline,
                    owner_navigation,
                    member_modules,
                    owner_modules,
                }
            })
        )
        expect(result.saved.hidden_modules).toEqual(["Chat"])
        expect(result.baseline.hidden_modules).toEqual([])
        expect(result.saved.sidebar_order[0]).toBe("Stats")
        expect(result.saved.sidebar_order).toContain("Learn")
        expect(result.saved.can_manage_modules).toBe(false)
        expect(result.owner_navigation.hidden_modules).toEqual([])
        expect(result.member_modules._tag).toBe("Failure")
        expect(result.owner_modules.enabled_modules).toEqual([])
    })
})
