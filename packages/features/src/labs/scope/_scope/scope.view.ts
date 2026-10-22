import * as Ui from "@foldkit/ui"
import { Array } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as ScopeExample from "./scope.ts"

type ToParentMessage<ParentMessage> = (
    message: ScopeExample.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const panel = <ParentMessage>(
    label: string,
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.header(
                [
                    h.Class(
                        "flex items-center justify-between border-b-(length:--surface-border-width) border-border px-5 py-3"
                    ),
                ],
                [
                    h.h3(
                        [
                            h.Class(
                                "text-xs font-semibold tracking-widest uppercase"
                            ),
                        ],
                        [label]
                    ),
                ]
            ),
            ...children,
        ]
    )

const action = <ParentMessage>(
    label: string,
    message: ScopeExample.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    is_disabled: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_disabled,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const badge = <ParentMessage>(
    text: string,
    class_name: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.span(
        [
            h.Class(
                `rounded-full border px-2 py-1 text-xs tracking-wider ${class_name}`
            ),
        ],
        [text]
    )

const stage_tabs = <ParentMessage>(
    model: ScopeExample.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Scope experiments"),
        ],
        Array.map(ScopeExample.stages, (stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        ScopeExample.SelectedScopeStage({ stage })
                    ),
                    isDisabled: stage === model.stage,
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    stage === model.stage
                                        ? "rounded-[var(--radius-surface)] bg-foreground px-3 py-2 text-xs font-semibold tracking-wider text-background uppercase"
                                        : "rounded-[var(--radius-surface)] px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground"
                                ),
                            ],
                            [
                                stage === "AcquireRelease"
                                    ? "acquireRelease"
                                    : stage === "ManualScopes"
                                      ? "manual scopes"
                                      : stage,
                            ]
                        ),
                },
                h
            )
        )
    )

const log_view = <ParentMessage>(
    log: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Array.match(log, {
        onEmpty: () =>
            h.p(
                [
                    h.Class(
                        "px-5 py-8 text-center text-sm text-muted-foreground"
                    ),
                ],
                ["No events yet."]
            ),
        onNonEmpty: (items) =>
            h.div(
                [],
                items.map((item, index) =>
                    h.div(
                        [
                            h.Class(
                                "grid grid-cols-[2.5rem_1fr] gap-3 border-t-(length:--surface-border-width) border-border px-5 py-3 font-mono text-xs first:border-t-0"
                            ),
                        ],
                        [
                            h.span(
                                [h.Class("text-muted-foreground")],
                                [String(index + 1).padStart(2, "0")]
                            ),
                            h.span([], [item]),
                        ]
                    )
                )
            ),
    })

const controls = <ParentMessage>(
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
            ),
        ],
        children
    )

const lifetime_view = <ParentMessage>(
    model: ScopeExample.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const state = model.lifetime.state
    return h.div(
        [h.Class("grid gap-5 lg:grid-cols-2")],
        [
            panel(
                "Resource lifetime",
                [
                    h.div(
                        [h.Class("p-6")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        state === "open"
                                            ? "relative grid min-h-56 place-items-center rounded-3xl border border-dashed border-emerald-500 p-7"
                                            : "relative grid min-h-56 place-items-center rounded-3xl border border-dashed border-border p-7"
                                    ),
                                ],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "absolute top-3 left-4 text-xs font-semibold tracking-widest text-muted-foreground"
                                            ),
                                        ],
                                        ["SCOPE"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                state === "open"
                                                    ? "w-full max-w-xs rounded-[var(--radius-surface)] border border-emerald-500 bg-background p-5 text-center"
                                                    : "w-full max-w-xs rounded-[var(--radius-surface)] border border-border bg-background p-5 text-center"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "font-mono font-semibold"
                                                    ),
                                                ],
                                                ["DB connection"]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-1 text-xs text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    state === "idle"
                                                        ? "not acquired"
                                                        : state === "open"
                                                          ? "alive inside scope"
                                                          : "released",
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Acquire",
                                ScopeExample.ClickedScopeLifetimeAcquire(),
                                to_parent_message,
                                state !== "idle",
                                h
                            ),
                            action(
                                "Use",
                                ScopeExample.ClickedScopeLifetimeUse(),
                                to_parent_message,
                                state !== "open",
                                h
                            ),
                            action(
                                "Close scope",
                                ScopeExample.ClickedScopeLifetimeClose(),
                                to_parent_message,
                                state !== "open",
                                h
                            ),
                            action(
                                "Reset",
                                ScopeExample.ClickedScopeLifetimeReset(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel("Timeline", [log_view(model.lifetime.log, h)], h),
        ]
    )
}

const finalizers_view = <ParentMessage>(
    model: ScopeExample.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("grid gap-5 lg:grid-cols-2")],
        [
            panel(
                "Finalizer stack",
                [
                    h.div(
                        [h.Class("space-y-3 p-6")],
                        [
                            Array.match(model.finalizers.registered, {
                                onEmpty: () =>
                                    h.p(
                                        [
                                            h.Class(
                                                "py-10 text-center text-sm text-muted-foreground"
                                            ),
                                        ],
                                        ["Register cleanup actions."]
                                    ),
                                onNonEmpty: (items) =>
                                    h.div(
                                        [h.Class("mx-auto max-w-sm space-y-2")],
                                        items.map((item, index) =>
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex items-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-4 py-3 font-mono text-sm"
                                                    ),
                                                ],
                                                [
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                "grid size-6 place-items-center rounded bg-muted text-xs"
                                                            ),
                                                        ],
                                                        [String(index + 1)]
                                                    ),
                                                    h.span([], [item]),
                                                ]
                                            )
                                        )
                                    ),
                            }),
                            h.p(
                                [
                                    h.Class(
                                        "text-center text-xs text-muted-foreground"
                                    ),
                                ],
                                ["Close pops cleanup from the top ↑"]
                            ),
                        ]
                    ),
                    controls(
                        [
                            ...Array.map(
                                ["database", "file", "cursor"] as const,
                                (name) =>
                                    action(
                                        `+ ${name}`,
                                        ScopeExample.ClickedRegisterScopeFinalizer(
                                            {
                                                name,
                                            }
                                        ),
                                        to_parent_message,
                                        model.finalizers.is_closed ||
                                            model.finalizers.registered.includes(
                                                name
                                            ),
                                        h
                                    )
                            ),
                            action(
                                "Close scope",
                                ScopeExample.ClickedCloseFinalizerScope(),
                                to_parent_message,
                                model.finalizers.is_closed,
                                h
                            ),
                            action(
                                "Reset",
                                ScopeExample.ClickedResetScopeFinalizers(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel("Observed order", [log_view(model.finalizers.log, h)], h),
        ]
    )

const acquire_release_view = <ParentMessage>(
    model: ScopeExample.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const example = model.acquire_release
    return h.div(
        [h.Class("grid gap-5 lg:grid-cols-2")],
        [
            panel(
                "acquire → use → release",
                [
                    h.div(
                        [h.Class("space-y-5 p-6")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "grid items-center gap-2 text-center sm:grid-cols-[1fr_auto_1fr_auto_1fr]"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-4 font-mono text-sm"
                                            ),
                                        ],
                                        ["Acquire"]
                                    ),
                                    h.span(
                                        [h.Class("text-muted-foreground")],
                                        ["→"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-4 font-mono text-sm"
                                            ),
                                        ],
                                        ["Use"]
                                    ),
                                    h.span(
                                        [h.Class("text-muted-foreground")],
                                        ["→"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border border-emerald-500 p-4 font-mono text-sm"
                                            ),
                                        ],
                                        ["Release"]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-2")],
                                [
                                    action(
                                        "Success",
                                        ScopeExample.SelectedScopeExit({
                                            exit: "Success",
                                        }),
                                        to_parent_message,
                                        example.exit === "Success",
                                        h
                                    ),
                                    action(
                                        "Failure",
                                        ScopeExample.SelectedScopeExit({
                                            exit: "Failure",
                                        }),
                                        to_parent_message,
                                        example.exit === "Failure",
                                        h
                                    ),
                                ]
                            ),
                            example.has_run
                                ? h.div(
                                      [
                                          h.Class(
                                              example.exit === "Success"
                                                  ? "flex items-center justify-between gap-3 rounded-[var(--radius-surface)] bg-emerald-500/10 px-4 py-3"
                                                  : "flex items-center justify-between gap-3 rounded-[var(--radius-surface)] bg-destructive/10 px-4 py-3"
                                          ),
                                      ],
                                      [
                                          h.span(
                                              [h.Class("text-sm")],
                                              [
                                                  `Release ran after ${example.exit.toLowerCase()}.`,
                                              ]
                                          ),
                                          badge(
                                              "RELEASED",
                                              "border-emerald-500/30 text-emerald-600",
                                              h
                                          ),
                                      ]
                                  )
                                : h.empty,
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Run scoped program",
                                ScopeExample.ClickedRunAcquireRelease(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Reset",
                                ScopeExample.ClickedResetAcquireRelease(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel("Timeline", [log_view(example.log, h)], h),
        ]
    )
}

const mini_scope = <ParentMessage>(
    label: string,
    task: string,
    state: ScopeExample.ScopeState,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                state === "open"
                    ? "flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-emerald-500 p-5"
                    : "flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border p-5 opacity-50"
            ),
        ],
        [
            h.span([h.Class("font-mono text-sm font-semibold")], [label]),
            h.span([h.Class("text-sm text-muted-foreground")], [task]),
            badge(
                state.toUpperCase(),
                state === "open"
                    ? "border-emerald-500/30 text-emerald-600"
                    : "border-border text-muted-foreground",
                h
            ),
        ]
    )

const manual_scopes_view = <ParentMessage>(
    model: ScopeExample.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const manual = model.manual_scopes
    return h.div(
        [h.Class("grid gap-5 lg:grid-cols-2")],
        [
            panel(
                "Independent lifetimes",
                [
                    h.div(
                        [h.Class("grid gap-4 p-6 sm:grid-cols-2")],
                        [
                            mini_scope("scope 1", "task 1", manual.scope_1, h),
                            mini_scope("scope 2", "task 2", manual.scope_2, h),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Start tasks",
                                ScopeExample.ClickedStartManualScopes(),
                                to_parent_message,
                                manual.has_started,
                                h
                            ),
                            action(
                                "Close scope 1",
                                ScopeExample.ClickedCloseManualScope({
                                    scope: 1,
                                }),
                                to_parent_message,
                                !manual.has_started ||
                                    manual.scope_1 === "closed",
                                h
                            ),
                            action(
                                "Do other work",
                                ScopeExample.ClickedManualScopeOtherWork(),
                                to_parent_message,
                                !manual.has_started,
                                h
                            ),
                            action(
                                "Close scope 2",
                                ScopeExample.ClickedCloseManualScope({
                                    scope: 2,
                                }),
                                to_parent_message,
                                !manual.has_started ||
                                    manual.scope_2 === "closed",
                                h
                            ),
                            action(
                                "Reset",
                                ScopeExample.ClickedResetManualScopes(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel("Timeline", [log_view(manual.log, h)], h),
        ]
    )
}

const lesson_note = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    panel(
        "v3 → v4 note",
        [
            h.p(
                [h.Class("px-5 py-4 text-sm leading-6 text-muted-foreground")],
                [
                    "The v3 Scope guide uses Scope.extend for caller-owned manual scopes. This repository uses Effect 4, where the corresponding API is Scope.provide.",
                ]
            ),
        ],
        h
    )

export const view = <ParentMessage>(
    model: ScopeExample.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Lifetime"
                ? lifetime_view(model, to_parent_message, h)
                : model.stage === "Finalizers"
                  ? finalizers_view(model, to_parent_message, h)
                  : model.stage === "AcquireRelease"
                    ? acquire_release_view(model, to_parent_message, h)
                    : manual_scopes_view(model, to_parent_message, h),
            lesson_note(h),
        ]
    )
