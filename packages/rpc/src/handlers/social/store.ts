import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/database/sql"
import { SocialAnalyticsSnapshot } from "@urm/contracts/social"
import { ContentTemplateSource } from "@urm/domain/schemas/content-templates"
import {
    ContentTemplateDescription,
    ContentTemplateName,
    ContentTemplateTags,
} from "@urm/domain/schemas/content-templates"

export interface SocialPrincipal extends AccountPrincipal {
    readonly domain_id: string
}

export class SocialStoreError extends Schema.TaggedError<SocialStoreError>()(
    "SocialStoreError",
    { message: Schema.String }
) {}

const Domain = Schema.Struct({
    id: Schema.String,
    organization_id: Schema.String,
})
const Profile = Schema.Struct({ provider_profile_id: Schema.String })
const Account = Schema.Struct({
    account_id: Schema.String,
    platform: Schema.String,
    active: Schema.Boolean,
})
export const SyncedSocialAccount = Schema.Struct({
    account_id: Schema.String,
    profile_id: Schema.String,
    platform: Schema.String,
    username: Schema.String,
    display_name: Schema.NullOr(Schema.String),
    avatar_url: Schema.NullOr(Schema.String),
    active: Schema.Boolean,
})
export type SyncedSocialAccount = typeof SyncedSocialAccount.Type
const StoredSocialAccount = Schema.Struct({
    domain_id: Schema.String,
    account_id: Schema.String,
    provider_profile_id: Schema.String,
    platform: Schema.String,
    username: Schema.String,
    display_name: Schema.NullOr(Schema.String),
    avatar_url: Schema.NullOr(Schema.String),
    active: Schema.Boolean,
    synced_at: Schema.Number,
})
export type StoredSocialAccount = typeof StoredSocialAccount.Type
const Image = Schema.Struct({ id: Schema.String, url: Schema.String })
const Template = Schema.Struct({
    id: Schema.String,
    revision: Schema.Number,
})
export const StoredSocialTemplate = Schema.Struct({
    id: Schema.String,
    organization_id: Schema.String,
    name: Schema.String,
    description: Schema.String,
    tags: Schema.Array(Schema.String),
    content: Schema.String,
    revision: Schema.Number,
    created_by_user_id: Schema.String,
    updated_by_user_id: Schema.String,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export type StoredSocialTemplate = typeof StoredSocialTemplate.Type
const StoredReservation = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    provider_post_id: Schema.NullOr(Schema.String),
    idempotency_key: Schema.String,
    status: Schema.String,
    content: Schema.String,
    account_ids: Schema.Array(Schema.String),
    media_ids: Schema.Array(Schema.String),
    media_urls: Schema.Array(Schema.String),
    platforms: Schema.Array(
        Schema.Struct({
            platform: Schema.String,
            account_id: Schema.String,
            status: Schema.String,
        })
    ),
    scheduled_for: Schema.NullOr(Schema.Number),
    test_mode: Schema.Boolean,
    template_source: Schema.NullOr(ContentTemplateSource),
    created_at: Schema.Number,
})
export type StoredReservation = typeof StoredReservation.Type
const StoredSocialPost = Schema.Struct({
    ...StoredReservation.fields,
    status: Schema.Literals([
        "pending",
        "submitting",
        "draft",
        "scheduled",
        "published",
        "partial",
        "failed",
        "cancelled",
    ]),
    error_message: Schema.NullOr(Schema.String),
    pending_draft_edit: Schema.Boolean,
})
export type StoredSocialPost = typeof StoredSocialPost.Type

export const ReservePostInput = Schema.Struct({
    idempotency_key: Schema.String.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(160)
    ),
    account_ids: Schema.Array(Schema.String).check(
        Schema.isMinLength(1),
        Schema.isMaxLength(16)
    ),
    media_ids: Schema.Array(Schema.String).check(Schema.isMaxLength(10)),
    content: Schema.Trimmed.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(5_000)
    ),
    scheduled_for: Schema.NullOr(Schema.Number),
    publication_mode: Schema.Literals(["draft", "publish_now", "schedule"]),
    template_id: Schema.NullOr(Schema.String),
})
export type ReservePostInput = typeof ReservePostInput.Type

export const UpdateDraftInput = Schema.Struct({
    account_ids: ReservePostInput.fields.account_ids,
    media_ids: ReservePostInput.fields.media_ids,
    content: ReservePostInput.fields.content,
})
export type UpdateDraftInput = typeof UpdateDraftInput.Type

export const SaveTemplateInput = Schema.Struct({
    template_id: Schema.NullOr(Schema.String),
    expected_revision: Schema.Number,
    name: ContentTemplateName,
    description: ContentTemplateDescription,
    tags: ContentTemplateTags,
    content: Schema.Trimmed.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(5_000)
    ),
})
export type SaveTemplateInput = typeof SaveTemplateInput.Type

const denied = (message = "Social operation unavailable or access denied") =>
    new SocialStoreError({ message })

const authorize = Effect.fn("Social.authorize")(function* (
    principal: SocialPrincipal,
    write = false
) {
    yield* require_account_domain(
        principal,
        principal.domain_id,
        write,
        null
    ).pipe(Effect.mapError(() => denied()))
})

const authorize_write = Effect.fn("Social.authorizeWrite")(function* (
    principal: SocialPrincipal
) {
    yield* authorize(principal, true)
})

const load_profile = Effect.fn("Social.profile")(function* (
    principal: SocialPrincipal
) {
    yield* authorize(principal)
    const profiles = yield* query_rows(
        Profile,
        sql`SELECT provider_profile_id FROM social_provider_profiles WHERE domain_id=${principal.domain_id}`
    )
    return profiles[0]?.provider_profile_id ?? null
})

const load_domain_slug = Effect.fn("Social.domainSlug")(function* (
    principal: SocialPrincipal
) {
    yield* authorize(principal)
    const domains = yield* query_rows(
        Schema.Struct({ slug: Schema.String }),
        sql`SELECT slug FROM domains WHERE id=${principal.domain_id}`
    )
    return domains[0]?.slug ?? null
})

const bind_profile = Effect.fn("Social.bindProfile")(function* (
    principal: SocialPrincipal,
    profile_id: string
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const domain = yield* query_rows(
                Domain,
                sql`SELECT id,organization_id FROM domains WHERE id=${principal.domain_id} FOR UPDATE`
            )
            if (domain.length !== 1) return yield* Effect.fail(denied())
            yield* authorize(principal, true)
            const current = yield* query_rows(
                Profile,
                sql`SELECT provider_profile_id FROM social_provider_profiles WHERE domain_id=${principal.domain_id}`
            )
            if (current[0]) return current[0].provider_profile_id
            const owner = yield* query_rows(
                Schema.Struct({ domain_id: Schema.String }),
                sql`SELECT domain_id FROM social_provider_profiles WHERE provider_profile_id=${profile_id}`
            )
            if (owner.length !== 0)
                return yield* Effect.fail(
                    denied("Social profile is already assigned")
                )
            const tx = yield* Sql
            yield* tx.query(
                sql`INSERT INTO social_provider_profiles (domain_id,provider_profile_id,created_at) VALUES (${principal.domain_id},${profile_id},${Date.now()})`
            )
            return profile_id
        })
    )
})

const load_accounts = Effect.fn("Social.loadAccounts")(function* (
    principal: SocialPrincipal
) {
    yield* authorize(principal)
    return yield* query_rows(
        StoredSocialAccount,
        sql`SELECT domain_id,account_id,provider_profile_id,platform,username,display_name,avatar_url,active,synced_at::float8 AS synced_at FROM social_accounts WHERE domain_id=${principal.domain_id} ORDER BY platform,username,account_id LIMIT 101`
    )
})

const replace_accounts = Effect.fn("Social.replaceAccounts")(function* (
    principal: SocialPrincipal,
    values: ReadonlyArray<SyncedSocialAccount>
) {
    const accounts = yield* Schema.decodeUnknownEffect(
        Schema.Array(SyncedSocialAccount)
    )(values).pipe(Effect.mapError(() => denied()))
    if (accounts.length > 100)
        return yield* Effect.fail(denied("Too many social accounts"))
    if (
        new Set(accounts.map((account) => account.account_id)).size !==
        accounts.length
    )
        return yield* Effect.fail(denied("Duplicate social account"))
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            yield* tx.query(
                sql`SELECT id FROM domains WHERE id=${principal.domain_id} FOR UPDATE`
            )
            yield* authorize(principal, true)
            const profiles = yield* query_rows(
                Profile,
                sql`SELECT provider_profile_id FROM social_provider_profiles WHERE domain_id=${principal.domain_id}`
            )
            const profile_id = profiles[0]?.provider_profile_id
            if (
                !profile_id ||
                accounts.some((account) => account.profile_id !== profile_id)
            )
                return yield* Effect.fail(
                    denied("The Social profile changed; sync again")
                )
            const now = Date.now()
            yield* tx.query(
                sql`UPDATE social_accounts SET active=false,synced_at=${now} WHERE domain_id=${principal.domain_id}`
            )
            for (const account of accounts)
                yield* tx.query(
                    sql`INSERT INTO social_accounts (domain_id,account_id,provider_profile_id,platform,username,display_name,avatar_url,active,synced_at) VALUES (${principal.domain_id},${account.account_id},${profile_id},${account.platform},${account.username},${account.display_name},${account.avatar_url},${account.active},${now}) ON CONFLICT (domain_id,account_id) DO UPDATE SET platform=EXCLUDED.platform,username=EXCLUDED.username,display_name=EXCLUDED.display_name,avatar_url=EXCLUDED.avatar_url,active=EXCLUDED.active,synced_at=EXCLUDED.synced_at`
                )
            return yield* load_accounts(principal)
        })
    )
})

const load_reservation = Effect.fn("Social.reservation")(function* (
    domain_id: string,
    idempotency_key: string
) {
    const rows = yield* query_rows(
        StoredReservation,
        sql`SELECT id,domain_id,provider_post_id,idempotency_key,status,content,account_ids,media_ids,media_urls,platforms,scheduled_for::float8 AS scheduled_for,test_mode,template_source,created_at::float8 AS created_at FROM social_posts WHERE domain_id=${domain_id} AND idempotency_key=${idempotency_key}`
    )
    return rows[0] ?? null
})

const load_posts = Effect.fn("Social.loadPosts")(function* (
    principal: SocialPrincipal
) {
    yield* authorize(principal)
    return yield* query_rows(
        StoredSocialPost,
        sql`SELECT p.id,p.domain_id,p.provider_post_id,p.idempotency_key,p.status,p.content,p.account_ids,p.media_ids,p.media_urls,p.platforms,p.scheduled_for::float8 AS scheduled_for,p.error_message,p.test_mode,p.template_source,p.created_at::float8 AS created_at,(p.status='submitting' AND p.provider_post_id IS NOT NULL AND e.post_id IS NOT NULL AND e.test_mode=true) AS pending_draft_edit FROM social_posts p LEFT JOIN social_post_edits e ON e.domain_id=p.domain_id AND e.post_id=p.id WHERE p.domain_id=${principal.domain_id} ORDER BY p.created_at DESC,p.id DESC LIMIT 100`
    )
})

const load_templates = Effect.fn("Social.loadTemplates")(function* (
    principal: SocialPrincipal
) {
    yield* authorize(principal)
    return yield* query_rows(
        StoredSocialTemplate,
        sql`SELECT t.id,t.organization_id,t.name,t.description,t.tags,t.content,t.revision,t.created_by_user_id,t.updated_by_user_id,t.created_at::float8 AS created_at,t.updated_at::float8 AS updated_at FROM social_templates t JOIN domains d ON d.organization_id=t.organization_id WHERE d.id=${principal.domain_id} ORDER BY t.updated_at DESC,t.id DESC LIMIT 100`
    )
})

const save_template = Effect.fn("Social.saveTemplate")(function* (
    principal: SocialPrincipal,
    value: SaveTemplateInput
) {
    const input = yield* Schema.decodeUnknownEffect(SaveTemplateInput)(
        value
    ).pipe(Effect.mapError(() => denied("Check the template and try again")))
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const domains = yield* query_rows(
                Domain,
                sql`SELECT id,organization_id FROM domains WHERE id=${principal.domain_id} FOR UPDATE`
            )
            const domain = domains[0]
            if (!domain) return yield* Effect.fail(denied())
            yield* authorize_write(principal)
            const tx = yield* Sql
            const now = Date.now()
            const id = input.template_id ?? randomUUID()
            if (input.template_id === null) {
                if (input.expected_revision !== 0)
                    return yield* Effect.fail(
                        denied("The template changed; refresh and try again")
                    )
                yield* tx.query(
                    sql`INSERT INTO social_templates (id,organization_id,name,description,tags,content,revision,created_by_user_id,updated_by_user_id,created_at,updated_at) VALUES (${id},${domain.organization_id},${input.name},${input.description},ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(input.tags)}::jsonb)),${input.content},1,${principal.account_id},${principal.account_id},${now},${now})`
                )
            } else {
                const changed = yield* query_rows(
                    Schema.Struct({ id: Schema.String }),
                    sql`UPDATE social_templates SET name=${input.name},description=${input.description},tags=ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(input.tags)}::jsonb)),content=${input.content},revision=revision+1,updated_by_user_id=${principal.account_id},updated_at=${now} WHERE id=${id} AND organization_id=${domain.organization_id} AND revision=${input.expected_revision} RETURNING id`
                )
                if (changed.length !== 1)
                    return yield* Effect.fail(
                        denied("The template changed; refresh and try again")
                    )
            }
            const saved = yield* query_rows(
                StoredSocialTemplate,
                sql`SELECT id,organization_id,name,description,tags,content,revision,created_by_user_id,updated_by_user_id,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM social_templates WHERE id=${id} AND organization_id=${domain.organization_id}`
            )
            if (!saved[0]) return yield* Effect.fail(denied())
            return saved[0]
        })
    )
})

const load_analytics = Effect.fn("Social.loadAnalytics")(function* (
    principal: SocialPrincipal,
    period: typeof SocialAnalyticsSnapshot.Type.period,
    platform: typeof SocialAnalyticsSnapshot.Type.platform,
    account_id: string | null
) {
    yield* authorize(principal)
    const rows = yield* query_rows(
        SocialAnalyticsSnapshot,
        sql`SELECT period,platform,account_id,post_count,metrics,follower_growth,daily,platform_breakdown,top_posts,warning,updated_at::float8 AS updated_at FROM social_analytics_snapshots WHERE domain_id=${principal.domain_id} AND period=${period} AND platform=${platform} AND account_key=${account_id ?? ""}`
    )
    return rows[0] ?? null
})

const save_analytics = Effect.fn("Social.saveAnalytics")(function* (
    principal: SocialPrincipal,
    value: typeof SocialAnalyticsSnapshot.Type
) {
    const snapshot = yield* Schema.decodeUnknownEffect(SocialAnalyticsSnapshot)(
        value
    ).pipe(Effect.mapError(() => denied()))
    yield* authorize_write(principal)
    const db = yield* Sql
    yield* db.query(
        sql`INSERT INTO social_analytics_snapshots (id,domain_id,period,platform,account_key,account_id,post_count,metrics,follower_growth,daily,platform_breakdown,top_posts,warning,updated_at) VALUES (${randomUUID()},${principal.domain_id},${snapshot.period},${snapshot.platform},${snapshot.account_id ?? ""},${snapshot.account_id},${snapshot.post_count},${JSON.stringify(snapshot.metrics)}::jsonb,${snapshot.follower_growth},${JSON.stringify(snapshot.daily)}::jsonb,${JSON.stringify(snapshot.platform_breakdown)}::jsonb,${JSON.stringify(snapshot.top_posts)}::jsonb,${snapshot.warning},${snapshot.updated_at}) ON CONFLICT (domain_id,period,platform,account_key) DO UPDATE SET account_id=EXCLUDED.account_id,post_count=EXCLUDED.post_count,metrics=EXCLUDED.metrics,follower_growth=EXCLUDED.follower_growth,daily=EXCLUDED.daily,platform_breakdown=EXCLUDED.platform_breakdown,top_posts=EXCLUDED.top_posts,warning=EXCLUDED.warning,updated_at=EXCLUDED.updated_at`
    )
    return snapshot
})

const reserve_post = Effect.fn("Social.reservePost")(function* (
    principal: SocialPrincipal,
    value: ReservePostInput
) {
    const input = yield* Schema.decodeUnknownEffect(ReservePostInput)(
        value
    ).pipe(Effect.mapError(() => denied("Check the post and try again")))
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const domain_id = principal.domain_id
            const domains = yield* query_rows(
                Domain,
                sql`SELECT id,organization_id FROM domains WHERE id=${domain_id} FOR UPDATE`
            )
            const domain = domains[0]
            if (!domain) return yield* Effect.fail(denied())
            yield* authorize(principal, true)
            const existing = yield* load_reservation(
                domain_id,
                input.idempotency_key
            )
            if (existing) {
                if (
                    existing.content !== input.content ||
                    existing.scheduled_for !== input.scheduled_for ||
                    existing.test_mode !==
                        (input.publication_mode === "draft") ||
                    existing.template_source?.template_id !==
                        (input.template_id === null
                            ? "social.blank"
                            : `organization.social.${input.template_id}`) ||
                    JSON.stringify(existing.account_ids) !==
                        JSON.stringify(input.account_ids) ||
                    JSON.stringify(existing.media_ids) !==
                        JSON.stringify(input.media_ids)
                )
                    return yield* Effect.fail(
                        denied(
                            "This submission key was already used for another post"
                        )
                    )
                return { post: existing, duplicate: true }
            }
            const profiles = yield* query_rows(
                Profile,
                sql`SELECT provider_profile_id FROM social_provider_profiles WHERE domain_id=${domain_id}`
            )
            if (!profiles[0])
                return yield* Effect.fail(
                    denied("Connect a Social profile before creating a post")
                )
            if (new Set(input.account_ids).size !== input.account_ids.length)
                return yield* Effect.fail(denied("Select each account once"))
            if (new Set(input.media_ids).size !== input.media_ids.length)
                return yield* Effect.fail(denied("Select each image once"))
            const accounts = yield* query_rows(
                Account,
                sql`SELECT account_id,platform,active FROM social_accounts WHERE domain_id=${domain_id} AND account_id IN ${sql`(${sql.join(
                    input.account_ids.map((id) => sql`${id}`),
                    sql`,`
                )})`}`
            )
            if (
                accounts.length !== input.account_ids.length ||
                accounts.some((account) => !account.active)
            )
                return yield* Effect.fail(
                    denied("Select only active accounts in this workspace")
                )
            if (
                accounts.some((account) => account.platform === "instagram") &&
                input.media_ids.length === 0
            )
                return yield* Effect.fail(
                    denied("Instagram posts require at least one image")
                )
            const images =
                input.media_ids.length === 0
                    ? []
                    : yield* query_rows(
                          Image,
                          sql`SELECT id,url FROM images WHERE domain_id=${domain_id} AND id IN ${sql`(${sql.join(
                              input.media_ids.map((id) => sql`${id}`),
                              sql`,`
                          )})`}`
                      )
            if (images.length !== input.media_ids.length)
                return yield* Effect.fail(
                    denied("Select only images in this workspace")
                )
            if (
                input.publication_mode === "schedule" &&
                (input.scheduled_for === null ||
                    input.scheduled_for <= Date.now())
            )
                return yield* Effect.fail(
                    denied("Choose a future time before scheduling")
                )
            if (
                input.publication_mode === "publish_now" &&
                input.scheduled_for !== null
            )
                return yield* Effect.fail(
                    denied("Publish-now posts cannot include a schedule")
                )
            if (
                input.scheduled_for !== null &&
                input.scheduled_for <= Date.now()
            )
                return yield* Effect.fail(
                    denied("Scheduled time must be in the future")
                )
            const templates =
                input.template_id === null
                    ? []
                    : yield* query_rows(
                          Template,
                          sql`SELECT id,revision FROM social_templates WHERE id=${input.template_id} AND organization_id=${domain.organization_id}`
                      )
            if (input.template_id !== null && !templates[0])
                return yield* Effect.fail(denied("The template is unavailable"))
            const template_source = templates[0]
                ? {
                      template_id: `organization.social.${templates[0].id}`,
                      template_version: templates[0].revision,
                      provenance: "organization",
                  }
                : {
                      template_id: "social.blank",
                      template_version: 1,
                      provenance: "builtin",
                  }
            const media_urls = input.media_ids.map(
                (id) => images.find((image) => image.id === id)?.url ?? ""
            )
            const platforms = input.account_ids.map((account_id) => ({
                account_id,
                platform:
                    accounts.find(
                        (account) => account.account_id === account_id
                    )?.platform ?? "unknown",
                status: "pending",
            }))
            const id = randomUUID()
            const now = Date.now()
            yield* tx.query(
                sql`INSERT INTO social_posts (id,domain_id,idempotency_key,status,content,account_ids,media_ids,media_urls,platforms,scheduled_for,test_mode,template_source,created_by_user_id,created_at,updated_at) VALUES (${id},${domain_id},${input.idempotency_key},'pending',${input.content},ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(input.account_ids)}::jsonb)),ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(input.media_ids)}::jsonb)),ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(media_urls)}::jsonb)),${JSON.stringify(platforms)}::jsonb,${input.scheduled_for},${input.publication_mode === "draft"},${JSON.stringify(template_source)}::jsonb,${principal.account_id},${now},${now})`
            )
            const post = yield* load_reservation(
                domain_id,
                input.idempotency_key
            )
            if (!post) return yield* Effect.fail(denied())
            return { post, duplicate: false }
        })
    )
})

const claim_post = Effect.fn("Social.claimPost")(function* (
    principal: SocialPrincipal,
    post_id: string
) {
    yield* authorize(principal, true)
    const rows = yield* query_rows(
        Schema.Struct({ id: Schema.String }),
        sql`UPDATE social_posts SET status='submitting',updated_at=${Date.now()} WHERE id=${post_id} AND domain_id=${principal.domain_id} AND status='pending' RETURNING id`
    )
    return rows.length === 1
})

const load_post = Effect.fn("Social.loadPost")(function* (
    principal: SocialPrincipal,
    post_id: string
) {
    yield* authorize(principal)
    const posts = yield* query_rows(
        StoredReservation,
        sql`SELECT id,domain_id,provider_post_id,idempotency_key,status,content,account_ids,media_ids,media_urls,platforms,scheduled_for::float8 AS scheduled_for,test_mode,template_source,created_at::float8 AS created_at FROM social_posts WHERE domain_id=${principal.domain_id} AND id=${post_id}`
    )
    if (!posts[0]) return yield* Effect.fail(denied())
    return posts[0]
})

const has_pending_draft_edit = Effect.fn("Social.hasPendingDraftEdit")(
    function* (principal: SocialPrincipal, post_id: string) {
        yield* authorize(principal)
        const rows = yield* query_rows(
            Schema.Struct({ id: Schema.String }),
            sql`SELECT p.id FROM social_posts p JOIN social_post_edits e ON e.domain_id=p.domain_id AND e.post_id=p.id WHERE p.id=${post_id} AND p.domain_id=${principal.domain_id} AND p.status='submitting' AND e.test_mode=true`
        )
        return rows.length !== 0
    }
)

const claim_draft_publish = Effect.fn("Social.claimDraftPublish")(function* (
    principal: SocialPrincipal,
    post_id: string
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            yield* authorize_write(principal)
            const posts = yield* query_rows(
                StoredReservation,
                sql`SELECT id,domain_id,provider_post_id,idempotency_key,status,content,account_ids,media_ids,media_urls,platforms,scheduled_for::float8 AS scheduled_for,test_mode,template_source,created_at::float8 AS created_at FROM social_posts WHERE id=${post_id} AND domain_id=${principal.domain_id} FOR UPDATE`
            )
            const post = posts[0]
            if (!post || post.provider_post_id === null)
                return yield* Effect.fail(
                    denied("The saved draft is unavailable")
                )
            if (post.status === "submitting" && post.test_mode) {
                const edits = yield* query_rows(
                    Schema.Struct({ id: Schema.String }),
                    sql`SELECT id FROM social_post_edits WHERE domain_id=${principal.domain_id} AND post_id=${post_id} AND test_mode=true`
                )
                if (edits.length === 0) return { post, claimed: false }
            }
            if (post.status !== "draft")
                return yield* Effect.fail(
                    denied("Only a saved draft can be published")
                )
            const tx = yield* Sql
            const now = Date.now()
            yield* tx.query(
                sql`UPDATE social_post_edits SET test_mode=false,updated_at=${now} WHERE domain_id=${principal.domain_id} AND post_id=${post_id}`
            )
            yield* tx.query(
                sql`UPDATE social_posts SET status='submitting',error_message=NULL,updated_at=${now} WHERE id=${post_id} AND domain_id=${principal.domain_id} AND status='draft'`
            )
            return { post, claimed: true }
        })
    )
})

const record_draft_publication = Effect.fn("Social.recordDraftPublication")(
    function* (
        domain_id: string,
        post_id: string,
        provider_post_id: string,
        status:
            | "submitting"
            | "scheduled"
            | "published"
            | "partial"
            | "failed"
            | "cancelled"
    ) {
        const rows = yield* query_rows(
            Schema.Struct({ id: Schema.String }),
            sql`UPDATE social_posts p SET status=${status},test_mode=false,error_message=NULL,updated_at=${Date.now()} WHERE p.id=${post_id} AND p.domain_id=${domain_id} AND p.provider_post_id=${provider_post_id} AND p.status='submitting' AND p.test_mode=true AND NOT EXISTS (SELECT 1 FROM social_post_edits e WHERE e.domain_id=p.domain_id AND e.post_id=p.id AND e.test_mode=true) RETURNING p.id`
        )
        if (rows.length !== 1) return yield* Effect.fail(denied())
    }
)

const reject_draft_publication = Effect.fn("Social.rejectDraftPublication")(
    function* (
        domain_id: string,
        post_id: string,
        provider_post_id: string,
        message: string
    ) {
        const rows = yield* query_rows(
            Schema.Struct({ id: Schema.String }),
            sql`UPDATE social_posts p SET status='draft',error_message=${message},updated_at=${Date.now()} WHERE p.id=${post_id} AND p.domain_id=${domain_id} AND p.provider_post_id=${provider_post_id} AND p.status='submitting' AND p.test_mode=true AND NOT EXISTS (SELECT 1 FROM social_post_edits e WHERE e.domain_id=p.domain_id AND e.post_id=p.id AND e.test_mode=true) RETURNING p.id`
        )
        if (rows.length !== 1) return yield* Effect.fail(denied())
    }
)

const claim_draft_edit = Effect.fn("Social.claimDraftEdit")(function* (
    principal: SocialPrincipal,
    post_id: string,
    value: UpdateDraftInput
) {
    const input = yield* Schema.decodeUnknownEffect(UpdateDraftInput)(
        value
    ).pipe(Effect.mapError(() => denied("Check the draft and try again")))
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            yield* authorize_write(principal)
            const posts = yield* query_rows(
                StoredReservation,
                sql`SELECT id,domain_id,provider_post_id,idempotency_key,status,content,account_ids,media_ids,media_urls,platforms,scheduled_for::float8 AS scheduled_for,test_mode,template_source,created_at::float8 AS created_at FROM social_posts WHERE id=${post_id} AND domain_id=${principal.domain_id} FOR UPDATE`
            )
            const post = posts[0]
            if (!post || post.provider_post_id === null)
                return yield* Effect.fail(
                    denied("The saved draft is unavailable")
                )
            if (post.status === "submitting") {
                const pending = yield* query_rows(
                    UpdateDraftInput,
                    sql`SELECT content,account_ids,media_ids FROM social_post_edits WHERE domain_id=${principal.domain_id} AND post_id=${post_id}`
                )
                if (
                    !pending[0] ||
                    pending[0].content !== input.content ||
                    JSON.stringify(pending[0].account_ids) !==
                        JSON.stringify(input.account_ids) ||
                    JSON.stringify(pending[0].media_ids) !==
                        JSON.stringify(input.media_ids)
                )
                    return yield* Effect.fail(
                        denied(
                            "This draft has an uncertain edit; retry the same edit"
                        )
                    )
                const edits = yield* query_rows(
                    Schema.Struct({
                        media_urls: Schema.Array(Schema.String),
                        platforms: StoredReservation.fields.platforms,
                    }),
                    sql`SELECT media_urls,platforms FROM social_post_edits WHERE domain_id=${principal.domain_id} AND post_id=${post_id}`
                )
                if (!edits[0]) return yield* Effect.fail(denied())
                return { post, ...input, ...edits[0] }
            }
            if (post.status !== "draft")
                return yield* Effect.fail(
                    denied("Only saved drafts can be edited")
                )
            if (new Set(input.account_ids).size !== input.account_ids.length)
                return yield* Effect.fail(denied("Select each account once"))
            if (new Set(input.media_ids).size !== input.media_ids.length)
                return yield* Effect.fail(denied("Select each image once"))
            const accounts = yield* query_rows(
                Account,
                sql`SELECT account_id,platform,active FROM social_accounts WHERE domain_id=${principal.domain_id} AND account_id IN ${sql`(${sql.join(
                    input.account_ids.map((id) => sql`${id}`),
                    sql`,`
                )})`}`
            )
            if (
                accounts.length !== input.account_ids.length ||
                accounts.some((account) => !account.active)
            )
                return yield* Effect.fail(
                    denied("Select only active accounts in this workspace")
                )
            if (
                accounts.some((account) => account.platform === "instagram") &&
                input.media_ids.length === 0
            )
                return yield* Effect.fail(
                    denied("Instagram posts require at least one image")
                )
            const images =
                input.media_ids.length === 0
                    ? []
                    : yield* query_rows(
                          Image,
                          sql`SELECT id,url FROM images WHERE domain_id=${principal.domain_id} AND id IN ${sql`(${sql.join(
                              input.media_ids.map((id) => sql`${id}`),
                              sql`,`
                          )})`}`
                      )
            if (images.length !== input.media_ids.length)
                return yield* Effect.fail(
                    denied("Select only images in this workspace")
                )
            const media_urls = input.media_ids.map(
                (id) => images.find((image) => image.id === id)?.url ?? ""
            )
            const platforms = input.account_ids.map((account_id) => ({
                account_id,
                platform:
                    accounts.find(
                        (account) => account.account_id === account_id
                    )?.platform ?? "unknown",
                status: "pending",
            }))
            const now = Date.now()
            const tx = yield* Sql
            yield* tx.query(
                sql`INSERT INTO social_post_edits (id,domain_id,post_id,content,account_ids,media_ids,media_urls,platforms,scheduled_for,test_mode,template_source,updated_at) VALUES (${randomUUID()},${principal.domain_id},${post_id},${input.content},ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(input.account_ids)}::jsonb)),ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(input.media_ids)}::jsonb)),ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(media_urls)}::jsonb)),${JSON.stringify(platforms)}::jsonb,NULL,true,${JSON.stringify(post.template_source)}::jsonb,${now}) ON CONFLICT (domain_id,post_id) DO UPDATE SET content=EXCLUDED.content,account_ids=EXCLUDED.account_ids,media_ids=EXCLUDED.media_ids,media_urls=EXCLUDED.media_urls,platforms=EXCLUDED.platforms,scheduled_for=NULL,test_mode=true,updated_at=EXCLUDED.updated_at`
            )
            yield* tx.query(
                sql`UPDATE social_posts SET status='submitting',error_message=NULL,updated_at=${now} WHERE id=${post_id} AND domain_id=${principal.domain_id}`
            )
            return { post, ...input, media_urls, platforms }
        })
    )
})

const load_pending_draft_edit = Effect.fn("Social.loadPendingDraftEdit")(
    function* (principal: SocialPrincipal, post_id: string) {
        yield* authorize_write(principal)
        const edits = yield* query_rows(
            UpdateDraftInput,
            sql`SELECT e.content,e.account_ids,e.media_ids FROM social_post_edits e JOIN social_posts p ON p.id=e.post_id AND p.domain_id=e.domain_id WHERE e.domain_id=${principal.domain_id} AND e.post_id=${post_id} AND p.status='submitting' AND p.provider_post_id IS NOT NULL`
        )
        if (!edits[0])
            return yield* Effect.fail(
                denied("No pending draft edit is available")
            )
        return edits[0]
    }
)

const complete_draft_edit = Effect.fn("Social.completeDraftEdit")(function* (
    principal: SocialPrincipal,
    post_id: string,
    provider_post_id: string
) {
    const rows = yield* query_rows(
        Schema.Struct({ id: Schema.String }),
        sql`UPDATE social_posts p SET content=e.content,account_ids=e.account_ids,media_ids=e.media_ids,media_urls=e.media_urls,platforms=e.platforms,scheduled_for=NULL,test_mode=true,status='draft',error_message=NULL,updated_at=${Date.now()} FROM social_post_edits e WHERE p.id=${post_id} AND p.domain_id=${principal.domain_id} AND p.provider_post_id=${provider_post_id} AND p.status='submitting' AND e.domain_id=p.domain_id AND e.post_id=p.id RETURNING p.id`
    )
    if (rows.length === 1) return
    const current = yield* load_post(principal, post_id)
    const edits = yield* query_rows(
        UpdateDraftInput,
        sql`SELECT content,account_ids,media_ids FROM social_post_edits WHERE domain_id=${principal.domain_id} AND post_id=${post_id}`
    )
    if (
        current.provider_post_id === provider_post_id &&
        current.status === "draft" &&
        edits[0]?.content === current.content &&
        JSON.stringify(edits[0]?.account_ids) ===
            JSON.stringify(current.account_ids) &&
        JSON.stringify(edits[0]?.media_ids) ===
            JSON.stringify(current.media_ids)
    )
        return
    return yield* Effect.fail(
        denied("Draft status changed; refresh before editing")
    )
})

const reject_draft_edit = Effect.fn("Social.rejectDraftEdit")(function* (
    principal: SocialPrincipal,
    post_id: string,
    message: string
) {
    yield* Effect.flatMap(Sql, (db) =>
        db.query(
            sql`UPDATE social_posts SET status='draft',error_message=${message},updated_at=${Date.now()} WHERE id=${post_id} AND domain_id=${principal.domain_id} AND status='submitting' AND provider_post_id IS NOT NULL`
        )
    )
})

const record_provider_result = Effect.fn("Social.recordProviderResult")(
    function* (
        domain_id: string,
        post_id: string,
        provider_post_id: string,
        status:
            | "draft"
            | "scheduled"
            | "published"
            | "partial"
            | "failed"
            | "cancelled"
            | "submitting"
    ) {
        const rows = yield* query_rows(
            Schema.Struct({ id: Schema.String }),
            sql`UPDATE social_posts SET provider_post_id=${provider_post_id},status=CASE WHEN status='submitting' THEN ${status} ELSE status END,error_message=NULL,updated_at=${Date.now()} WHERE id=${post_id} AND domain_id=${domain_id} AND (status='submitting' OR provider_post_id=${provider_post_id}) AND (provider_post_id IS NULL OR provider_post_id=${provider_post_id}) RETURNING id`
        )
        if (rows.length !== 1) return yield* Effect.fail(denied())
    }
)

const record_provider_rejection = Effect.fn("Social.recordProviderRejection")(
    function* (domain_id: string, post_id: string, message: string) {
        yield* Effect.flatMap(Sql, (db) =>
            db.query(
                sql`UPDATE social_posts SET status='failed',error_message=${message},updated_at=${Date.now()} WHERE id=${post_id} AND domain_id=${domain_id} AND status='submitting' AND provider_post_id IS NULL`
            )
        )
    }
)

const record_uncertain_result = Effect.fn("Social.recordUncertainResult")(
    function* (domain_id: string, post_id: string) {
        yield* Effect.flatMap(Sql, (db) =>
            db.query(
                sql`UPDATE social_posts SET error_message='Provider response is uncertain; reconciliation required',updated_at=${Date.now()} WHERE id=${post_id} AND domain_id=${domain_id} AND status='submitting' AND provider_post_id IS NULL`
            )
        )
    }
)

const refresh_provider_status = Effect.fn("Social.refreshProviderStatus")(
    function* (
        domain_id: string,
        post_id: string,
        provider_post_id: string,
        status:
            | "draft"
            | "scheduled"
            | "published"
            | "partial"
            | "failed"
            | "cancelled"
            | "submitting"
    ) {
        const rows = yield* query_rows(
            Schema.Struct({ id: Schema.String }),
            sql`UPDATE social_posts p SET status=${status},error_message=NULL,updated_at=${Date.now()} WHERE p.id=${post_id} AND p.domain_id=${domain_id} AND p.provider_post_id=${provider_post_id} AND p.status<>'cancelled' AND NOT (p.status='submitting' AND EXISTS (SELECT 1 FROM social_post_edits e WHERE e.domain_id=p.domain_id AND e.post_id=p.id AND e.test_mode=true)) RETURNING p.id`
        )
        if (rows.length !== 1) return yield* Effect.fail(denied())
    }
)

const mark_provider_missing = Effect.fn("Social.markProviderMissing")(
    function* (domain_id: string, post_id: string, provider_post_id: string) {
        yield* Effect.flatMap(Sql, (db) =>
            db.query(
                sql`UPDATE social_posts p SET status='failed',error_message='Provider post not found',updated_at=${Date.now()} WHERE p.id=${post_id} AND p.domain_id=${domain_id} AND p.provider_post_id=${provider_post_id} AND p.status IN ('submitting','scheduled') AND NOT EXISTS (SELECT 1 FROM social_post_edits e WHERE e.domain_id=p.domain_id AND e.post_id=p.id AND e.test_mode=true)`
            )
        )
    }
)

const mark_cancelled = Effect.fn("Social.markCancelled")(function* (
    principal: SocialPrincipal,
    post_id: string,
    provider_post_id: string
) {
    yield* authorize_write(principal)
    const rows = yield* query_rows(
        Schema.Struct({ id: Schema.String }),
        sql`UPDATE social_posts SET status='cancelled',error_message=NULL,updated_at=${Date.now()} WHERE id=${post_id} AND domain_id=${principal.domain_id} AND provider_post_id=${provider_post_id} AND status IN ('draft','scheduled','failed') RETURNING id`
    )
    if (rows.length !== 1)
        return yield* Effect.fail(
            denied("Post status changed; refresh before cancelling")
        )
})

const delete_post = Effect.fn("Social.deletePost")(function* (
    principal: SocialPrincipal,
    post_id: string,
    expected_status:
        | "draft"
        | "scheduled"
        | "failed"
        | "published"
        | "partial"
        | "cancelled"
) {
    const db = yield* Sql
    yield* db.transaction(
        Effect.gen(function* () {
            yield* authorize_write(principal)
            const rows = yield* query_rows(
                Schema.Struct({ id: Schema.String }),
                sql`DELETE FROM social_posts WHERE id=${post_id} AND domain_id=${principal.domain_id} AND status=${expected_status} RETURNING id`
            )
            if (rows.length !== 1)
                return yield* Effect.fail(
                    denied("Post status changed; refresh before deleting")
                )
            const tx = yield* Sql
            yield* tx.query(
                sql`DELETE FROM social_post_edits WHERE post_id=${post_id} AND domain_id=${principal.domain_id}`
            )
        })
    )
})

export interface SocialStoreService {
    readonly authorize_write: typeof authorize_write
    readonly load_profile: typeof load_profile
    readonly load_domain_slug: typeof load_domain_slug
    readonly bind_profile: typeof bind_profile
    readonly load_accounts: typeof load_accounts
    readonly load_posts: typeof load_posts
    readonly load_templates: typeof load_templates
    readonly save_template: typeof save_template
    readonly load_analytics: typeof load_analytics
    readonly save_analytics: typeof save_analytics
    readonly replace_accounts: typeof replace_accounts
    readonly reserve_post: typeof reserve_post
    readonly claim_post: typeof claim_post
    readonly load_post: typeof load_post
    readonly has_pending_draft_edit: typeof has_pending_draft_edit
    readonly claim_draft_publish: typeof claim_draft_publish
    readonly record_draft_publication: typeof record_draft_publication
    readonly reject_draft_publication: typeof reject_draft_publication
    readonly claim_draft_edit: typeof claim_draft_edit
    readonly load_pending_draft_edit: typeof load_pending_draft_edit
    readonly complete_draft_edit: typeof complete_draft_edit
    readonly reject_draft_edit: typeof reject_draft_edit
    readonly record_provider_result: typeof record_provider_result
    readonly record_provider_rejection: typeof record_provider_rejection
    readonly record_uncertain_result: typeof record_uncertain_result
    readonly refresh_provider_status: typeof refresh_provider_status
    readonly mark_provider_missing: typeof mark_provider_missing
    readonly mark_cancelled: typeof mark_cancelled
    readonly delete_post: typeof delete_post
}

export class SocialStore extends Context.Service<
    SocialStore,
    SocialStoreService
>()("@urm/rpc/SocialStore") {}

export const SocialStoreLive = Layer.succeed(
    SocialStore,
    SocialStore.of({
        authorize_write,
        load_profile,
        load_domain_slug,
        bind_profile,
        load_accounts,
        load_posts,
        load_templates,
        save_template,
        load_analytics,
        save_analytics,
        replace_accounts,
        reserve_post,
        claim_post,
        load_post,
        has_pending_draft_edit,
        claim_draft_publish,
        record_draft_publication,
        reject_draft_publication,
        claim_draft_edit,
        load_pending_draft_edit,
        complete_draft_edit,
        reject_draft_edit,
        record_provider_result,
        record_provider_rejection,
        record_uncertain_result,
        refresh_provider_status,
        mark_provider_missing,
        mark_cancelled,
        delete_post,
    })
)
