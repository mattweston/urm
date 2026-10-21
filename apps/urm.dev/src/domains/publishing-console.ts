import { Effect, Option, Schema as S, Struct } from "effect"
import { Command, Submodel } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { taggedStruct } from "foldkit/schema"
import { Remote, RemoteMutationError } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import {
    PublicationRelease,
    PublicationDeployment,
    PublicationJob,
} from "./publishing-records.ts"
import {
    PublishingLibrary,
    PublishingJobs,
    PublishingJobsSummary,
    PublicationJobs,
    PublicationPromotionJobs,
    PublishingLibrarySummary,
    PublicationReleases,
    BuildPublication,
    DeployDevelopment,
    PromotePublication,
    CancelDeployment,
    PublishingOwners,
    PublishingOwnersSummary,
    PublicationOwners,
    DeploySubdomain,
} from "@urm/contracts/publishing"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"
import * as Console from "./publishing-legacy.ts"
export type { OwnerSubdomain } from "./publishing-legacy.ts"
export {
    pending_job_progress,
    deployment_progress,
} from "./publishing-legacy.ts"
const ui_schema = S.Struct(
    Struct.omit(Console.Model.fields, [
        "releases",
        "deployments",
        "jobs",
        "can_build",
        "can_deploy",
    ])
)
const ui_only = (model: Console.Model) =>
    Struct.omit(model, [
        "releases",
        "deployments",
        "jobs",
        "can_build",
        "can_deploy",
    ])
export const Model = S.Struct({
    ui: ui_schema,
    remote: Remote.Model,
    account_id: S.String,
    domain_id: S.String,
    subdomain_slug: S.NullOr(S.String),
    can_write: S.Boolean,
    epoch: S.Number,
    pending: S.Boolean,
    watched_job: S.NullOr(S.String),
    poll_token: S.Number,
    promotions_available: S.Boolean,
})
export type Model = typeof Model.Type
const Loaded = taggedStruct("PublishingLoaded", {
    epoch: S.Number,
    remote: Remote.Model,
    built: S.Boolean,
    promotions_available: S.optional(S.Boolean),
    job_id: S.NullOr(S.String),
})
const Failed = taggedStruct("PublishingFailed", {
    epoch: S.Number,
    error: S.String,
})
const Poll = taggedStruct("PollPublishing", {
    epoch: S.Number,
    token: S.Number,
})
export const Refreshed = taggedStruct("PublishingRefreshed")
export const Message = S.Union([
    Console.Message,
    Loaded,
    Failed,
    Refreshed,
    Poll,
])
export type Message = typeof Message.Type
export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, ContactsApi>>,
]
export const init = (): Model => ({
    ui: ui_only(Console.init()),
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    subdomain_slug: null,
    can_write: false,
    epoch: 0,
    pending: false,
    watched_job: null,
    poll_token: 0,
    promotions_available: false,
})
export const clear = (model?: Model): Model => ({
    ...init(),
    epoch: (model?.epoch ?? 0) + 1,
})
const CacheModel = S.Struct({ remote: Remote.Model })
const Cache = Surface.application({
    Model: CacheModel,
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: typeof CacheModel.Type) => ({ model }),
})
export const Data = Remote.make({
    model: Cache.model.remote,
    entities: [PublishingLibrary, PublishingJobs, PublishingOwners],
    queries: [
        PublicationReleases,
        PublicationJobs,
        PublicationPromotionJobs,
        PublicationOwners,
    ],
    mutations: [
        BuildPublication,
        DeployDevelopment,
        PromotePublication,
        DeploySubdomain,
        CancelDeployment,
    ],
})
const query = (domain_id: string, subdomain_slug: string | null) =>
    Data.query(
        PublicationReleases,
        { domain_id, subdomain_slug },
        { select: PublishingLibrarySummary, first: 1 }
    )
export const library = (model: Model) => {
    const result = query(model.domain_id, model.subdomain_slug).read({
        remote: model.remote,
    })
    return result._tag === "Ready" ? result.value.items[0] : undefined
}
const jobs_query = (domain_id: string, subdomain_slug: string | null) =>
    Data.query(
        PublicationJobs,
        { domain_id, subdomain_slug },
        { select: PublishingJobsSummary, first: 1 }
    )
export const jobs_library = (model: Model) => {
    const result = jobs_query(model.domain_id, model.subdomain_slug).read({
        remote: model.remote,
    })
    return result._tag === "Ready" ? result.value.items[0] : undefined
}
const owners_query = (domain_id: string) =>
    Data.query(
        PublicationOwners,
        { domain_id },
        { select: PublishingOwnersSummary, first: 1 }
    )
export const owners_library = (model: Model) => {
    const result = owners_query(model.domain_id).read({ remote: model.remote })
    return result._tag === "Ready" ? result.value.items[0] : undefined
}
export const publication_owners = (
    model: Model
): ReadonlyArray<Console.OwnerSubdomain> =>
    owners_library(model)?.subdomains ?? []
const latest_preview = (model: Model, release_id: string) =>
    jobs_library(model)?.jobs.find(
        (job) => job.release_id === release_id && job.is_preview === true
    )
export const project = (model: Model): Console.Model => ({
    ...model.ui,
    busy: model.pending,
    can_build: model.can_write && library(model) !== undefined,
    can_deploy:
        model.can_write &&
        (model.subdomain_slug === null ||
            owners_library(model) !== undefined) &&
        jobs_library(model) !== undefined &&
        (library(model)?.releases.some(
            (release) => release.status === "ready"
        ) ??
            false) &&
        !(
            jobs_library(model)?.jobs.some(
                (job) => job.status === "pending" || job.status === "running"
            ) ?? false
        ),
    development_only:
        model.subdomain_slug === null && !model.promotions_available,
    deployment_data_available: jobs_library(model) !== undefined,
    loading_releases: model.pending && library(model) === undefined,
    loading_deployments: false,
    loading_jobs: false,
    releases: (library(model)?.releases ?? []).flatMap((release) =>
        Option.match(
            S.decodeUnknownOption(PublicationRelease)({
                _id: release.id,
                _creationTime: release.created_at,
                domain_id: model.domain_id,
                created_by_user_id: model.account_id,
                status: release.status,
                snapshot: release.snapshot,
                created_at: release.created_at,
                ...(release.artifact_checksum === null
                    ? {}
                    : { artifact_checksum: release.artifact_checksum }),
                ...(release.error_message === null
                    ? {}
                    : { error_message: release.error_message }),
                ...(release.completed_at === null
                    ? {}
                    : { completed_at: release.completed_at }),
            }),
            { onNone: () => [], onSome: (value) => [value] }
        )
    ),
    deployments: (jobs_library(model)?.jobs ?? []).flatMap((job) =>
        Option.match(
            S.decodeUnknownOption(PublicationDeployment)({
                _id: job.id,
                _creationTime: job.created_at,
                domain_id: model.domain_id,
                release_id: job.release_id,
                channel: job.channel ?? "development",
                is_preview: job.is_preview ?? false,
                ...(job.subdomain_id == null
                    ? {}
                    : { subdomain_id: job.subdomain_id }),
                status: job.status === "running" ? "deploying" : job.status,
                artifact_checksum: job.artifact_checksum,
                created_at: job.created_at,
                updated_at: job.updated_at,
                ...(job.url === null ? {} : { url: job.url }),
                ...(job.error_message === null
                    ? {}
                    : { error_message: job.error_message }),
                ...(job.status === "succeeded" && job.completed_at !== null
                    ? { deployed_at: job.completed_at }
                    : {}),
            }),
            { onNone: () => [], onSome: (value) => [value] }
        )
    ),
    jobs: (jobs_library(model)?.jobs ?? []).flatMap((job) =>
        Option.match(
            S.decodeUnknownOption(PublicationJob)({
                _id: job.id,
                _creationTime: job.created_at,
                domain_id: model.domain_id,
                organization_id: job.organization_id,
                release_id: job.release_id,
                deployment_id: job.id,
                requested_by_user_id: job.requested_by_user_id,
                idempotency_key: job.idempotency_key,
                operation:
                    job.is_preview === true
                        ? "preview"
                        : job.channel === "staging" ||
                            job.channel === "production"
                          ? "promote"
                          : "deploy",
                channel: job.channel ?? "development",
                ...(job.subdomain_id == null
                    ? {}
                    : { subdomain_id: job.subdomain_id }),
                status: job.status,
                created_at: job.created_at,
                updated_at: job.updated_at,
                ...(job.error_message === null
                    ? {}
                    : { error_message: job.error_message }),
                ...(job.completed_at === null
                    ? {}
                    : { completed_at: job.completed_at }),
            }),
            { onNone: () => [], onSome: (value) => [value] }
        )
    ),
})
const scope_fields = {
    account_id: S.String,
    domain_id: S.String,
    subdomain_slug: S.NullOr(S.String),
    epoch: S.Number,
}
const scope = (model: Model) => ({
    account_id: model.account_id,
    domain_id: model.domain_id,
    subdomain_slug: model.subdomain_slug,
    epoch: model.epoch,
})
const ReadOrBuildPublication = Command.define("ReadOrBuildPublication", {
    args: {
        ...scope_fields,
        build: S.Boolean,
        release_id: S.optional(S.String),
        channel: S.optional(
            S.Literals(["development", "staging", "production", "live"])
        ),
        cancel_id: S.optional(S.String),
        preview: S.optional(S.Boolean),
    },
    messages: [Loaded, Failed],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const session = yield* api.session()
            if (
                session.account_id !== args.account_id ||
                !session.domains.some(
                    (workspace) =>
                        workspace.id === args.domain_id &&
                        (!(
                            args.build ||
                            args.release_id !== undefined ||
                            args.cancel_id !== undefined
                        ) ||
                            workspace.can_write)
                )
            )
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 403,
                        message: "Publication access changed",
                    })
                )
            if (args.build)
                yield* Remote.mutate(
                    BuildPublication,
                    {
                        domain_id: args.domain_id,
                        subdomain_slug: args.subdomain_slug,
                        idempotency_key: crypto.randomUUID(),
                    },
                    crypto.randomUUID()
                ).pipe(Effect.provide(api.remote(args.domain_id)))
            let job_id: string | null = null
            if (args.release_id !== undefined) {
                const deployment_input = {
                    domain_id: args.domain_id,
                    subdomain_slug: args.subdomain_slug,
                    release_id: args.release_id,
                    idempotency_key: crypto.randomUUID(),
                }
                const result = yield* (
                    args.subdomain_slug !== null
                        ? Remote.mutate(
                              DeploySubdomain,
                              {
                                  ...deployment_input,
                                  subdomain_slug: args.subdomain_slug,
                                  mode:
                                      args.preview === true
                                          ? "preview"
                                          : "live",
                              },
                              crypto.randomUUID()
                          )
                        : args.channel === "staging" ||
                            args.channel === "production"
                          ? Remote.mutate(
                                PromotePublication,
                                { ...deployment_input, channel: args.channel },
                                crypto.randomUUID()
                            )
                          : Remote.mutate(
                                DeployDevelopment,
                                deployment_input,
                                crypto.randomUUID()
                            )
                ).pipe(Effect.provide(api.remote(args.domain_id)))
                job_id = result.output.id
            }
            if (args.cancel_id !== undefined)
                yield* Remote.mutate(
                    CancelDeployment,
                    {
                        domain_id: args.domain_id,
                        subdomain_slug: args.subdomain_slug,
                        job_id: args.cancel_id,
                    },
                    crypto.randomUUID()
                ).pipe(Effect.provide(api.remote(args.domain_id)))
            const loaded = yield* Data.prefetch(
                { remote: Remote.initial },
                query(args.domain_id, args.subdomain_slug)
            ).pipe(Effect.provide(api.remote(args.domain_id)))
            if (
                query(args.domain_id, args.subdomain_slug).read(loaded)._tag !==
                "Ready"
            )
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 403,
                        message: "Publication unavailable",
                    })
                )
            // A server without the deployment migration must still serve releases.
            const with_jobs = yield* Data.prefetch(
                loaded,
                jobs_query(args.domain_id, args.subdomain_slug)
            ).pipe(
                Effect.provide(api.remote(args.domain_id)),
                Effect.catch(() => Effect.succeed(loaded))
            )
            const promotion_query = Data.query(
                PublicationPromotionJobs,
                {
                    domain_id: args.domain_id,
                    subdomain_slug: args.subdomain_slug,
                },
                { select: PublishingJobsSummary, first: 1 }
            )
            const with_promotions = yield* Data.prefetch(
                with_jobs,
                promotion_query
            ).pipe(
                Effect.provide(api.remote(args.domain_id)),
                Effect.catch(() => Effect.succeed(with_jobs))
            )
            const with_owners = yield* Data.prefetch(
                with_promotions,
                owners_query(args.domain_id)
            ).pipe(
                Effect.provide(api.remote(args.domain_id)),
                Effect.catch(() => Effect.succeed(with_promotions))
            )
            return Loaded({
                epoch: args.epoch,
                remote: with_owners.remote,
                promotions_available:
                    promotion_query.read(with_promotions)._tag === "Ready",
                built: args.build,
                job_id,
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Failed({
                        epoch: args.epoch,
                        error:
                            error instanceof RemoteMutationError ||
                            error instanceof AccountRequestError
                                ? error.message
                                : args.build
                                  ? "Build failed. Check the server connection, publication access, published homepage, Blog assignments and uploaded images."
                                  : "Could not load publication releases. Check the server connection and publication access, then retry.",
                    })
                )
            )
        ),
})
const WaitForPublication = Command.define("WaitForPublication", {
    args: { epoch: S.Number, token: S.Number },
    messages: [Poll],
    execute: (args) => Effect.as(Effect.sleep("2 seconds"), Poll(args)),
})
export const synchronize = (
    model: Model,
    account: {
        account_id: string
        domain_id: string
        can_write: boolean
    } | null
): UpdateReturn => {
    if (account === null || account.domain_id === "")
        return [model.domain_id === "" ? model : clear(model), []]
    if (
        account.account_id === model.account_id &&
        account.domain_id === model.domain_id &&
        account.can_write === model.can_write
    )
        return [model, []]
    const next = { ...clear(model), ...account, pending: true }
    return [next, [ReadOrBuildPublication({ ...scope(next), build: false })]]
}
export const reconcile_owner = (
    model: Model,
    _domain: Option.Option<string>,
    _subdomains: ReadonlyArray<Console.OwnerSubdomain>
): Model => model
export const update = (
    model: Model,
    message: Message,
    _domain?: Option.Option<string>,
    subdomains: ReadonlyArray<Console.OwnerSubdomain> = []
): UpdateReturn => {
    if ("epoch" in message && message.epoch !== model.epoch) return [model, []]
    if (message._tag === "PublishingLoaded") {
        let next: Model = {
            ...model,
            remote: message.remote,
            promotions_available: message.promotions_available ?? false,
            pending: false,
            watched_job: message.job_id ?? model.watched_job,
            poll_token: model.poll_token + 1,
            ui: { ...model.ui, error: Option.none() },
        }
        if (jobs_library(next) === undefined)
            next = {
                ...next,
                ui: {
                    ...next.ui,
                    error: Option.some(
                        "Deployments unavailable. Check the server connection and access, or restart the server after updating."
                    ),
                },
            }
        const commands: Array<Command.Command<Message, never, ContactsApi>> = []
        const job = jobs_library(next)?.jobs.find(
            (job) => job.id === next.watched_job
        )
        if (message.built || job?.status === "succeeded") {
            const [feedback, effects] = Console.success_feedback(
                project(next),
                message.built
                    ? "Release build complete"
                    : job?.is_preview === true
                      ? "Preview deployment complete"
                      : `${job?.channel === "staging" ? "Staging" : job?.channel === "production" ? "Production" : job?.channel === "live" ? "Live" : "Development"} deployment complete`,
                message.built
                    ? "A new immutable release is ready to preview or deploy."
                    : "The release was deployed successfully."
            )
            next = {
                ...next,
                ui: ui_only(feedback),
                watched_job:
                    job?.status === "succeeded" ? null : next.watched_job,
            }
            commands.push(...effects)
        }
        if (job?.status === "failed" || job?.status === "cancelled")
            next = {
                ...next,
                watched_job: null,
                ui: {
                    ...next.ui,
                    error:
                        job.error_message === null
                            ? Option.none()
                            : Option.some(job.error_message),
                },
            }
        if (
            jobs_library(next)?.jobs.some(
                (job) => job.status === "pending" || job.status === "running"
            )
        )
            commands.push(
                WaitForPublication({
                    epoch: next.epoch,
                    token: next.poll_token,
                })
            )
        return [next, commands]
    }
    if (message._tag === "GotToastMessage") {
        const [feedback, commands] = Console.toast_feedback(
            project(model),
            message
        )
        return [{ ...model, ui: ui_only(feedback) }, commands]
    }
    if (message._tag === "PollPublishing") {
        if (message.token !== model.poll_token || model.pending)
            return [model, []]
        return [
            { ...model, pending: true },
            [ReadOrBuildPublication({ ...scope(model), build: false })],
        ]
    }
    if (
        message._tag === "RequestedDeployment" ||
        message._tag === "RequestedPreview" ||
        message._tag === "RequestedCancellation"
    ) {
        if (!model.can_write || model.pending || model.domain_id === "")
            return [model, []]
        if (message._tag !== "RequestedCancellation") {
            if (!project(model).can_deploy) return [model, []]
            if (model.subdomain_slug !== null) {
                if (
                    message._tag === "RequestedDeployment" &&
                    (message.channel !== "live" ||
                        latest_preview(model, message.release_id)?.status !==
                            "succeeded")
                )
                    return [model, []]
            } else {
                if (
                    message._tag === "RequestedPreview" ||
                    message.channel === "live"
                )
                    return [model, []]
                if (
                    message.channel !== "development" &&
                    (!model.promotions_available ||
                        !jobs_library(model)?.jobs.some(
                            (job) =>
                                job.release_id === message.release_id &&
                                job.status === "succeeded" &&
                                (job.channel ?? "development") ===
                                    (message.channel === "staging"
                                        ? "development"
                                        : "staging")
                        ))
                )
                    return [model, []]
            }
        }
        return [
            { ...model, pending: true },
            [
                ReadOrBuildPublication({
                    ...scope(model),
                    build: false,
                    ...(message._tag === "RequestedCancellation"
                        ? { cancel_id: message.job_id }
                        : {
                              release_id: message.release_id,
                              preview: message._tag === "RequestedPreview",
                              channel:
                                  message._tag === "RequestedPreview"
                                      ? "live"
                                      : message.channel,
                          }),
                }),
            ],
        ]
    }
    if (message._tag === "PublishingFailed")
        return [
            {
                ...model,
                pending: false,
                ui: { ...model.ui, error: Option.some(message.error) },
            },
            model.watched_job === null
                ? []
                : [
                      WaitForPublication({
                          epoch: model.epoch,
                          token: model.poll_token,
                      }),
                  ],
        ]
    if (message._tag === "SelectedOwner") {
        const selected =
            message.subdomain_id === ""
                ? null
                : (owners_library(model)?.subdomains ?? subdomains).find(
                      (owner) => owner.id === message.subdomain_id
                  )?.slug
        if (selected === undefined) return [model, []]
        const next = {
            ...model,
            ui: {
                ...ui_only(Console.init()),
                selected_subdomain_id: message.subdomain_id,
            },
            subdomain_slug: selected,
            watched_job: null,
            poll_token: model.poll_token + 1,
            remote: model.remote,
            epoch: model.epoch + 1,
            pending: model.domain_id !== "",
        }
        return [
            next,
            next.pending
                ? [ReadOrBuildPublication({ ...scope(next), build: false })]
                : [],
        ]
    }
    if (
        message._tag === "RequestedBuild" ||
        message._tag === "PublishingRefreshed"
    ) {
        if (
            model.domain_id === "" ||
            model.pending ||
            (message._tag === "RequestedBuild" &&
                (!model.can_write || library(model) === undefined))
        )
            return [model, []]
        return [
            { ...model, pending: true },
            [
                ReadOrBuildPublication({
                    ...scope(model),
                    build: message._tag === "RequestedBuild",
                }),
            ],
        ]
    }
    return [model, []]
}
export const view = Submodel.defineView<Model, Message, Console.ViewInputs>(
    (model, inputs, h) =>
        h.div(
            [],
            [
                Option.isSome(model.ui.error)
                    ? h.button(
                          [
                              h.Type("button"),
                              h.Disabled(model.pending),
                              h.OnClick(Refreshed()),
                              h.Class(
                                  "mb-3 min-h-10 rounded-[var(--radius-control)] border border-border px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                              ),
                          ],
                          ["Retry publishing connection"]
                      )
                    : h.empty,
                h.submodel({
                    slotId: "publishing-ui",
                    model: project(model),
                    view: Console.view,
                    viewInputs: {
                        ...inputs,
                        subdomains:
                            owners_library(model)?.subdomains ??
                            inputs.subdomains,
                    },
                    toParentMessage: (message) => message,
                }),
            ]
        )
)
