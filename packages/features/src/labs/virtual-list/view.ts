import { Array, Match as M, Option, pipe } from "effect"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import { taggedStruct } from "foldkit/schema"

export const ClickedScrollToMiddle = taggedStruct("ClickedScrollToMiddle")
export const ClickedVariableScrollToMiddle = taggedStruct(
    "ClickedVariableScrollToMiddle"
)

type SampleActivity = Activity
type VariableActivity = Activity

type Activity = Readonly<{
    id: number
    actor: string
    initial: string
    colorClass: string
    verb: string
    target: string
    timeAgo: string
    hasSummary: boolean
}>

export const ROW_COUNT = 10_000

const actorNames = [
    "Sarah Chen",
    "Marcus Davies",
    "Priya Patel",
    "Alex Kim",
    "Jordan Lee",
    "Sam Rivera",
    "Ben Carter",
    "Mira Patel",
    "Lucy Hong",
    "Casey Park",
    "Robin Adams",
    "Tomás Reyes",
]

const actionVerbs = [
    "merged",
    "opened",
    "commented on",
    "approved",
    "closed",
    "reopened",
    "requested review on",
    "pushed to",
]

const colorClasses = [
    "bg-primary",
    "bg-secondary",
    "bg-accent",
    "bg-muted",
    "bg-destructive",
    "bg-primary/70",
    "bg-secondary/80",
    "bg-accent/80",
]

const branchNames = [
    "main",
    "feat/scroll-handlers",
    "fix/dialog-focus",
    "refactor/auth",
    "chore/deps",
]

const cycle = (xs: ReadonlyArray<string>, index: number): string =>
    pipe(xs, Array.get(index % xs.length), Option.getOrThrow)

const formatTimeAgo = (hours: number): string => {
    if (hours < 1) {
        return `${Math.max(1, Math.round(hours * 60))}m ago`
    }
    if (hours < 24) {
        return `${Math.round(hours)}h ago`
    }
    const days = hours / 24
    if (days < 30) {
        return `${Math.round(days)}d ago`
    }
    const months = days / 30
    if (months < 12) {
        return `${Math.round(months)}mo ago`
    }
    return `${Math.round(months / 12)}y ago`
}

const targetForVerb = (verb: string, index: number): string => {
    const number = ((index * 13) % 9999) + 1
    return M.value(verb).pipe(
        M.withReturnType<string>(),
        M.when("pushed to", () => cycle(branchNames, index)),
        M.whenOr("opened", "closed", "reopened", () => `issue #${number}`),
        M.orElse(() => `PR #${number}`)
    )
}

const sampleActivities: ReadonlyArray<Activity> = Array.makeBy(
    ROW_COUNT,
    (index) => {
        const actor = cycle(actorNames, index)
        const verb = cycle(actionVerbs, index)
        const colorClass = cycle(colorClasses, index)
        const hoursAgo = index * 2.3
        return {
            id: index,
            actor,
            initial: actor.charAt(0),
            colorClass,
            verb,
            target: targetForVerb(verb, index),
            timeAgo: formatTimeAgo(hoursAgo),
            hasSummary: index % 4 === 0,
        }
    }
)

const containerClassName =
    "h-96 w-full max-w-2xl rounded-[var(--radius-surface)] bg-card text-card-foreground ring-1 ring-border overscroll-none"

const rowClassName =
    "grid grid-cols-[2rem_1fr_5rem] items-center gap-3 px-4 border-b-(length:--surface-border-width) border-border"

const avatarClassName = (colorClass: string): string =>
    `${colorClass} flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground`

const activityTextClassName = "truncate text-sm text-foreground"

const actorClassName = "font-semibold text-foreground"

const targetClassName = "font-mono text-foreground"

const timeAgoClassName = "text-right text-xs text-muted-foreground tabular-nums"

const buttonClassName =
    "rounded-[var(--radius-control)] bg-primary hover:bg-primary/90 cursor-pointer px-3 py-1.5 text-sm font-medium text-primary-foreground [box-shadow:var(--shadow-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 border-(length:--control-border-width) border-border"

const headerClassName =
    "flex items-end justify-between text-sm text-muted-foreground max-w-2xl"

// VARIABLE-HEIGHT DATA

type Summary = Readonly<{
    title: string
    body: string
    artifact: string
}>

const summaries: ReadonlyArray<Summary> = [
    {
        title: "CI passing across all browsers",
        body: "Resolved the flake in the snapshot suite and confirmed the migration step runs idempotently against staging.",
        artifact: "ci/run-4892",
    },
    {
        title: "Tracking upstream change",
        body: "Linked the upstream regression and added reproduction context so the next reviewer has everything in one place.",
        artifact: "tracker/issue-218",
    },
    {
        title: "Release notes ready for review",
        body: "Bumped the patch version, regenerated the changelog, and queued the release notes for editorial pass.",
        artifact: "release/v0.42.1-rc1",
    },
    {
        title: "Rollback plan coordinated",
        body: "Walked through the unwind steps with on-call and pre-staged the revert PR in case the deploy needs to be undone.",
        artifact: "runbook/rollback-checklist",
    },
    {
        title: "Failure trace attached",
        body: "Captured the steps to reproduce, attached the failing trace, and tagged the owning team for triage.",
        artifact: "traces/failure-7c2e",
    },
    {
        title: "Visual direction approved",
        body: "Aligned with the design team on spacing, contrast, and the dark-mode treatment before merging the implementation.",
        artifact: "design/spec-v3",
    },
    {
        title: "Migration verified on staging",
        body: "Confirmed the migration runs cleanly against the staging snapshot and produces the expected row counts on every shard.",
        artifact: "migration/2026-04-batch",
    },
]

const SHORT_ROW_HEIGHT_PX = 56
const TALL_ROW_HEIGHT_PX = 112

const summaryFor = (index: number): Summary =>
    pipe(summaries, Array.get(index % summaries.length), Option.getOrThrow)

export const variableActivities: ReadonlyArray<Activity> = sampleActivities

export const variableRowHeightPx = (activity: Activity): number =>
    activity.hasSummary ? TALL_ROW_HEIGHT_PX : SHORT_ROW_HEIGHT_PX

const variableTallRowClassName =
    "grid grid-cols-[2rem_1fr_5rem] items-center gap-3 px-4 py-3 border-b-(length:--surface-border-width) border-border"

const variableSummaryTitleClassName =
    "mt-0.5 text-xs font-semibold text-foreground"

const variableSummaryBodyClassName =
    "mt-0.5 text-xs text-muted-foreground leading-tight line-clamp-1"

const variableArtifactClassName =
    "mt-1 inline-flex w-fit rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground [box-shadow:var(--shadow-control)]"

const subsectionHeadingClassName = "text-lg font-semibold text-foreground mt-2"

const shortRow = <ParentMessage>(
    row: Activity,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class(rowClassName)],
        [
            h.div([h.Class(avatarClassName(row.colorClass))], [row.initial]),
            h.div(
                [h.Class(activityTextClassName)],
                [
                    h.span([h.Class(actorClassName)], [row.actor]),
                    " ",
                    row.verb,
                    " ",
                    h.span([h.Class(targetClassName)], [row.target]),
                ]
            ),
            h.div([h.Class(timeAgoClassName)], [row.timeAgo]),
        ]
    )
}

const tallRow = <ParentMessage>(
    row: Activity,
    summary: Summary,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class(variableTallRowClassName)],
        [
            h.div([h.Class(avatarClassName(row.colorClass))], [row.initial]),
            h.div(
                [h.Class("min-w-0")],
                [
                    h.div(
                        [h.Class(activityTextClassName)],
                        [
                            h.span([h.Class(actorClassName)], [row.actor]),
                            " ",
                            row.verb,
                            " ",
                            h.span([h.Class(targetClassName)], [row.target]),
                        ]
                    ),
                    h.div(
                        [h.Class(variableSummaryTitleClassName)],
                        [summary.title]
                    ),
                    h.div(
                        [h.Class(variableSummaryBodyClassName)],
                        [summary.body]
                    ),
                    h.div(
                        [h.Class(variableArtifactClassName)],
                        [summary.artifact]
                    ),
                ]
            ),
            h.div([h.Class(timeAgoClassName)], [row.timeAgo]),
        ]
    )
}

export const view = <ParentMessage>(
    virtualList: Ui.VirtualList.Model,
    virtualListVariable: Ui.VirtualList.Model,
    listToMessage: (message: Ui.VirtualList.Message) => ParentMessage,
    variableListToMessage: (message: Ui.VirtualList.Message) => ParentMessage,
    clickedToMessage: (
        message:
            | typeof ClickedScrollToMiddle.Type
            | typeof ClickedVariableScrollToMiddle.Type
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Virtual List"]
            ),
            h.div(
                [h.Class("flex flex-col gap-8 max-w-2xl")],
                [
                    h.div(
                        [h.Class("flex flex-col gap-4")],
                        [
                            h.h3(
                                [h.Class(subsectionHeadingClassName)],
                                ["Basic"]
                            ),
                            h.div(
                                [h.Class(headerClassName)],
                                [
                                    h.span(
                                        [],
                                        [
                                            `${ROW_COUNT.toLocaleString()} activity events`,
                                        ]
                                    ),
                                    h.button(
                                        [
                                            h.Class(buttonClassName),
                                            h.OnClick(
                                                clickedToMessage(
                                                    ClickedScrollToMiddle()
                                                )
                                            ),
                                        ],
                                        ["Jump to middle"]
                                    ),
                                ]
                            ),
                            h.submodel({
                                slotId: virtualList.id,
                                model: virtualList,
                                view: Ui.VirtualList.view<SampleActivity>(),
                                viewInputs: {
                                    items: sampleActivities,
                                    itemToKey: (row) => String(row.id),
                                    itemToView: (row) =>
                                        shortRow<ParentMessage>(row, h),
                                    containerClassName,
                                },
                                toParentMessage: listToMessage,
                            }),
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-col gap-4")],
                        [
                            h.h3(
                                [h.Class(subsectionHeadingClassName)],
                                ["Variable row heights"]
                            ),
                            h.div(
                                [h.Class(headerClassName)],
                                [
                                    h.span(
                                        [],
                                        [
                                            "Every fourth row is taller and shows a summary block",
                                        ]
                                    ),
                                    h.button(
                                        [
                                            h.Class(buttonClassName),
                                            h.OnClick(
                                                clickedToMessage(
                                                    ClickedVariableScrollToMiddle()
                                                )
                                            ),
                                        ],
                                        ["Jump to middle"]
                                    ),
                                ]
                            ),
                            h.submodel({
                                slotId: virtualListVariable.id,
                                model: virtualListVariable,
                                view: Ui.VirtualList.view<VariableActivity>(),
                                viewInputs: {
                                    items: variableActivities,
                                    itemToKey: (row) => String(row.id),
                                    itemToRowHeightPx: variableRowHeightPx,
                                    itemToView: (row, index) =>
                                        row.hasSummary
                                            ? tallRow<ParentMessage>(
                                                  row,
                                                  summaryFor(index),
                                                  h
                                              )
                                            : shortRow<ParentMessage>(row, h),
                                    containerClassName,
                                },
                                toParentMessage: variableListToMessage,
                            }),
                        ]
                    ),
                ]
            ),
        ]
    )
}
