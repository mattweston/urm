import * as Array from "effect/Array"
import { Effect, Option, Schema as S } from "effect"
import { Command, Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import * as Ui from "@foldkit/ui"
import type { EntryHandlers } from "@foldkit/ui/toast"
import { play } from "cuelume"

import {
    PublicationDeployment,
    PublicationJob,
    PublicationJobId,
    PublicationRelease,
    PublicationReleaseId,
} from "./publishing-records.ts"

import { designMainLayoutHref } from "../routing/route.ts"

const PublicationChannel = S.Literals([
    "development",
    "staging",
    "production",
    "live",
])
type PublicationChannel = typeof PublicationChannel.Type

const ToastPayload = S.Struct({
    title: S.String,
    description: S.String,
})
const PublicationToast = Ui.Toast.make(ToastPayload)
type ToastEntry = typeof PublicationToast.Entry.Type

const OwnerSubdomain = S.Struct({
    id: S.String,
    domain_id: S.String,
    name: S.String,
    slug: S.String,
})
export type OwnerSubdomain = typeof OwnerSubdomain.Type

export const Model = S.Struct({
    selected_subdomain_id: S.String,
    releases: S.Array(PublicationRelease),
    deployments: S.Array(PublicationDeployment),
    jobs: S.Array(PublicationJob),
    loading_releases: S.Boolean,
    loading_deployments: S.Boolean,
    loading_jobs: S.Boolean,
    busy: S.Boolean,
    can_build: S.Boolean,
    can_deploy: S.Boolean,
    development_only: S.optional(S.Boolean),
    deployment_data_available: S.optional(S.Boolean),
    error: S.Option(S.String),
    toast: PublicationToast.Model,
})
export type Model = typeof Model.Type

export const SelectedOwner = taggedStruct("SelectedOwner", {
    subdomain_id: S.String,
})
export const LoadedReleases = taggedStruct("LoadedReleases", {
    releases: S.Array(PublicationRelease),
})
export const LoadedDeployments = taggedStruct("LoadedDeployments", {
    deployments: S.Array(PublicationDeployment),
})
export const LoadedJobs = taggedStruct("LoadedJobs", {
    jobs: S.Array(PublicationJob),
})
export const RequestedBuild = taggedStruct("RequestedBuild")
export const RequestedPreview = taggedStruct("RequestedPreview", {
    release_id: PublicationReleaseId,
})
export const RequestedDeployment = taggedStruct("RequestedDeployment", {
    release_id: PublicationReleaseId,
    channel: PublicationChannel,
})
export const RequestedCancellation = taggedStruct("RequestedCancellation", {
    job_id: PublicationJobId,
})
export const SucceededAction = taggedStruct("SucceededAction")
export const SucceededBuild = taggedStruct("SucceededBuild")
export const SucceededDeployment = taggedStruct("SucceededDeployment", {
    channel: PublicationChannel,
})
export const FailedAction = taggedStruct("FailedAction", { error: S.String })
const CompletedSuccessAudio = taggedStruct("CompletedSuccessAudio")
const GotToastMessage = taggedStruct("GotToastMessage", {
    message: PublicationToast.Message,
})

export const Message = S.Union([
    SelectedOwner,
    LoadedReleases,
    LoadedDeployments,
    LoadedJobs,
    RequestedBuild,
    RequestedPreview,
    RequestedDeployment,
    RequestedCancellation,
    SucceededAction,
    SucceededBuild,
    SucceededDeployment,
    FailedAction,
    CompletedSuccessAudio,
    GotToastMessage,
])
export type Message = typeof Message.Type

const PlayDeploymentSuccessAudio = Command.define(
    "PlayDeploymentSuccessAudio",
    {
        messages: [CompletedSuccessAudio],
        execute: Effect.sync(() => {
            play("success")
            return CompletedSuccessAudio()
        }),
    }
)

const map_toast_commands = (
    commands: ReadonlyArray<
        Command.Command<typeof PublicationToast.Message.Type>
    >
): ReadonlyArray<Command.Command<Message>> =>
    Command.mapMessages(commands, (message) => GotToastMessage({ message }))

export const init = (): Model => ({
    selected_subdomain_id: "",
    releases: [],
    deployments: [],
    jobs: [],
    loading_releases: true,
    loading_deployments: true,
    loading_jobs: true,
    busy: false,
    can_build: true,
    can_deploy: true,
    error: Option.none(),
    toast: PublicationToast.init({ id: "publication-toast" }),
})

export const success_feedback = (
    model: Model,
    title: string,
    description: string
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
    const { model: toast, commands: toast_commands = [] } =
        PublicationToast.show(model.toast, {
            variant: "Success",
            payload: { title, description },
        })

    return [
        {
            ...model,
            busy: false,
            toast,
        },
        [...map_toast_commands(toast_commands), PlayDeploymentSuccessAudio()],
    ]
}

export const toast_feedback = (
    model: Model,
    message: typeof GotToastMessage.Type
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
    const { model: toast, commands = [] } = PublicationToast.update(
        model.toast,
        message.message
    )
    return [{ ...model, toast }, map_toast_commands(commands)]
}

export type ViewInputs = Readonly<{
    domain_name: string
    domain_slug: string
    subdomains: ReadonlyArray<OwnerSubdomain>
}>

const card_class =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)]"
const button_class =
    "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] disabled:opacity-50"
const select_class =
    "min-h-11 w-full rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const format_date = (timestamp: number): string =>
    new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(timestamp))

const indeterminate_progress = <ParentMessage>(
    label: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Role("progressbar"),
            h.AriaLabel(label),
            h.Class("publishing-progress"),
        ],
        [
            h.span(
                [h.AriaHidden(true), h.Class("publishing-progress-indicator")],
                []
            ),
        ]
    )

export const pending_job_progress = <ParentMessage>(
    job: PublicationJob,
    h: HtmlBuilder<ParentMessage>
): Html =>
    job.status === "pending" || job.status === "running"
        ? indeterminate_progress(`${job.operation} ${job.channel} progress`, h)
        : h.empty

const cancel_job_button = (
    job: PublicationJob,
    h: HtmlBuilder<Message>,
    enabled = true
): Html =>
    job.status === "pending" || job.status === "running"
        ? h.button(
              [
                  h.Type("button"),
                  h.OnClick(RequestedCancellation({ job_id: job._id })),
                  h.Disabled(
                      !enabled ||
                          job.error_message ===
                              "Cancellation requested. Waiting for the upload process to stop."
                  ),
                  h.AriaLabel(`Cancel ${job.operation} ${job.channel}`),
                  h.Class(
                      "inline-flex min-h-8 items-center justify-center rounded-[var(--radius-control)] border border-destructive/40 px-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  ),
              ],
              [
                  job.error_message ===
                  "Cancellation requested. Waiting for the upload process to stop."
                      ? "Cancelling…"
                      : "Cancel",
              ]
          )
        : h.empty

export const deployment_progress = <ParentMessage>(
    deployment: PublicationDeployment,
    h: HtmlBuilder<ParentMessage>
): Html =>
    deployment.status === "pending" || deployment.status === "deploying"
        ? indeterminate_progress(`${deployment.channel} deployment progress`, h)
        : h.empty

const succeeded_on_channel = (
    model: Model,
    release_id: PublicationReleaseId,
    channel: PublicationChannel
): boolean =>
    Option.isSome(
        Array.findFirst(
            model.deployments,
            (deployment) =>
                deployment.release_id === release_id &&
                deployment.channel === channel &&
                deployment.is_preview !== true &&
                deployment.status === "succeeded"
        )
    )

const action_buttons = (
    model: Model,
    release: PublicationRelease,
    is_subdomain: boolean,
    h: HtmlBuilder<Message>
): ReadonlyArray<Html> => {
    if (release.status !== "ready") return []

    const preview_ready =
        model.deployments.find(
            (deployment) =>
                deployment.release_id === release._id &&
                deployment.is_preview === true
        )?.status === "succeeded"

    const button = (
        channel: PublicationChannel,
        label: string,
        enabled: boolean
    ) =>
        h.button(
            [
                h.Type("button"),
                h.Disabled(
                    model.busy ||
                        !model.can_deploy ||
                        !enabled ||
                        (model.development_only === true &&
                            channel !== "development")
                ),
                h.OnClick(
                    RequestedDeployment({
                        release_id: release._id,
                        channel,
                    })
                ),
                h.Class(button_class),
            ],
            [label]
        )

    if (is_subdomain)
        return [
            h.button(
                [
                    h.Type("button"),
                    h.Disabled(model.busy || !model.can_deploy),
                    h.OnClick(RequestedPreview({ release_id: release._id })),
                    h.Class(button_class),
                ],
                [preview_ready ? "Preview again" : "Preview site"]
            ),
            button("live", "Publish live", preview_ready),
        ]

    const development_ready = succeeded_on_channel(
        model,
        release._id,
        "development"
    )
    const staging_ready = succeeded_on_channel(model, release._id, "staging")

    return [
        button("development", "Deploy to development", true),
        button("staging", "Promote to staging", development_ready),
        button("production", "Promote to production", staging_ready),
    ]
}

export const content_view = (
    model: Model,
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html => {
    const selected_subdomain = Array.findFirst(
        inputs.subdomains,
        (subdomain) => subdomain.id === model.selected_subdomain_id
    )
    const is_subdomain = Option.isSome(selected_subdomain)
    const owner_label = Option.match(selected_subdomain, {
        onNone: () => inputs.domain_name,
        onSome: (subdomain) => subdomain.name,
    })
    const pages_href = Option.match(selected_subdomain, {
        onNone: () => "/web/pages",
        onSome: (subdomain) => `/web/pages/subdomains/${subdomain.slug}`,
    })
    const blog_href = Option.match(selected_subdomain, {
        onNone: () => "/blog/drafts",
        onSome: (subdomain) => `/blog/subdomains/${subdomain.slug}/drafts`,
    })
    const latest_release = Array.findFirst(
        model.releases,
        (release) => release.status === "ready"
    )

    const render_toast_entry = (
        entry: ToastEntry,
        handlers: EntryHandlers
    ): Html =>
        h.div(
            [
                h.Class(
                    "relative rounded-[var(--radius-surface)] border border-primary/30 bg-card p-3 pr-10 text-card-foreground [box-shadow:var(--shadow-surface)]"
                ),
            ],
            [
                h.p([h.Class("text-sm font-semibold")], [entry.payload.title]),
                h.p(
                    [h.Class("mt-0.5 text-sm text-muted-foreground")],
                    [entry.payload.description]
                ),
                h.button(
                    [
                        h.Type("button"),
                        h.AriaLabel("Dismiss notification"),
                        h.Class(
                            "absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        ),
                        ...handlers.dismiss,
                    ],
                    [h.span([h.AriaHidden(true)], ["×"])]
                ),
            ]
        )

    return h.section(
        [h.Class("space-y-4")],
        [
            h.header(
                [h.Class("space-y-1")],
                [
                    h.h2(
                        [h.Class("text-2xl font-semibold text-balance")],
                        ["Publishing"]
                    ),
                    h.p(
                        [h.Class("max-w-[70ch] text-sm text-muted-foreground")],
                        [
                            "Preview saved drafts before building, then create an immutable release and promote the same artifact through each channel.",
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap gap-2 pt-2")],
                        [
                            h.a(
                                [
                                    h.Href(designMainLayoutHref()),
                                    h.Class(button_class),
                                ],
                                ["Preview draft site"]
                            ),
                            h.a(
                                [h.Href(pages_href), h.Class(button_class)],
                                ["Manage pages"]
                            ),
                            h.a(
                                [h.Href(blog_href), h.Class(button_class)],
                                ["Manage blog"]
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class(card_class)],
                [
                    h.label(
                        [
                            h.For("publishing-owner"),
                            h.Class("text-sm font-medium"),
                        ],
                        ["Publication owner"]
                    ),
                    h.select(
                        [
                            h.Id("publishing-owner"),
                            h.Name("publishing_owner"),
                            h.Value(model.selected_subdomain_id),
                            h.OnChange((subdomain_id) =>
                                SelectedOwner({ subdomain_id })
                            ),
                            h.Class(`${select_class} mt-1`),
                        ],
                        [
                            h.option(
                                [h.Value("")],
                                [`${inputs.domain_name} (main domain)`]
                            ),
                            ...Array.map(inputs.subdomains, (subdomain) =>
                                h.option(
                                    [h.Value(subdomain.id)],
                                    [
                                        `${subdomain.name} (${subdomain.slug}.${inputs.domain_slug})`,
                                    ]
                                )
                            ),
                        ]
                    ),
                ]
            ),
            Option.match(model.error, {
                onNone: () => h.empty,
                onSome: (error) =>
                    h.div(
                        [
                            h.AriaLive("polite"),
                            h.Class(
                                "rounded-[var(--radius-surface)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                            ),
                        ],
                        [error]
                    ),
            }),
            h.article(
                [h.Class(card_class)],
                [
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap items-start justify-between gap-3"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("space-y-1")],
                                [
                                    h.h3(
                                        [h.Class("font-semibold")],
                                        [owner_label]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            is_subdomain
                                                ? "Direct live publication"
                                                : "Development → staging → production",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Building requires exactly one homepage with publication state Published.",
                                        ]
                                    ),
                                ]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Disabled(model.busy || !model.can_build),
                                    h.OnClick(RequestedBuild()),
                                    h.Class(button_class),
                                ],
                                [model.busy ? "Requesting…" : "Build release"]
                            ),
                        ]
                    ),
                    Option.match(latest_release, {
                        onNone: () =>
                            h.p(
                                [h.Class("mt-4 text-sm text-muted-foreground")],
                                [
                                    model.loading_releases
                                        ? "Loading releases…"
                                        : "No ready release yet.",
                                ]
                            ),
                        onSome: (release) =>
                            h.div(
                                [
                                    h.Class(
                                        "mt-4 space-y-3 border-t border-border pt-4"
                                    ),
                                ],
                                [
                                    h.p(
                                        [h.Class("text-sm")],
                                        [
                                            `Ready release from ${format_date(release.created_at)}`,
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        action_buttons(
                                            model,
                                            release,
                                            is_subdomain,
                                            h
                                        )
                                    ),
                                ]
                            ),
                    }),
                ]
            ),
            h.div(
                [h.Class("grid gap-4 lg:grid-cols-2")],
                [
                    h.section(
                        [h.Class(card_class)],
                        [
                            h.h3(
                                [h.Class("font-semibold")],
                                ["Recent deployments"]
                            ),
                            h.ul(
                                [h.Class("mt-3 space-y-2")],
                                Array.map(
                                    Array.take(model.deployments, 5),
                                    (deployment) =>
                                        h.li(
                                            [
                                                h.Class(
                                                    "flex justify-between gap-3 text-sm"
                                                ),
                                            ],
                                            [
                                                h.span(
                                                    [
                                                        h.Class(
                                                            "flex min-w-0 flex-wrap items-center gap-2"
                                                        ),
                                                    ],
                                                    [
                                                        deployment.url ===
                                                        undefined
                                                            ? h.span(
                                                                  [],
                                                                  [
                                                                      `${deployment.is_preview === true ? "preview" : deployment.channel}: ${deployment.status}`,
                                                                  ]
                                                              )
                                                            : h.a(
                                                                  [
                                                                      h.Href(
                                                                          deployment.url
                                                                      ),
                                                                      h.Target(
                                                                          "_blank"
                                                                      ),
                                                                      h.Rel(
                                                                          "noopener noreferrer"
                                                                      ),
                                                                      h.Class(
                                                                          "underline underline-offset-4"
                                                                      ),
                                                                  ],
                                                                  [
                                                                      `${deployment.is_preview === true ? "Open preview" : `Open ${deployment.channel}`}`,
                                                                  ]
                                                              ),
                                                        deployment_progress(
                                                            deployment,
                                                            h
                                                        ),
                                                    ]
                                                ),
                                                h.time(
                                                    [],
                                                    [
                                                        format_date(
                                                            deployment.created_at
                                                        ),
                                                    ]
                                                ),
                                            ]
                                        )
                                )
                            ),
                            model.loading_deployments
                                ? h.p(
                                      [
                                          h.Class(
                                              "mt-3 text-sm text-muted-foreground"
                                          ),
                                      ],
                                      ["Loading deployments…"]
                                  )
                                : model.deployments.length === 0
                                  ? h.p(
                                        [
                                            h.Class(
                                                "mt-3 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            model.deployment_data_available ===
                                            false
                                                ? "Deployments unavailable."
                                                : "No deployments yet.",
                                        ]
                                    )
                                  : h.empty,
                        ]
                    ),
                    h.section(
                        [h.Class(card_class)],
                        [
                            h.h3([h.Class("font-semibold")], ["Recent jobs"]),
                            h.ul(
                                [h.Class("mt-3 space-y-2")],
                                Array.map(Array.take(model.jobs, 5), (job) =>
                                    h.li(
                                        [
                                            h.Class(
                                                "flex justify-between gap-3 text-sm"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "flex min-w-0 flex-wrap items-center gap-2"
                                                    ),
                                                ],
                                                [
                                                    `${job.operation} · ${job.channel}: ${job.status}`,
                                                    pending_job_progress(
                                                        job,
                                                        h
                                                    ),
                                                    cancel_job_button(
                                                        job,
                                                        h,
                                                        model.can_build
                                                    ),
                                                ]
                                            ),
                                            h.time(
                                                [],
                                                [format_date(job.created_at)]
                                            ),
                                        ]
                                    )
                                )
                            ),
                            model.loading_jobs
                                ? h.p(
                                      [
                                          h.Class(
                                              "mt-3 text-sm text-muted-foreground"
                                          ),
                                      ],
                                      ["Loading jobs…"]
                                  )
                                : model.jobs.length === 0
                                  ? h.p(
                                        [
                                            h.Class(
                                                "mt-3 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            model.deployment_data_available ===
                                            false
                                                ? "Publishing jobs unavailable."
                                                : "No publishing jobs yet.",
                                        ]
                                    )
                                  : h.empty,
                        ]
                    ),
                ]
            ),
            h.submodel({
                slotId: model.toast.id,
                model: model.toast,
                view: PublicationToast.view,
                viewInputs: {
                    position: "BottomRight",
                    ariaLabel: "Publishing notifications",
                    entryClassName: "w-80 max-w-[calc(100vw-2rem)]",
                    entryToView: render_toast_entry,
                },
                toParentMessage: (message) => GotToastMessage({ message }),
            }),
        ]
    )
}

export const view = Submodel.defineView<Model, Message, ViewInputs>(
    content_view
)
