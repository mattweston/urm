import { Array, Match as M } from "effect"
import { createLazy } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Message } from "../message.ts"
import {
    ClickedClearWarnings,
    ClickedRunPatchWork,
    ClickedRunSubscriptionDependenciesWork,
    ClickedRunUpdateWork,
    ClickedRunViewWork,
} from "../message.ts"
import type { Model, SlowPhase, SlowWarning, Workload } from "../model.ts"
import { burnCpu } from "../burn-cpu.ts"

const VIEW_WORK_MS = 24

const lazyPatchRows = createLazy()

const phaseAccentClass = (phase: SlowPhase): string =>
    M.value(phase).pipe(
        M.withReturnType<string>(),
        M.when("Update", () => "border-l-amber-500 bg-amber-500/5"),
        M.when("View", () => "border-l-sky-500 bg-sky-500/5"),
        M.when("Patch", () => "border-l-rose-500 bg-rose-500/5"),
        M.when(
            "SubscriptionDependencies",
            () => "border-l-emerald-500 bg-emerald-500/5"
        ),
        M.exhaustive
    )

const phaseLabel = (phase: SlowPhase): string =>
    M.value(phase).pipe(
        M.withReturnType<string>(),
        M.when("Update", () => "Update"),
        M.when("View", () => "View"),
        M.when("Patch", () => "Patch"),
        M.when("SubscriptionDependencies", () => "Subscription dependencies"),
        M.exhaustive
    )

const burnCpuDuringView = (workload: Workload): void => {
    if (workload === "View") {
        burnCpu(VIEW_WORK_MS)
    }
}

const scenarioCard = <ParentMessage>(
    {
        phase,
        thresholdMs,
        title,
        body,
        buttonText,
        message,
        toParentMessage,
    }: Readonly<{
        phase: SlowPhase
        thresholdMs: number
        title: string
        body: string
        buttonText: string
        message: Message
        toParentMessage: (message: Message) => ParentMessage
    }>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.article(
        [
            h.Class(
                `rounded-lg border border-border p-4 shadow-sm ${phaseAccentClass(phase)}`
            ),
        ],
        [
            h.div(
                [h.Class("mb-4")],
                [
                    h.div(
                        [],
                        [
                            h.h2(
                                [
                                    h.Class(
                                        "text-base font-bold text-foreground"
                                    ),
                                ],
                                [title]
                            ),
                            h.p(
                                [h.Class("mt-1 text-sm text-muted-foreground")],
                                [`Default threshold: ${thresholdMs}ms`]
                            ),
                        ]
                    ),
                ]
            ),
            h.p(
                [h.Class("mb-4 text-sm leading-6 text-muted-foreground")],
                [body]
            ),
            h.button(
                [
                    h.Type("button"),
                    h.Class(
                        "inline-flex items-center justify-center rounded-[var(--radius-control)] bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                    ),
                    h.OnClick(toParentMessage(message)),
                ],
                [buttonText]
            ),
        ]
    )
}

const warningView = <ParentMessage>(
    warning: SlowWarning,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("li")(
        warning.id.toString(),
        [
            h.Class(
                `rounded-lg border border-border p-4 shadow-sm ${phaseAccentClass(warning.phase)}`
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "flex flex-wrap items-baseline justify-between gap-2"
                    ),
                ],
                [
                    h.h3(
                        [h.Class("text-base font-bold text-foreground")],
                        [
                            `${phaseLabel(warning.phase)} exceeded ${warning.thresholdMs}ms`,
                        ]
                    ),
                    h.p(
                        [h.Class("text-sm font-semibold text-foreground")],
                        [`${warning.durationMs.toFixed(1)}ms`]
                    ),
                ]
            ),
            h.p(
                [h.Class("mt-2 text-sm leading-6 text-muted-foreground")],
                [`${warning.details} Trigger: ${warning.trigger}.`]
            ),
        ]
    )
}

const warningsView = <ParentMessage>(
    {
        warnings,
        toParentMessage,
    }: Readonly<{
        warnings: ReadonlyArray<SlowWarning>
        toParentMessage: (message: Message) => ParentMessage
    }>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "mb-4 flex flex-wrap items-center justify-between gap-3"
                    ),
                ],
                [
                    h.div(
                        [],
                        [
                            h.h2(
                                [
                                    h.Class(
                                        "text-lg font-bold text-card-foreground"
                                    ),
                                ],
                                ["Recorded warnings"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "Warnings here come from the real Runtime slow callback.",
                                ]
                            ),
                        ]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(
                                "inline-flex items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                            ),
                            h.OnClick(toParentMessage(ClickedClearWarnings())),
                        ],
                        ["Clear"]
                    ),
                ]
            ),
            Array.match(warnings, {
                onEmpty: () =>
                    h.keyed("div")(
                        "empty",
                        [],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-muted p-6 text-sm text-muted-foreground"
                                    ),
                                ],
                                ["Run a workload to record a warning."]
                            ),
                        ]
                    ),
                onNonEmpty: (nonEmptyWarnings) =>
                    h.keyed("div")(
                        "warnings",
                        [],
                        [
                            h.ul(
                                [h.Class("grid gap-3")],
                                Array.map(nonEmptyWarnings, (warning) =>
                                    warningView<ParentMessage>(warning, h)
                                )
                            ),
                        ]
                    ),
            }),
        ]
    )
}

const patchRowsView = <ParentMessage>(
    rowCount: number,
    patchRun: number,
    h: HtmlBuilder<ParentMessage>
): Html => {
    if (rowCount === 0) {
        return h.keyed("div")(
            "empty",
            [
                h.Class(
                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-muted p-6 text-sm text-muted-foreground"
                ),
            ],
            ["Patch rows will appear here."]
        )
    }

    return h.keyed("div")(
        `rows-${patchRun}`,
        [h.Class("grid max-h-80 gap-1 overflow-auto pr-2")],
        Array.map(Array.range(1, rowCount), (row) =>
            h.keyed("div")(
                `patch-row-${patchRun}-${row}`,
                [
                    h.Class(
                        "flex items-center justify-between rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-xs text-muted-foreground"
                    ),
                ],
                [
                    h.span([], [`Patch row ${row}`]),
                    h.span([h.Class("font-mono")], [`run ${patchRun}`]),
                ]
            )
        )
    )
}

const patchSurfaceView = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "mb-4 flex flex-wrap items-center justify-between gap-3"
                    ),
                ],
                [
                    h.div(
                        [],
                        [
                            h.h2(
                                [
                                    h.Class(
                                        "text-lg font-bold text-card-foreground"
                                    ),
                                ],
                                ["Patch surface"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    `${model.patchRows.toLocaleString()} keyed rows mounted`,
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            lazyPatchRows(patchRowsView<ParentMessage>, [
                model.patchRows,
                model.patchRun,
                h,
            ]),
        ]
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    burnCpuDuringView(model.activeWorkload)

    return h.div(
        [h.Class("flex flex-col gap-6 text-foreground")],
        [
            h.header(
                [],
                [
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-normal text-foreground"
                            ),
                        ],
                        ["Slow Warnings"]
                    ),
                    h.p(
                        [h.Class("mt-2 max-w-3xl text-muted-foreground")],
                        [
                            "Each workload intentionally blocks one part of the synchronous update cycle long enough to trip the default threshold.",
                        ]
                    ),
                ]
            ),
            h.section(
                [h.Class("grid gap-4 md:grid-cols-2")],
                [
                    scenarioCard<ParentMessage>(
                        {
                            phase: "Update",
                            thresholdMs: 4,
                            title: "Slow update",
                            body: "Runs CPU work before returning the next Model.",
                            buttonText: "Run update work",
                            message: ClickedRunUpdateWork(),
                            toParentMessage,
                        },
                        h
                    ),
                    scenarioCard<ParentMessage>(
                        {
                            phase: "View",
                            thresholdMs: 16,
                            title: "Slow view",
                            body: "Runs CPU work while the view builds the VNode tree.",
                            buttonText: "Run view work",
                            message: ClickedRunViewWork(),
                            toParentMessage,
                        },
                        h
                    ),
                    scenarioCard<ParentMessage>(
                        {
                            phase: "Patch",
                            thresholdMs: 8,
                            title: "Slow patch",
                            body: "Mounts thousands of keyed rows into the DOM.",
                            buttonText: "Run patch work",
                            message: ClickedRunPatchWork(),
                            toParentMessage,
                        },
                        h
                    ),
                    scenarioCard<ParentMessage>(
                        {
                            phase: "SubscriptionDependencies",
                            thresholdMs: 2,
                            title: "Slow subscription dependencies",
                            body: "Burns CPU while deriving subscription dependencies.",
                            buttonText: "Run dependency extraction",
                            message: ClickedRunSubscriptionDependenciesWork(),
                            toParentMessage,
                        },
                        h
                    ),
                ]
            ),
            warningsView<ParentMessage>(
                { warnings: model.warnings, toParentMessage },
                h
            ),
            patchSurfaceView(model, h),
        ]
    )
}
