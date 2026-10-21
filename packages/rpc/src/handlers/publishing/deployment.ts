/** # Publication deployment admission and execution */
import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Cause, Effect, Schedule, Schema } from "effect"
import { Sql, query_rows } from "@urm/db/sql"
import {
    DeploymentJobRecord,
    PublishingError,
    type DeployDevelopmentInput,
    type PromotePublicationInput,
    type DeploySubdomainInput,
    DeploymentChannel,
} from "@urm/domain/publishing"
import { PreviewDeploymentError } from "@urm/ssg/errors"
import { decodeSiteDeploymentDescriptor } from "@urm/ssg/deployment"
import { PreviewDeployer, PreviewDeployerLive } from "@urm/ssg/preview-deployer"
import {
    PagesRepository,
    PagesRepositoryLive,
    type PagesPrincipal,
} from "../pages/repository.ts"

const cancellation_requested =
    "Cancellation requested. Waiting for the upload process to stop."
const cancellation_uncertain =
    "Upload stopped at your request. Cloudflare may already have applied this deployment; check the target site before retrying."

const denied = () =>
    new PublishingError({
        message: "Publication deployment unavailable or access denied.",
    })
const job_columns = sql`j.id,j.release_id,j.channel,j.subdomain_id,j.is_preview,d.organization_id,j.requested_by_user_id,j.idempotency_key,j.status,j.artifact_checksum,j.url,j.error_message,j.created_at::float8 AS created_at,j.updated_at::float8 AS updated_at,j.completed_at::float8 AS completed_at`
export const load_deployment_jobs = (
    domain_id: string,
    subdomain_id: string | null = null
) =>
    query_rows(
        DeploymentJobRecord,
        sql`SELECT ${job_columns} FROM publication_deployment_jobs j JOIN domains d ON d.id=j.domain_id WHERE j.domain_id=${domain_id} AND j.subdomain_id IS NOT DISTINCT FROM ${subdomain_id} ORDER BY j.created_at DESC,j.id DESC LIMIT 100`
    )

const SubdomainTarget = Schema.Struct({
    id: Schema.String,
    slug: Schema.String,
    status: Schema.String,
    access: Schema.String,
    expires_at: Schema.NullOr(Schema.Number),
})
const subdomain_target = Effect.fn("Publishing.subdomainTarget")(function* (
    domain_id: string,
    subdomain_id: string
) {
    const rows = yield* query_rows(
        SubdomainTarget,
        sql`SELECT id,slug,status,access,expires_at::float8 AS expires_at FROM subdomains WHERE domain_id=${domain_id} AND id=${subdomain_id}`
    )
    const target = rows[0]
    if (target === undefined) return yield* Effect.fail(denied())
    if (
        target.status === "disabled" ||
        (target.expires_at !== null && target.expires_at <= Date.now())
    )
        return yield* Effect.fail(
            new PublishingError({
                message: "This subdomain is disabled or expired.",
            })
        )
    if (target.access === "password")
        return yield* Effect.fail(
            new PublishingError({
                message:
                    "Password-protected subdomains cannot use the static publishing provider yet.",
            })
        )
    return target
})

const request_deployment = Effect.fn("Publishing.requestDeployment")(function* (
    principal: PagesPrincipal,
    input: DeployDevelopmentInput & {
        readonly channel: DeploymentChannel
        readonly is_preview: boolean
    }
) {
    if (
        input.domain_id !== principal.domain_id ||
        (input.subdomain_slug === null
            ? input.channel === "live" || input.is_preview
            : input.channel !== "live")
    )
        return yield* Effect.fail(denied())
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            yield* tx.query(
                sql`SELECT id FROM domains WHERE id=${principal.domain_id} FOR UPDATE`
            )
            const pages = yield* PagesRepository
            const owner = yield* pages.authorize_pages(
                principal,
                input.domain_id,
                input.subdomain_slug,
                true
            )
            if (owner.subdomain_id !== null)
                yield* subdomain_target(input.domain_id, owner.subdomain_id)
            const existing = yield* query_rows(
                Schema.Struct({
                    id: Schema.String,
                    release_id: Schema.String,
                    channel: DeploymentChannel,
                    subdomain_id: Schema.NullOr(Schema.String),
                    is_preview: Schema.Boolean,
                }),
                sql`SELECT id,release_id,channel,subdomain_id,is_preview FROM publication_deployment_jobs WHERE domain_id=${input.domain_id} AND idempotency_key=${input.idempotency_key}`
            )
            if (existing[0] !== undefined) {
                if (
                    existing[0].release_id !== input.release_id ||
                    existing[0].channel !== input.channel ||
                    existing[0].subdomain_id !== owner.subdomain_id ||
                    existing[0].is_preview !== input.is_preview
                )
                    return yield* Effect.fail(denied())
                return existing[0].id
            }
            const releases = yield* query_rows(
                Schema.Struct({ artifact_checksum: Schema.String }),
                sql`SELECT artifact_checksum FROM publication_releases WHERE id=${input.release_id} AND domain_id=${input.domain_id} AND subdomain_id IS NOT DISTINCT FROM ${owner.subdomain_id} AND status='ready' AND artifact_checksum IS NOT NULL`
            )
            if (releases[0] === undefined)
                return yield* Effect.fail(
                    new PublishingError({
                        message:
                            "Choose a ready release from this publication before deploying.",
                    })
                )
            if (input.channel === "live" && !input.is_preview) {
                const previews = yield* query_rows(
                    Schema.Struct({
                        status: Schema.String,
                        artifact_checksum: Schema.String,
                    }),
                    sql`SELECT status,artifact_checksum FROM publication_deployment_jobs WHERE domain_id=${input.domain_id} AND subdomain_id=${owner.subdomain_id} AND release_id=${input.release_id} AND is_preview=true ORDER BY created_at DESC,id DESC LIMIT 1`
                )
                if (
                    previews[0]?.status !== "succeeded" ||
                    previews[0].artifact_checksum !==
                        releases[0].artifact_checksum
                )
                    return yield* Effect.fail(
                        new PublishingError({
                            message:
                                "Preview this release successfully before publishing live.",
                        })
                    )
            }
            if (input.channel === "staging" || input.channel === "production") {
                const previous_channel =
                    input.channel === "staging" ? "development" : "staging"
                const successful = yield* tx.query(
                    sql`SELECT id FROM publication_deployment_jobs WHERE domain_id=${input.domain_id} AND release_id=${input.release_id} AND channel=${previous_channel} AND status='succeeded' AND artifact_checksum=${releases[0].artifact_checksum} LIMIT 1`
                )
                if (successful.length === 0)
                    return yield* Effect.fail(
                        new PublishingError({
                            message: `Deploy this release successfully to ${previous_channel} before promoting to ${input.channel}.`,
                        })
                    )
            }
            const active = yield* tx.query(
                sql`SELECT id FROM publication_deployment_jobs WHERE domain_id=${input.domain_id} AND subdomain_id IS NOT DISTINCT FROM ${owner.subdomain_id} AND status IN ('pending','running')`
            )
            if (active.length > 0)
                return yield* Effect.fail(
                    new PublishingError({
                        message:
                            "A publication deployment is already queued or running. Wait for it to finish.",
                    })
                )
            const id = randomUUID()
            const now = Date.now()
            yield* tx.query(
                sql`INSERT INTO publication_deployment_jobs (id,domain_id,release_id,requested_by_user_id,session_id,channel,subdomain_id,is_preview,idempotency_key,status,artifact_checksum,created_at,updated_at) VALUES (${id},${input.domain_id},${input.release_id},${principal.account_id},${principal.session_id},${input.channel},${owner.subdomain_id},${input.is_preview},${input.idempotency_key},'pending',${releases[0].artifact_checksum},${now},${now})`
            )
            return id
        }).pipe(Effect.provide(PagesRepositoryLive))
    )
})

export const request_development = (
    principal: PagesPrincipal,
    input: DeployDevelopmentInput
) =>
    request_deployment(principal, {
        ...input,
        channel: "development",
        is_preview: false,
    })
export const request_promotion = (
    principal: PagesPrincipal,
    input: PromotePublicationInput
) => request_deployment(principal, { ...input, is_preview: false })
export const request_subdomain = (
    principal: PagesPrincipal,
    input: DeploySubdomainInput
) =>
    request_deployment(principal, {
        ...input,
        channel: "live",
        is_preview: input.mode === "preview",
    })

export const cancel_development = Effect.fn("Publishing.cancelDevelopment")(
    function* (
        principal: PagesPrincipal,
        input: {
            domain_id: string
            subdomain_slug: string | null
            job_id: string
        }
    ) {
        if (input.domain_id !== principal.domain_id)
            return yield* Effect.fail(denied())
        const pages = yield* PagesRepository
        const owner = yield* pages.authorize_pages(
            principal,
            input.domain_id,
            input.subdomain_slug,
            true
        )
        const db = yield* Sql
        const now = Date.now()
        const rows = yield* db.query(
            sql`UPDATE publication_deployment_jobs SET status=CASE WHEN status='pending' THEN 'cancelled' ELSE 'running' END,error_message=CASE WHEN status='running' THEN ${cancellation_requested} ELSE NULL END,updated_at=${now},completed_at=CASE WHEN status='pending' THEN ${now}::bigint ELSE NULL END WHERE id=${input.job_id} AND domain_id=${input.domain_id} AND subdomain_id IS NOT DISTINCT FROM ${owner.subdomain_id} AND status IN ('pending','running') RETURNING id`
        )
        if (rows.length === 0)
            return yield* Effect.fail(
                new PublishingError({
                    message:
                        "This job has already finished. Refresh to see its result.",
                })
            )
        return input.job_id
    }
)

const ClaimedJob = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    release_id: Schema.String,
    requested_by_user_id: Schema.String,
    session_id: Schema.String,
    channel: DeploymentChannel,
    subdomain_id: Schema.NullOr(Schema.String),
    is_preview: Schema.Boolean,
})
const claim_development = Effect.fn("Publishing.claimDevelopment")(
    function* () {
        const db = yield* Sql
        return yield* db.transaction(
            Effect.gen(function* () {
                const tx = yield* Sql
                // Provider calls are bounded to five minutes. Interrupted jobs are never
                // automatically replayed: the provider may have committed before a crash.
                const now = Date.now()
                yield* tx.query(
                    sql`UPDATE publication_deployment_jobs SET status='failed',error_message='The server stopped before deployment completion was recorded. Check the target site before retrying.',updated_at=${now},completed_at=${now} WHERE status='running' AND updated_at < ${now - 15 * 60_000}`
                )
                const jobs = yield* query_rows(
                    ClaimedJob,
                    sql`WITH next_job AS (SELECT id FROM publication_deployment_jobs WHERE status='pending' ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE publication_deployment_jobs j SET status='running',updated_at=${now} FROM next_job WHERE j.id=next_job.id RETURNING j.id,j.domain_id,j.release_id,j.requested_by_user_id,j.session_id,j.channel,j.subdomain_id,j.is_preview`
                )
                return jobs[0]
            })
        )
    }
)

export const run_development_job = Effect.fn("Publishing.runDevelopmentJob")(
    function* () {
        const job = yield* claim_development()
        if (job === undefined) return false
        const db = yield* Sql
        const deploy = Effect.gen(function* () {
            const pages = yield* PagesRepository
            const subdomain =
                job.subdomain_id === null
                    ? null
                    : yield* subdomain_target(job.domain_id, job.subdomain_id)
            const owner = yield* pages
                .authorize_pages(
                    {
                        account_id: job.requested_by_user_id,
                        session_id: job.session_id,
                        contact_id: null,
                        domain_id: job.domain_id,
                    },
                    job.domain_id,
                    subdomain?.slug ?? null,
                    true
                )
                .pipe(
                    Effect.mapError(
                        () =>
                            new PublishingError({
                                message:
                                    "Publication access changed before deployment. Sign in with write access before retrying.",
                            })
                    )
                )
            if (owner.subdomain_id !== job.subdomain_id)
                return yield* Effect.fail(denied())
            const domains = yield* query_rows(
                Schema.Struct({
                    organization_id: Schema.String,
                    name: Schema.String,
                    slug: Schema.String,
                }),
                sql`SELECT organization_id,name,slug FROM domains WHERE id=${job.domain_id}`
            )
            const domain = domains[0]
            if (domain === undefined) return yield* Effect.fail(denied())
            const hostname = `${subdomain === null ? (job.channel === "production" ? "" : job.channel === "development" ? "dev." : "staging.") : `${subdomain.slug}.`}${domain.slug}.urm.dev`
            const descriptor = yield* decodeSiteDeploymentDescriptor({
                deployment_id: job.id,
                build_id: job.release_id,
                release_id: job.release_id,
                correlation_id: job.id,
                org_id: domain.organization_id,
                domain_id: job.domain_id,
                domain_name: `${domain.slug}.urm.dev`,
                ...(job.subdomain_id === null
                    ? {}
                    : { subdomain_id: job.subdomain_id }),
                environment: job.is_preview ? "preview" : "production",
                ...(job.is_preview ? {} : { channel: job.channel }),
                hostnames: job.is_preview ? [] : [hostname],
                artifact_directory: `packages/ssg/dist/builds/pg-${job.release_id}`,
                ...(subdomain?.expires_at == null
                    ? {}
                    : { expires_at: subdomain.expires_at }),
            })
            const provider = yield* PreviewDeployer
            const result = yield* provider.deploy(descriptor)
            return job.is_preview ? result.url : `https://${hostname}`
        }).pipe(
            Effect.provide(PagesRepositoryLive),
            Effect.timeout("5 minutes")
        )
        const cancellation = query_rows(
            Schema.Struct({ error_message: Schema.NullOr(Schema.String) }),
            sql`SELECT error_message FROM publication_deployment_jobs WHERE id=${job.id}`
        ).pipe(
            Effect.map(
                (rows) => rows[0]?.error_message === cancellation_requested
            ),
            Effect.repeat({
                schedule: Schedule.spaced("250 millis"),
                until: (requested: boolean) => requested,
            }),
            Effect.as("cancelled")
        )
        const outcome = yield* Effect.result(
            Effect.raceFirst(deploy, cancellation)
        )
        const now = Date.now()
        // Final status and the cancellation request are reconciled in one write.
        const failure_message =
            outcome._tag === "Failure"
                ? outcome.failure instanceof PreviewDeploymentError &&
                  outcome.failure.operation === "hostname ownership conflict"
                    ? "The target hostname is attached to the previous Worker. Its provider identity must be migrated before retrying."
                    : outcome.failure instanceof PublishingError
                      ? outcome.failure.message
                      : outcome.failure instanceof PreviewDeploymentError &&
                          (outcome.failure.operation ===
                              "validate preview artifacts" ||
                              outcome.failure.operation ===
                                  "validate deployment artifacts")
                        ? "Saved build artifacts are missing or invalid on this server. Build a new release, then deploy it."
                        : "Publication deployment failed. Check server Cloudflare credentials, permissions and saved build artifacts, then retry."
                : null
        yield* db.transaction(
            Effect.gen(function* () {
                const tx = yield* Sql
                const completed = yield* query_rows(
                    Schema.Struct({ status: Schema.String }),
                    sql`UPDATE publication_deployment_jobs SET
            status=CASE WHEN error_message=${cancellation_requested} THEN 'cancelled' ELSE ${outcome._tag === "Success" ? "succeeded" : "failed"} END,
            url=CASE WHEN error_message=${cancellation_requested} THEN NULL ELSE ${outcome._tag === "Success" ? outcome.success : null} END,
            error_message=CASE WHEN error_message=${cancellation_requested} THEN ${cancellation_uncertain} ELSE ${failure_message} END,
            updated_at=${now},completed_at=${now} WHERE id=${job.id} AND status='running' RETURNING status`
                )
                if (
                    completed[0]?.status === "succeeded" &&
                    job.subdomain_id !== null &&
                    !job.is_preview
                )
                    yield* tx.query(
                        sql`UPDATE subdomains SET live_release_id=${job.release_id},live_deployment_id=${job.id},updated_at=${now} WHERE domain_id=${job.domain_id} AND id=${job.subdomain_id}`
                    )
                if (
                    completed[0]?.status === "succeeded" &&
                    job.subdomain_id === null &&
                    !job.is_preview
                ) {
                    if (job.channel === "development")
                        yield* tx.query(
                            sql`UPDATE domains SET development_release_id=${job.release_id},development_deployment_id=${job.id},updated_at=${now} WHERE id=${job.domain_id}`
                        )
                    if (job.channel === "staging")
                        yield* tx.query(
                            sql`UPDATE domains SET staging_release_id=${job.release_id},staging_deployment_id=${job.id},updated_at=${now} WHERE id=${job.domain_id}`
                        )
                    if (job.channel === "production")
                        yield* tx.query(
                            sql`UPDATE domains SET production_release_id=${job.release_id},production_deployment_id=${job.id},updated_at=${now} WHERE id=${job.domain_id}`
                        )
                }
            })
        )
        return true
    }
)

export const development_worker = run_development_job().pipe(
    Effect.catchCauseIf(
        (cause) => !Cause.hasInterrupts(cause),
        () =>
            Effect.logError(
                "Publication deployment worker could not access its queue"
            )
    ),
    Effect.repeat(Schedule.spaced("2 seconds"))
)

export const development_worker_live = development_worker.pipe(
    Effect.provide(PreviewDeployerLive)
)
