import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as ContextDemo from "./context.ts"

type ToParentMessage<ParentMessage> = (
    message: ContextDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: ContextDemo.Stage,
    model: ContextDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                ContextDemo.Message.SelectedContextStage({ stage })
            ),
            isDisabled: model.stage === stage,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            model.stage === stage
                                ? "rounded-[var(--radius-surface)] bg-foreground px-3 py-2 text-xs font-semibold tracking-wider text-background uppercase"
                                : "rounded-[var(--radius-surface)] px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground"
                        ),
                    ],
                    [stage]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: ContextDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Context examples"),
        ],
        [
            stage_button("Keys", model, to_parent_message, h),
            stage_button("Build", model, to_parent_message, h),
            stage_button("Merge", model, to_parent_message, h),
            stage_button("Reference", model, to_parent_message, h),
        ]
    )

const api_pills = <ParentMessage>(
    apis: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    apis.map((api) =>
        h.keyed("span")(
            api,
            [
                h.Class(
                    "rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1 font-mono text-[10px] text-cyan-600"
                ),
            ],
            [api]
        )
    )

const small_button = <ParentMessage>(
    label: string,
    onClick: ParentMessage,
    active: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            active
                                ? "rounded-[var(--radius-surface)] border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-700"
                                : "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_intro = <ParentMessage>(
    details: ContextDemo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.div(
                [
                    h.Class(
                        "grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)] lg:items-start"
                    ),
                ],
                [
                    h.div(
                        [h.Class("min-w-0")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-[10px] font-semibold tracking-[0.18em] text-cyan-600 uppercase"
                                    ),
                                ],
                                [details.eyebrow]
                            ),
                            h.h3(
                                [
                                    h.Class(
                                        "mt-1 text-lg font-semibold tracking-tight"
                                    ),
                                ],
                                [details.title]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 max-w-3xl text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [details.description]
                            ),
                            h.div(
                                [h.Class("mt-4 flex flex-wrap gap-2")],
                                api_pills(details.apis, h)
                            ),
                        ]
                    ),
                    h.pre(
                        [
                            h.Class(
                                "overflow-x-auto rounded-[var(--radius-surface)] border border-border bg-background p-4"
                            ),
                        ],
                        [
                            h.code(
                                [
                                    h.Class(
                                        "font-mono text-xs leading-6 text-foreground"
                                    ),
                                ],
                                [details.code]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const notice_panel = <ParentMessage>(
    details: ContextDemo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.header(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border px-5 py-3"
                    ),
                ],
                [
                    h.h3(
                        [
                            h.Class(
                                "text-xs font-semibold tracking-widest uppercase"
                            ),
                        ],
                        ["What to notice"]
                    ),
                ]
            ),
            h.p(
                [h.Class("px-5 py-4 text-sm leading-6 text-muted-foreground")],
                [details.notice]
            ),
        ]
    )

const status_badge = <ParentMessage>(
    label: string,
    tone: "good" | "muted" | "accent",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const tone_class =
        tone === "good"
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
            : tone === "accent"
              ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-600"
              : "border-border bg-muted/40 text-muted-foreground"

    return h.span(
        [
            h.Class(
                `rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold ${tone_class}`
            ),
        ],
        [label]
    )
}

const slot_card = <ParentMessage>(
    slot: ContextDemo.ServiceSlot,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("article")(
        slot.key,
        [
            h.Class(
                slot.status === "present"
                    ? "rounded-[var(--radius-surface)] border border-emerald-500/30 bg-emerald-500/5 p-4"
                    : "rounded-[var(--radius-surface)] border border-dashed border-border bg-background/50 p-4"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-start justify-between gap-3")],
                [
                    h.div(
                        [h.Class("min-w-0")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "truncate font-mono text-xs font-semibold"
                                    ),
                                ],
                                [slot.key]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 text-xs leading-5 text-muted-foreground"
                                    ),
                                ],
                                [slot.value]
                            ),
                        ]
                    ),
                    status_badge(
                        slot.status,
                        slot.status === "present" ? "good" : "muted",
                        h
                    ),
                ]
            ),
        ]
    )

const key_card = <ParentMessage>(
    fact: ContextDemo.KeyFact,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("article")(
        fact.key,
        [h.Class(PANEL_CLASS)],
        [
            h.header(
                [
                    h.Class(
                        "flex items-start justify-between gap-4 border-b-(length:--surface-border-width) border-border px-5 py-4"
                    ),
                ],
                [
                    h.div(
                        [],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
                                    ),
                                ],
                                [fact.kind]
                            ),
                            h.h3(
                                [h.Class("mt-1 text-base font-semibold")],
                                [fact.label]
                            ),
                        ]
                    ),
                    status_badge("Context.Key", "accent", h),
                ]
            ),
            h.div(
                [h.Class("space-y-4 p-5")],
                [
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border border-border bg-background p-3"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
                                    ),
                                ],
                                ["runtime key"]
                            ),
                            h.code(
                                [
                                    h.Class(
                                        "mt-2 block break-all font-mono text-xs text-foreground"
                                    ),
                                ],
                                [fact.key]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("grid grid-cols-2 gap-3")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border p-3"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] uppercase text-muted-foreground"
                                            ),
                                        ],
                                        ["isKey"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-1 font-mono text-sm font-semibold text-emerald-600"
                                            ),
                                        ],
                                        [String(fact.isKey)]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border p-3"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] uppercase text-muted-foreground"
                                            ),
                                        ],
                                        ["isReference"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-1 font-mono text-sm font-semibold"
                                            ),
                                        ],
                                        [String(fact.isReference)]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground"
                            ),
                        ],
                        [`Effect requirement → ${fact.requirement}`]
                    ),
                ]
            ),
        ]
    )

const keys_view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.div(
        [h.Class("grid gap-5 lg:grid-cols-2")],
        [
            ...ContextDemo.key_facts.map((fact) => key_card(fact, h)),
            h.section(
                [h.Class(`${PANEL_CLASS} lg:col-span-2`)],
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-0 md:grid-cols-[1fr_auto_1fr] md:items-stretch"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("p-5")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["program"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-sm font-semibold"
                                            ),
                                        ],
                                        ["yield* Database"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "The key participates in Effect typing as a requirement until a matching Context is supplied.",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "grid place-items-center border-y border-border px-5 py-3 font-mono text-xs text-cyan-600 md:border-x md:border-y-0"
                                    ),
                                ],
                                ["Context key →"]
                            ),
                            h.div(
                                [h.Class("p-5")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["service"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-sm font-semibold"
                                            ),
                                        ],
                                        ["{ query(sql) }"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "At runtime the key string identifies the slot; the key type preserves the service shape for TypeScript.",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const lookup_row = <ParentMessage>(
    api: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "grid gap-2 border-b border-border/60 px-4 py-3 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center"
            ),
        ],
        [
            h.code(
                [h.Class("font-mono text-xs font-semibold text-cyan-600")],
                [api]
            ),
            h.code(
                [
                    h.Class(
                        "min-w-0 break-words font-mono text-xs leading-5 text-foreground"
                    ),
                ],
                [value]
            ),
        ]
    )

const build_view = <ParentMessage>(
    model: ContextDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ContextDemo.build_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            h.section(
                [h.Class(PANEL_CLASS)],
                [
                    h.header(
                        [
                            h.Class(
                                "border-b-(length:--surface-border-width) border-border px-5 py-4"
                            ),
                        ],
                        [
                            h.h3(
                                [h.Class("text-sm font-semibold")],
                                ["Build the map"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-1 text-xs leading-5 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "These controls rebuild an immutable Context with real Context.make / Context.add calls.",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("space-y-5 p-5")],
                        [
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Database implementation"]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        [
                                            small_button(
                                                `Switch to ${model.databaseSource === "Primary" ? "Replica" : "Primary"}`,
                                                to_parent_message(
                                                    ContextDemo.Message.ClickedToggleDatabaseSource()
                                                ),
                                                false,
                                                h
                                            ),
                                            status_badge(
                                                model.databaseSource,
                                                "accent",
                                                h
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Optional slots"]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        [
                                            small_button(
                                                model.includeCache
                                                    ? "Remove Cache"
                                                    : "Add Cache",
                                                to_parent_message(
                                                    ContextDemo.Message.ClickedToggleCache()
                                                ),
                                                model.includeCache,
                                                h
                                            ),
                                            small_button(
                                                model.includeConfig
                                                    ? "Remove Config"
                                                    : "Add Config",
                                                to_parent_message(
                                                    ContextDemo.Message.ClickedToggleConfig()
                                                ),
                                                model.includeConfig,
                                                h
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            h.section(
                [h.Class(PANEL_CLASS)],
                [
                    h.header(
                        [
                            h.Class(
                                "flex items-center justify-between gap-4 border-b-(length:--surface-border-width) border-border px-5 py-4"
                            ),
                        ],
                        [
                            h.div(
                                [],
                                [
                                    h.h3(
                                        [h.Class("text-sm font-semibold")],
                                        ["Context slots"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-1 text-xs text-muted-foreground"
                                            ),
                                        ],
                                        ["Stored by each key's runtime string"]
                                    ),
                                ]
                            ),
                            status_badge("immutable", "good", h),
                        ]
                    ),
                    h.div(
                        [h.Class("grid gap-3 p-4 md:grid-cols-3")],
                        snapshot.slots.map((slot) => slot_card(slot, h))
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border"
                            ),
                        ],
                        [
                            lookup_row(
                                "Context.get",
                                snapshot.databaseResult,
                                h
                            ),
                            lookup_row(
                                "Context.getOption",
                                snapshot.cacheResult,
                                h
                            ),
                            lookup_row(
                                "Context.getOrElse",
                                snapshot.configResult,
                                h
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const source_context = <ParentMessage>(
    title: string,
    subtitle: string,
    slots: ReadonlyArray<
        Readonly<{ name: string; value: string; conflict?: boolean }>
    >,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.header(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border px-4 py-3"
                    ),
                ],
                [
                    h.h3([h.Class("text-sm font-semibold")], [title]),
                    h.p(
                        [h.Class("mt-1 text-xs text-muted-foreground")],
                        [subtitle]
                    ),
                ]
            ),
            h.div(
                [h.Class("space-y-2 p-3")],
                slots.map((slot) =>
                    h.keyed("div")(
                        `${title}-${slot.name}`,
                        [
                            h.Class(
                                slot.conflict
                                    ? "rounded-[var(--radius-surface)] border border-amber-500/30 bg-amber-500/5 p-3"
                                    : "rounded-[var(--radius-surface)] border border-border bg-background p-3"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-[10px] font-semibold text-muted-foreground"
                                    ),
                                ],
                                [slot.name]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-1 font-mono text-xs font-semibold"
                                    ),
                                ],
                                [slot.value]
                            ),
                        ]
                    )
                )
            ),
        ]
    )

const merge_mode_label = (mode: ContextDemo.MergeMode): string => {
    if (mode === "PickDatabase") {
        return "pick(Database)"
    }

    if (mode === "OmitTelemetry") {
        return "omit(Telemetry)"
    }

    return "merged"
}

const merge_view = <ParentMessage>(
    model: ContextDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ContextDemo.merge_snapshot(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            h.div(
                [
                    h.Class(
                        "grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch"
                    ),
                ],
                [
                    source_context(
                        "left Context",
                        "core services",
                        [
                            {
                                name: ContextDemo.Database.key,
                                value: "primary",
                                conflict: true,
                            },
                            {
                                name: ContextDemo.APP_CONFIG_KEY,
                                value: "eu-west",
                            },
                        ],
                        h
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid place-items-center px-2 font-mono text-xs text-cyan-600"
                            ),
                        ],
                        ["+"]
                    ),
                    source_context(
                        "right Context",
                        "override + telemetry",
                        [
                            {
                                name: ContextDemo.Database.key,
                                value: "replica",
                                conflict: true,
                            },
                            {
                                name: ContextDemo.Telemetry.key,
                                value: "otlp",
                            },
                        ],
                        h
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid place-items-center px-2 font-mono text-xs text-cyan-600"
                            ),
                        ],
                        ["→"]
                    ),
                    h.section(
                        [h.Class(PANEL_CLASS)],
                        [
                            h.header(
                                [
                                    h.Class(
                                        "border-b-(length:--surface-border-width) border-border px-4 py-3"
                                    ),
                                ],
                                [
                                    h.h3(
                                        [h.Class("text-sm font-semibold")],
                                        ["result"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-1 font-mono text-xs text-cyan-600"
                                            ),
                                        ],
                                        [merge_mode_label(model.mergeMode)]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("space-y-2 p-3")],
                                snapshot.slots.map((slot) => slot_card(slot, h))
                            ),
                        ]
                    ),
                ]
            ),
            h.section(
                [h.Class(PANEL_CLASS)],
                [
                    h.div(
                        [
                            h.Class(
                                "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                            ),
                        ],
                        [
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-xs font-semibold tracking-wider uppercase"
                                            ),
                                        ],
                                        ["Filter the merged Context"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-1 text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "The merge already selected replica for Database before filtering runs.",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    small_button(
                                        "Merged",
                                        to_parent_message(
                                            ContextDemo.Message.SelectedContextMergeMode(
                                                { mode: "Merged" }
                                            )
                                        ),
                                        model.mergeMode === "Merged",
                                        h
                                    ),
                                    small_button(
                                        "Pick Database",
                                        to_parent_message(
                                            ContextDemo.Message.SelectedContextMergeMode(
                                                { mode: "PickDatabase" }
                                            )
                                        ),
                                        model.mergeMode === "PickDatabase",
                                        h
                                    ),
                                    small_button(
                                        "Omit Telemetry",
                                        to_parent_message(
                                            ContextDemo.Message.SelectedContextMergeMode(
                                                { mode: "OmitTelemetry" }
                                            )
                                        ),
                                        model.mergeMode === "OmitTelemetry",
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const reference_view = <ParentMessage>(
    model: ContextDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ContextDemo.reference_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.85fr_1.15fr]")],
        [
            h.section(
                [h.Class(PANEL_CLASS)],
                [
                    h.header(
                        [
                            h.Class(
                                "border-b-(length:--surface-border-width) border-border px-5 py-4"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "flex items-start justify-between gap-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
                                                    ),
                                                ],
                                                ["Context.Reference"]
                                            ),
                                            h.h3(
                                                [
                                                    h.Class(
                                                        "mt-1 text-base font-semibold"
                                                    ),
                                                ],
                                                ["RequestLabel"]
                                            ),
                                        ]
                                    ),
                                    status_badge(
                                        snapshot.isReference
                                            ? "isReference: true"
                                            : "isReference: false",
                                        "accent",
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["defaultValue"]
                                    ),
                                    h.code(
                                        [
                                            h.Class(
                                                "mt-2 block font-mono text-sm font-semibold"
                                            ),
                                        ],
                                        ['() => "public"']
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex items-center justify-between gap-3 rounded-[var(--radius-surface)] border border-border p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
                                                    ),
                                                ],
                                                ["stored override"]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-1 font-mono text-sm font-semibold"
                                                    ),
                                                ],
                                                [
                                                    model.referenceOverride
                                                        ? "admin-preview"
                                                        : "none",
                                                ]
                                            ),
                                        ]
                                    ),
                                    small_button(
                                        model.referenceOverride
                                            ? "Remove override"
                                            : "Add override",
                                        to_parent_message(
                                            ContextDemo.Message.ClickedToggleReferenceOverride()
                                        ),
                                        model.referenceOverride,
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] bg-muted/40 px-4 py-3"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Effect requirement"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-1 font-mono text-sm font-semibold text-emerald-600"
                                            ),
                                        ],
                                        ["never"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            h.section(
                [h.Class(PANEL_CLASS)],
                [
                    h.header(
                        [
                            h.Class(
                                "flex items-center justify-between gap-4 border-b-(length:--surface-border-width) border-border px-5 py-4"
                            ),
                        ],
                        [
                            h.div(
                                [],
                                [
                                    h.h3(
                                        [h.Class("text-sm font-semibold")],
                                        ["Reference-aware lookup"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-1 text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "No override still resolves successfully because the Reference owns a default.",
                                        ]
                                    ),
                                ]
                            ),
                            status_badge(snapshot.source, "good", h),
                        ]
                    ),
                    h.div(
                        [],
                        [
                            lookup_row("Context.get", snapshot.resolved, h),
                            lookup_row(
                                "Context.getOption",
                                snapshot.optionResult,
                                h
                            ),
                            lookup_row(
                                "Context.getOrElse",
                                `${snapshot.fallbackResult} · fallback not needed`,
                                h
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: ContextDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = ContextDemo.stage_details[model.stage]

    return h.div(
        [h.Class("space-y-5")],
        [
            h.section(
                [h.Class(PANEL_CLASS)],
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("max-w-3xl")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-600 uppercase"
                                            ),
                                        ],
                                        ["effect / Context"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        ["Context as a typed service map"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Build, combine, filter, and resolve real Effect Context values while the Foldkit Model only stores the controls that change the experiment.",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex flex-wrap gap-2 lg:justify-end"
                                    ),
                                ],
                                [
                                    status_badge("typed keys", "accent", h),
                                    status_badge("immutable", "good", h),
                                    status_badge(
                                        "dependency injection",
                                        "muted",
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            stage_intro(details, h),
            model.stage === "Keys"
                ? keys_view(h)
                : model.stage === "Build"
                  ? build_view(model, to_parent_message, h)
                  : model.stage === "Merge"
                    ? merge_view(model, to_parent_message, h)
                    : reference_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
