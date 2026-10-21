import { readFile, readdir } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
import { PgDialect } from "drizzle-orm/pg-core"
import { ConfigProvider, Effect, Exit, Redacted, Schema } from "effect"
import { RemoteServer } from "foldkit-remote-server"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Sql, SqlError, type SqlService } from "@urm/db/sql"
import {
    SocialStoreLive,
    SocialStore,
    type ReservePostInput,
    SaveTemplateInput,
} from "../src/handlers/social/store.ts"
import {
    make_zernio_provider,
    ZernioProvider,
} from "../src/handlers/social/provider.ts"
import {
    cancel_social_post,
    delete_social_post,
    reconcile_social_post,
    retry_social_draft_edit,
    submit_social_post,
    update_social_draft,
} from "../src/handlers/social/submission.ts"
import {
    connect_social_account,
    sync_social_accounts,
} from "../src/handlers/social/accounts.ts"
import { refresh_social_analytics } from "../src/handlers/social/analytics.ts"
import { reconcile_social_posts } from "../src/handlers/social/reconciliation.ts"
import {
    record_social_provider_event,
    reconcile_social_provider_events,
} from "../src/handlers/social/provider-events.ts"
import { SocialRepositoryLive } from "../src/handlers/social/repository.ts"
import { SocialServer } from "../src/handlers/social/remote.ts"

const pg = new PGlite()
const dialect = new PgDialect()
const make_sql = (in_transaction = false): SqlService => ({
    query: (statement) =>
        Effect.tryPromise({
            try: async () => {
                const compiled = dialect.sqlToQuery(statement)
                const result = await pg.query<Record<string, unknown>>(
                    compiled.sql,
                    compiled.params
                )
                return result.rows.map((row) =>
                    Object.fromEntries(
                        Object.entries(row).map(([name, value]) => [
                            name,
                            result.fields.some(
                                (field) =>
                                    field.name === name &&
                                    field.dataTypeID === 20
                            ) && value !== null
                                ? String(value)
                                : value,
                        ])
                    )
                )
            },
            catch: () => new SqlError({ operation: "test_query" }),
        }),
    transaction: (effect) =>
        in_transaction
            ? effect
            : Effect.gen(function* () {
                  yield* Effect.promise(() => pg.exec("BEGIN"))
                  const result = yield* Effect.exit(
                      effect.pipe(Effect.provideService(Sql, make_sql(true)))
                  )
                  yield* Effect.promise(() =>
                      pg.exec(Exit.isSuccess(result) ? "COMMIT" : "ROLLBACK")
                  )
                  if (Exit.isFailure(result))
                      return yield* Effect.failCause(result.cause)
                  return result.value
              }),
})
const run = <A, E>(effect: Effect.Effect<A, E, Sql | SocialStore>) =>
    Effect.runPromise(
        effect.pipe(
            Effect.provide(SocialStoreLive),
            Effect.provideService(Sql, make_sql())
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
    const expires_at = Date.now() + 86_400_000
    await pg.exec(`
        INSERT INTO users (id,created_at,updated_at) VALUES ('owner-one',1,1),('owner-two',1,1);
        INSERT INTO auth_accounts (id,login_email,created_at,updated_at)
            VALUES ('owner-one','one@example.test',1,1),('owner-two','two@example.test',1,1);
        INSERT INTO organizations (id,name,slug,kind,max_domains,created_at,updated_at)
            VALUES ('org-one','One','one','personal',1,1,1),('org-two','Two','two','personal',1,1,1);
        INSERT INTO domains (id,organization_id,created_by_user_id,name,slug,updated_at,publication_status,publication_access)
            VALUES ('domain-one','org-one','owner-one','One','domain-one',1,'draft','public'),
                   ('domain-two','org-two','owner-two','Two','domain-two',1,'draft','public'),
                   ('domain-three','org-one','owner-one','Three','test1',1,'draft','public'),
                   ('domain-four','org-one','owner-one','Four','domain-four',1,'draft','public');
        INSERT INTO organization_members (id,organization_id,user_id,role,status,created_at,updated_at)
            VALUES ('member-one','org-one','owner-one','owner','active',1,1),
                   ('member-two','org-two','owner-two','owner','active',1,1);
        INSERT INTO account_sessions (id,account_id,token_hash,created_at,last_seen_at,expires_at,absolute_expires_at)
            VALUES ('session-one','owner-one','token-one',1,1,${expires_at},${expires_at}),
                   ('session-two','owner-two','token-two',1,1,${expires_at},${expires_at});
        INSERT INTO social_provider_profiles (domain_id,provider_profile_id,created_at)
            VALUES ('domain-one','profile-one',1),('domain-two','profile-two',1);
        INSERT INTO social_accounts (domain_id,account_id,provider_profile_id,platform,username,active,synced_at)
            VALUES ('domain-one','account-one','profile-one','facebook','one',true,1),
                   ('domain-two','account-two','profile-two','instagram','two',true,1);
        INSERT INTO images (id,domain_id,url,alt,text,order_position,created_at,updated_at)
            VALUES ('image-one','domain-one','https://cdn.example.test/one.png','One','',0,1,1),
                   ('image-two','domain-two','https://cdn.example.test/two.png','Two','',0,1,1);
        INSERT INTO social_templates (id,organization_id,name,description,tags,content,revision,created_by_user_id,updated_by_user_id,created_at,updated_at)
            VALUES ('template-one','org-one','Launch','',ARRAY[]::text[],'Hello',3,'owner-one','owner-one',1,1),
                   ('template-two','org-two','Launch','',ARRAY[]::text[],'Hello',1,'owner-two','owner-two',1,1);
    `)
}, 30_000)
afterAll(async () => pg.close())

const owner = {
    account_id: "owner-one",
    contact_id: null,
    session_id: "session-one",
    domain_id: "domain-one",
}
const third_workspace_owner = { ...owner, domain_id: "domain-three" }
const fourth_workspace_owner = { ...owner, domain_id: "domain-four" }
const input = (idempotency_key: string): ReservePostInput => ({
    idempotency_key,
    account_ids: ["account-one"],
    media_ids: ["image-one"],
    content: "Hello",
    scheduled_for: null,
    publication_mode: "draft",
    template_id: "template-one",
})

describe("Social post reservation", () => {
    it("rejects connection issuance for a read-only member with an existing profile", async () => {
        await pg.exec(
            "UPDATE organization_members SET role='member' WHERE id='member-one'"
        )
        try {
            const result = await run(
                Effect.result(
                    connect_social_account(owner, "facebook").pipe(
                        Effect.provideService(
                            ZernioProvider,
                            make_zernio_provider(
                                Redacted.make("dummy"),
                                async () => {
                                    throw new Error(
                                        "Provider must not be called"
                                    )
                                }
                            )
                        )
                    )
                )
            )
            expect(result._tag).toBe("Failure")
            if (result._tag === "Failure")
                expect(result.failure).toMatchObject({
                    _tag: "SocialStoreError",
                    message: "Social operation unavailable or access denied",
                })
        } finally {
            await pg.exec(
                "UPDATE organization_members SET role='owner' WHERE id='member-one'"
            )
        }
    })
    it("binds a profile once and rejects a profile owned by another workspace", async () => {
        await expect(
            run(
                Effect.flatMap(SocialStore, (store) =>
                    store.bind_profile(fourth_workspace_owner, "profile-one")
                )
            )
        ).rejects.toThrow(/already assigned/)
        const profile_id = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.bind_profile(fourth_workspace_owner, "profile-four")
            )
        )
        expect(profile_id).toBe("profile-four")
        const repeated = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.bind_profile(fourth_workspace_owner, "profile-four")
            )
        )
        expect(repeated).toBe("profile-four")
    })
    it("commits once per key and preserves authoring provenance", async () => {
        const first = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.reserve_post(owner, input("retry-one"))
            )
        )
        const replay = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.reserve_post(owner, input("retry-one"))
            )
        )
        expect(first.duplicate).toBe(false)
        expect(replay.duplicate).toBe(true)
        expect(replay.post.id).toBe(first.post.id)
        expect(first.post.template_source).toEqual({
            template_id: "organization.social.template-one",
            template_version: 3,
            provenance: "organization",
        })
        const count = await pg.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM social_posts WHERE domain_id='domain-one' AND idempotency_key='retry-one'"
        )
        expect(count.rows[0]?.count).toBe(1)
    })

    it("rejects cross-domain accounts, images, and templates", async () => {
        const cases: ReadonlyArray<
            readonly [string, Partial<ReservePostInput>, RegExp]
        > = [
            [
                "foreign-account",
                { account_ids: ["account-two"] },
                /active accounts/,
            ],
            [
                "foreign-image",
                { media_ids: ["image-two"] },
                /images in this workspace/,
            ],
            [
                "foreign-template",
                { template_id: "template-two" },
                /template is unavailable/,
            ],
        ]
        for (const [key, changed, expected] of cases) {
            await expect(
                run(
                    Effect.flatMap(SocialStore, (store) =>
                        store.reserve_post(owner, { ...input(key), ...changed })
                    )
                )
            ).rejects.toThrow(expected)
        }
        const count = await pg.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM social_posts WHERE domain_id='domain-one'"
        )
        expect(count.rows[0]?.count).toBe(1)
    })

    it("does not reuse a key for different content or submit twice", async () => {
        await expect(
            run(
                Effect.flatMap(SocialStore, (store) =>
                    store.reserve_post(owner, {
                        ...input("retry-one"),
                        content: "Changed",
                    })
                )
            )
        ).rejects.toThrow(/already used/)
        const reservation = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.reserve_post(owner, input("retry-one"))
            )
        )
        const claimed = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.claim_post(owner, reservation.post.id)
            )
        )
        const claimed_again = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.claim_post(owner, reservation.post.id)
            )
        )
        expect(claimed).toBe(true)
        expect(claimed_again).toBe(false)
    })

    it("does not overwrite a reconciled status with an older submission response", async () => {
        const reservation = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.reserve_post(owner, {
                    ...input("status-race"),
                    media_ids: [],
                })
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.claim_post(owner, reservation.post.id)
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.record_provider_result(
                    owner.domain_id,
                    reservation.post.id,
                    "provider-race",
                    "scheduled"
                )
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.refresh_provider_status(
                    owner.domain_id,
                    reservation.post.id,
                    "provider-race",
                    "published"
                )
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.record_provider_result(
                    owner.domain_id,
                    reservation.post.id,
                    "provider-race",
                    "scheduled"
                )
            )
        )
        const rows = await pg.query<{ status: string }>(
            "SELECT status FROM social_posts WHERE id=$1",
            [reservation.post.id]
        )
        expect(rows.rows[0]?.status).toBe("published")
    })
})

describe("Social provider submission", () => {
    it("submits a committed reservation once with a stable provider request id", async () => {
        const requests: Array<string | null> = []
        const provider = make_zernio_provider(
            Redacted.make("test-key"),
            (_url, init) => {
                requests.push(new Headers(init?.headers).get("x-request-id"))
                return Promise.resolve(
                    Response.json({
                        post: { _id: "provider-post-one", status: "draft" },
                    })
                )
            }
        )
        const create = () =>
            run(
                submit_social_post(owner, {
                    ...input("submit-once"),
                    media_ids: [],
                }).pipe(Effect.provideService(ZernioProvider, provider))
            )
        const first = await create()
        const second = await create()
        expect(first.status).toBe("draft")
        expect(second.duplicate).toBe(true)
        expect(requests).toEqual([first.post_id])
        const rows = await pg.query<{
            provider_post_id: string
            status: string
        }>("SELECT provider_post_id,status FROM social_posts WHERE id=$1", [
            first.post_id,
        ])
        expect(rows.rows[0]).toEqual({
            provider_post_id: "provider-post-one",
            status: "draft",
        })
    })

    it("holds an ambiguous network result for reconciliation", async () => {
        let requests = 0
        const provider = make_zernio_provider(Redacted.make("test-key"), () => {
            requests++
            return Promise.reject(new Error("network timeout"))
        })
        const submit = () =>
            run(
                submit_social_post(owner, {
                    ...input("uncertain-once"),
                    media_ids: [],
                }).pipe(Effect.provideService(ZernioProvider, provider))
            )
        await expect(submit()).rejects.toThrow(/response is uncertain/)
        const replay = await submit()
        expect(replay.duplicate).toBe(true)
        expect(replay.status).toBe("submitting")
        expect(requests).toBe(1)
    })

    it("marks a definite provider rejection failed", async () => {
        const provider = make_zernio_provider(Redacted.make("test-key"), () =>
            Promise.resolve(
                Response.json(
                    { error: "Account needs reconnection" },
                    { status: 403 }
                )
            )
        )
        await expect(
            run(
                submit_social_post(owner, {
                    ...input("provider-rejected"),
                    media_ids: [],
                }).pipe(Effect.provideService(ZernioProvider, provider))
            )
        ).rejects.toThrow(/Account needs reconnection/)
        const rows = await pg.query<{ status: string; error_message: string }>(
            "SELECT status,error_message FROM social_posts WHERE domain_id='domain-one' AND idempotency_key='provider-rejected'"
        )
        expect(rows.rows[0]).toEqual({
            status: "failed",
            error_message: "Account needs reconnection",
        })
    })

    it("reconciles an uncertain post using its local ID without another publish", async () => {
        let publishes = 0
        let post_id = ""
        const provider = make_zernio_provider(
            Redacted.make("test-key"),
            (_url, init) => {
                if (init?.method === "POST") {
                    publishes++
                    return Promise.reject(new Error("network timeout"))
                }
                return Promise.resolve(
                    Response.json({
                        posts: [
                            {
                                _id: "recovered-provider-post",
                                status: "scheduled",
                                metadata: { urmPostId: post_id },
                            },
                        ],
                    })
                )
            }
        )
        const submit = () =>
            run(
                submit_social_post(owner, {
                    ...input("uncertain-reconcile"),
                    media_ids: [],
                }).pipe(Effect.provideService(ZernioProvider, provider))
            )
        await expect(submit()).rejects.toThrow(/response is uncertain/)
        const rows = await pg.query<{ id: string }>(
            "SELECT id FROM social_posts WHERE domain_id='domain-one' AND idempotency_key='uncertain-reconcile'"
        )
        post_id = rows.rows[0]?.id ?? ""
        const resolved = await run(
            reconcile_social_post(owner, post_id).pipe(
                Effect.provideService(ZernioProvider, provider)
            )
        )
        expect(resolved).toEqual({
            post_id,
            status: "scheduled",
            resolved: true,
        })
        expect(publishes).toBe(1)
    })
})

describe("Social post cancellation", () => {
    it("cancels a saved draft once after provider confirmation", async () => {
        const reservation = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.reserve_post(owner, {
                    ...input("cancel-draft"),
                    media_ids: [],
                })
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.claim_post(owner, reservation.post.id)
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.record_provider_result(
                    owner.domain_id,
                    reservation.post.id,
                    "provider-cancel-draft",
                    "draft"
                )
            )
        )
        let deletes = 0
        const provider = make_zernio_provider(Redacted.make("test-key"), () => {
            deletes += 1
            return Promise.resolve(new Response(null, { status: 204 }))
        })
        const cancel = () =>
            run(
                cancel_social_post(owner, reservation.post.id).pipe(
                    Effect.provideService(ZernioProvider, provider)
                )
            )
        expect((await cancel()).cancelled).toBe(true)
        expect((await cancel()).cancelled).toBe(false)
        expect(deletes).toBe(1)
        const rows = await pg.query<{ status: string }>(
            "SELECT status FROM social_posts WHERE id=$1",
            [reservation.post.id]
        )
        expect(rows.rows[0]?.status).toBe("cancelled")
        await expect(
            run(
                Effect.flatMap(SocialStore, (store) =>
                    store.refresh_provider_status(
                        owner.domain_id,
                        reservation.post.id,
                        "provider-cancel-draft",
                        "draft"
                    )
                )
            )
        ).rejects.toThrow()
        const after_late_refresh = await pg.query<{ status: string }>(
            "SELECT status FROM social_posts WHERE id=$1",
            [reservation.post.id]
        )
        expect(after_late_refresh.rows[0]?.status).toBe("cancelled")
    })

    it("finishes cancellation when the provider already deleted the draft", async () => {
        const reservation = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.reserve_post(owner, input("cancel-already-deleted"))
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.claim_post(owner, reservation.post.id)
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.record_provider_result(
                    owner.domain_id,
                    reservation.post.id,
                    "provider-already-deleted",
                    "draft"
                )
            )
        )
        const provider = make_zernio_provider(Redacted.make("test-key"), () =>
            Promise.resolve(
                Response.json({ error: "Not found" }, { status: 404 })
            )
        )
        const result = await run(
            cancel_social_post(owner, reservation.post.id).pipe(
                Effect.provideService(ZernioProvider, provider)
            )
        )
        expect(result.status).toBe("cancelled")
        const rows = await pg.query<{ status: string }>(
            "SELECT status FROM social_posts WHERE id=$1",
            [reservation.post.id]
        )
        expect(rows.rows[0]?.status).toBe("cancelled")
    })
})

describe("Social post deletion", () => {
    it("deletes a provider draft and its local record", async () => {
        const reservation = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.reserve_post(owner, input("delete-draft"))
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.claim_post(owner, reservation.post.id)
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.record_provider_result(
                    owner.domain_id,
                    reservation.post.id,
                    "provider-delete-draft",
                    "draft"
                )
            )
        )
        let deletes = 0
        const provider = make_zernio_provider(Redacted.make("test-key"), () => {
            deletes += 1
            return Promise.resolve(new Response(null, { status: 204 }))
        })
        await run(
            delete_social_post(owner, reservation.post.id).pipe(
                Effect.provideService(ZernioProvider, provider)
            )
        )
        expect(deletes).toBe(1)
        const rows = await pg.query("SELECT id FROM social_posts WHERE id=$1", [
            reservation.post.id,
        ])
        expect(rows.rows).toHaveLength(0)
    })

    it("removes a published post from URM without deleting it from the provider", async () => {
        const reservation = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.reserve_post(owner, input("remove-published"))
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.claim_post(owner, reservation.post.id)
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.record_provider_result(
                    owner.domain_id,
                    reservation.post.id,
                    "provider-remove-published",
                    "published"
                )
            )
        )
        let deletes = 0
        const provider = make_zernio_provider(Redacted.make("test-key"), () => {
            deletes += 1
            return Promise.resolve(new Response(null, { status: 204 }))
        })
        await run(
            delete_social_post(owner, reservation.post.id).pipe(
                Effect.provideService(ZernioProvider, provider)
            )
        )
        expect(deletes).toBe(0)
        const rows = await pg.query("SELECT id FROM social_posts WHERE id=$1", [
            reservation.post.id,
        ])
        expect(rows.rows).toHaveLength(0)
    })
})

describe("Social draft editing", () => {
    it("updates a saved draft and keeps its original template source", async () => {
        const reservation = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.reserve_post(owner, input("edit-draft"))
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.claim_post(owner, reservation.post.id)
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.record_provider_result(
                    owner.domain_id,
                    reservation.post.id,
                    "provider-edit-draft",
                    "draft"
                )
            )
        )
        const provider = make_zernio_provider(
            Redacted.make("test-key"),
            (_url, init) => {
                expect(init?.method).toBe("PUT")
                expect(JSON.parse(String(init?.body))).toMatchObject({
                    content: "Updated draft",
                    isDraft: true,
                })
                return Promise.resolve(
                    Response.json({
                        post: { _id: "provider-edit-draft", status: "draft" },
                    })
                )
            }
        )
        const result = await run(
            update_social_draft(owner, reservation.post.id, {
                account_ids: ["account-one"],
                media_ids: ["image-one"],
                content: "Updated draft",
            }).pipe(Effect.provideService(ZernioProvider, provider))
        )
        expect(result.status).toBe("draft")
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.complete_draft_edit(
                    owner,
                    reservation.post.id,
                    "provider-edit-draft"
                )
            )
        )
        const rows = await pg.query<{
            status: string
            content: string
            template_source: { template_id: string }
        }>(
            "SELECT status,content,template_source FROM social_posts WHERE id=$1",
            [reservation.post.id]
        )
        expect(rows.rows[0]).toMatchObject({
            status: "draft",
            content: "Updated draft",
            template_source: {
                template_id: "organization.social.template-one",
            },
        })
    })

    it("holds an uncertain edit for an identical retry", async () => {
        const reservation = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.reserve_post(owner, input("edit-uncertain"))
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.claim_post(owner, reservation.post.id)
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                store.record_provider_result(
                    owner.domain_id,
                    reservation.post.id,
                    "provider-edit-uncertain",
                    "draft"
                )
            )
        )
        let calls = 0
        const provider = make_zernio_provider(Redacted.make("test-key"), () => {
            calls += 1
            return Promise.resolve(
                calls === 1
                    ? Response.json({ error: "Unavailable" }, { status: 503 })
                    : Response.json({
                          post: {
                              _id: "provider-edit-uncertain",
                              status: "draft",
                          },
                      })
            )
        })
        const edit = (content: string) =>
            run(
                update_social_draft(owner, reservation.post.id, {
                    account_ids: ["account-one"],
                    media_ids: [],
                    content,
                }).pipe(Effect.provideService(ZernioProvider, provider))
            )
        await expect(edit("Retry me")).rejects.toThrow(/uncertain/)
        await expect(edit("Different edit")).rejects.toThrow(
            /retry the same edit/
        )
        expect(
            (
                await run(
                    retry_social_draft_edit(owner, reservation.post.id).pipe(
                        Effect.provideService(ZernioProvider, provider)
                    )
                )
            ).status
        ).toBe("draft")
        expect(calls).toBe(2)
    })
})

describe("Social templates", () => {
    it("keeps templates in the owning organization and checks revisions", async () => {
        const existing = await run(
            Effect.flatMap(SocialStore, (store) => store.load_templates(owner))
        )
        expect(existing.map((template) => template.id)).toContain(
            "template-one"
        )
        expect(existing.map((template) => template.id)).not.toContain(
            "template-two"
        )
        const create = Schema.decodeUnknownSync(SaveTemplateInput)({
            template_id: null,
            expected_revision: 0,
            name: "New social template",
            description: "Reusable text",
            tags: ["launch"],
            content: "Hello from a template",
        })
        const saved = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.save_template(owner, create)
            )
        )
        expect(saved.revision).toBe(1)
        const changed = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.save_template(owner, {
                    ...create,
                    template_id: saved.id,
                    expected_revision: 1,
                    content: "Changed content",
                })
            )
        )
        expect(changed.revision).toBe(2)
        await expect(
            run(
                Effect.flatMap(SocialStore, (store) =>
                    store.save_template(owner, {
                        ...create,
                        template_id: saved.id,
                        expected_revision: 1,
                    })
                )
            )
        ).rejects.toThrow(/template changed/)
        await expect(
            run(
                Effect.flatMap(SocialStore, (store) =>
                    store.save_template(owner, {
                        ...create,
                        template_id: "template-two",
                        expected_revision: 1,
                    })
                )
            )
        ).rejects.toThrow(/template changed/)
    })
})

describe("Social analytics", () => {
    it("stores a filtered provider snapshot for the workspace", async () => {
        const provider = make_zernio_provider(
            Redacted.make("test-key"),
            (url) => {
                const path = String(url)
                return Promise.resolve(
                    Response.json(
                        path.includes("daily-metrics")
                            ? {
                                  dailyData: [
                                      {
                                          date: "2026-09-23",
                                          postCount: 1,
                                          metrics: { likes: 3, comments: 1 },
                                      },
                                  ],
                                  platformBreakdown: [
                                      {
                                          platform: "facebook",
                                          postCount: 1,
                                          likes: 3,
                                          comments: 1,
                                      },
                                  ],
                              }
                            : path.includes("follower-stats")
                              ? {
                                    accounts: [
                                        {
                                            _id: "account-one",
                                            platform: "facebook",
                                            growth: 2,
                                        },
                                    ],
                                }
                              : {
                                    overview: { totalPosts: 1 },
                                    posts: [
                                        {
                                            _id: "provider-post-one",
                                            content: "Hello",
                                            analytics: { likes: 3 },
                                            platform: "facebook",
                                        },
                                    ],
                                }
                    )
                )
            }
        )
        const snapshot = await run(
            refresh_social_analytics(owner, "7d", "facebook", null).pipe(
                Effect.provideService(ZernioProvider, provider)
            )
        )
        expect(snapshot.post_count).toBe(1)
        expect(snapshot.metrics.engagement).toBe(4)
        expect(snapshot.follower_growth).toBe(2)
        const stored = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.load_analytics(owner, "7d", "facebook", null)
            )
        )
        expect(stored?.metrics.engagement).toBe(4)
        await expect(
            run(
                refresh_social_analytics(
                    owner,
                    "7d",
                    "facebook",
                    "account-two"
                ).pipe(Effect.provideService(ZernioProvider, provider))
            )
        ).rejects.toThrow(/active, connected/)
    })
})

describe("Social account synchronization", () => {
    it("binds the existing profile to test1 during UI account sync", async () => {
        const provider = make_zernio_provider(
            Redacted.make("test-key"),
            (url) =>
                Promise.resolve(
                    Response.json(
                        String(url).endsWith("/profiles?includeOverLimit=true")
                            ? {
                                  profiles: [
                                      {
                                          _id: "legacy-profile",
                                          name: "Default",
                                          isDefault: true,
                                      },
                                  ],
                              }
                            : {
                                  accounts: [
                                      {
                                          _id: "legacy-account",
                                          profileId: "legacy-profile",
                                          platform: "facebook",
                                          username: "legacy",
                                          isActive: true,
                                      },
                                  ],
                              }
                    )
                )
        )
        const accounts = await run(
            sync_social_accounts(third_workspace_owner).pipe(
                Effect.provideService(ZernioProvider, provider),
                Effect.provide(
                    ConfigProvider.layer(ConfigProvider.fromUnknown({}))
                )
            )
        )
        expect(accounts.map((account) => account.account_id)).toEqual([
            "legacy-account",
        ])
        const binding = await pg.query<{ provider_profile_id: string }>(
            "SELECT provider_profile_id FROM social_provider_profiles WHERE domain_id='domain-three'"
        )
        expect(binding.rows[0]?.provider_profile_id).toBe("legacy-profile")
    })

    it("stores only accounts returned for the bound profile", async () => {
        const provider = make_zernio_provider(Redacted.make("test-key"), () =>
            Promise.resolve(
                Response.json({
                    accounts: [
                        {
                            _id: "account-one",
                            profileId: { _id: "profile-one" },
                            platform: "facebook",
                            username: "one",
                            isActive: true,
                        },
                        {
                            _id: "account-new",
                            profileId: "profile-one",
                            platform: "instagram",
                            username: "new",
                            isActive: true,
                        },
                        {
                            _id: "account-two",
                            profileId: "profile-two",
                            platform: "instagram",
                            username: "two",
                            isActive: true,
                        },
                    ],
                })
            )
        )
        const accounts = await run(
            sync_social_accounts(owner).pipe(
                Effect.provideService(ZernioProvider, provider)
            )
        )
        expect(accounts.map((account) => account.account_id)).toEqual([
            "account-one",
            "account-new",
        ])
        const foreign = await pg.query<{ domain_id: string }>(
            "SELECT domain_id FROM social_accounts WHERE account_id='account-two'"
        )
        expect(foreign.rows[0]?.domain_id).toBe("domain-two")
    })
})

describe("Social scheduled reconciliation", () => {
    it("refreshes a due scheduled post without submitting it again", async () => {
        const reservation = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.reserve_post(owner, {
                    ...input("scheduled-reconciliation"),
                    scheduled_for: Date.now() + 3_600_000,
                    publication_mode: "schedule",
                })
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                Effect.gen(function* () {
                    yield* store.claim_post(owner, reservation.post.id)
                    yield* store.record_provider_result(
                        owner.domain_id,
                        reservation.post.id,
                        "provider-scheduled-reconciliation",
                        "scheduled"
                    )
                })
            )
        )
        await pg.query(
            "UPDATE social_posts SET scheduled_for=1,updated_at=1 WHERE id=$1",
            [reservation.post.id]
        )
        const requests: string[] = []
        const provider = make_zernio_provider(
            Redacted.make("test-key"),
            (url, init) => {
                requests.push(`${init?.method ?? "GET"} ${String(url)}`)
                return Promise.resolve(
                    Response.json({
                        post: {
                            _id: "provider-scheduled-reconciliation",
                            status: "published",
                        },
                    })
                )
            }
        )
        await run(
            reconcile_social_posts().pipe(
                Effect.provideService(ZernioProvider, provider)
            )
        )
        const rows = await pg.query<{ status: string }>(
            "SELECT status FROM social_posts WHERE id=$1",
            [reservation.post.id]
        )
        expect(rows.rows[0]?.status).toBe("published")
        expect(requests).toHaveLength(1)
        expect(requests[0]).toContain(
            "/v1/posts/provider-scheduled-reconciliation"
        )
    })

    it("settles a missing provider post instead of polling it forever", async () => {
        const reservation = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.reserve_post(owner, {
                    ...input("scheduled-provider-missing"),
                    scheduled_for: Date.now() + 3_600_000,
                    publication_mode: "schedule",
                })
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                Effect.gen(function* () {
                    yield* store.claim_post(owner, reservation.post.id)
                    yield* store.record_provider_result(
                        owner.domain_id,
                        reservation.post.id,
                        "provider-post-missing",
                        "scheduled"
                    )
                })
            )
        )
        await pg.query(
            "UPDATE social_posts SET scheduled_for=1,updated_at=1 WHERE id=$1",
            [reservation.post.id]
        )
        let requests = 0
        const provider = make_zernio_provider(Redacted.make("test-key"), () => {
            requests++
            return Promise.resolve(
                Response.json({ error: "Post not found" }, { status: 404 })
            )
        })
        const reconcile = () =>
            run(
                reconcile_social_posts().pipe(
                    Effect.provideService(ZernioProvider, provider)
                )
            )
        await reconcile()
        const rows = await pg.query<{
            status: string
            error_message: string
        }>("SELECT status,error_message FROM social_posts WHERE id=$1", [
            reservation.post.id,
        ])
        expect(rows.rows[0]).toEqual({
            status: "failed",
            error_message: "Provider post not found",
        })
        await reconcile()
        expect(requests).toBe(1)
    })

    it("stores signed provider events once and reconciles the current post state", async () => {
        const reservation = await run(
            Effect.flatMap(SocialStore, (store) =>
                store.reserve_post(owner, {
                    ...input("webhook-provider-state"),
                    scheduled_for: Date.now() + 3_600_000,
                    publication_mode: "schedule",
                })
            )
        )
        await run(
            Effect.flatMap(SocialStore, (store) =>
                Effect.gen(function* () {
                    yield* store.claim_post(owner, reservation.post.id)
                    yield* store.record_provider_result(
                        owner.domain_id,
                        reservation.post.id,
                        "provider-webhook-state",
                        "scheduled"
                    )
                })
            )
        )
        const event = {
            id: "provider-event-webhook-state",
            event_type: "post.published",
            provider_post_id: "provider-webhook-state",
            occurred_at: Date.now(),
        }
        await run(record_social_provider_event(event))
        await run(record_social_provider_event(event))
        const provider = make_zernio_provider(Redacted.make("test-key"), () =>
            Promise.resolve(
                Response.json({
                    post: {
                        _id: "provider-webhook-state",
                        status: "published",
                    },
                })
            )
        )
        expect(
            await run(
                reconcile_social_provider_events().pipe(
                    Effect.provideService(ZernioProvider, provider)
                )
            )
        ).toBe(1)
        expect(
            await run(
                reconcile_social_provider_events().pipe(
                    Effect.provideService(ZernioProvider, provider)
                )
            )
        ).toBe(0)
        const rows = await pg.query<{ status: string }>(
            "SELECT status FROM social_posts WHERE id=$1",
            [reservation.post.id]
        )
        expect(rows.rows[0]?.status).toBe("published")
        const events = await pg.query<{
            id: string
            applied_at: string | null
        }>("SELECT id,applied_at FROM social_provider_events WHERE id=$1", [
            event.id,
        ])
        expect(events.rows).toHaveLength(1)
        expect(events.rows[0]?.applied_at).not.toBeNull()
    })
})

describe("Social PostgreSQL Remote reads", () => {
    it("serves the account query from the real store", async () => {
        const handlers = RemoteServer.handlers(SocialServer, owner)
        const result = await Effect.runPromise(
            handlers
                .FoldkitRemoteQuery({
                    query: "DomainSocialAccounts",
                    input: { domain_id: owner.domain_id },
                    window: { first: 1 },
                })
                .pipe(
                    Effect.provide(SocialRepositoryLive),
                    Effect.provideService(Sql, make_sql())
                )
        )
        expect(result.edges).toHaveLength(1)
    })
})
