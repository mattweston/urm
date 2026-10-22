import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as DateTimeDemo from "./datetime.ts"

type ToParentMessage<ParentMessage> = (
    message: DateTimeDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: DateTimeDemo.Stage,
    model: DateTimeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                DateTimeDemo.Message.SelectedDateTimeStage({ stage })
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
    model: DateTimeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect DateTime examples"),
        ],
        DateTimeDemo.stages.map((stage) =>
            stage_button(stage, model, to_parent_message, h)
        )
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

const panel = <ParentMessage>(
    title: string,
    children: ReadonlyArray<Html>,
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
                        [title]
                    ),
                ]
            ),
            ...children,
        ]
    )

const metric = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>,
    tone: "default" | "cyan" | "green" | "amber" = "default"
): Html => {
    const tone_class =
        tone === "cyan"
            ? "border-cyan-500/30 bg-cyan-500/5"
            : tone === "green"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : tone === "amber"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border bg-background/70"

    return h.div(
        [
            h.Class(
                `min-w-0 rounded-[var(--radius-surface)] border p-3 ${tone_class}`
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div(
                [
                    h.Class(
                        "mt-1 break-words font-mono text-xs font-semibold leading-5"
                    ),
                ],
                [value]
            ),
        ]
    )
}

const choice_button = <ParentMessage>(
    label: string,
    is_active: boolean,
    message: DateTimeDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_active,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            is_active
                                ? "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-xs font-semibold text-cyan-700"
                                : "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const intro_panel = <ParentMessage>(
    details: DateTimeDemo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.div(
                [h.Class("grid gap-0 lg:grid-cols-[1.05fr_0.95fr]")],
                [
                    h.div(
                        [h.Class("p-6")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-600 uppercase"
                                    ),
                                ],
                                [details.eyebrow]
                            ),
                            h.h2(
                                [
                                    h.Class(
                                        "mt-2 text-2xl font-semibold tracking-tight"
                                    ),
                                ],
                                [details.title]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
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
                                "overflow-x-auto border-t border-border bg-background/60 p-5 font-mono text-xs leading-5 lg:border-l lg:border-t-0"
                            ),
                        ],
                        [h.code([], [details.code])]
                    ),
                ]
            ),
        ]
    )

const instant_view = <ParentMessage>(
    model: DateTimeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DateTimeDemo.instant_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Input → Option<DateTime>",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Iso",
                                        "Parts",
                                        "Epoch",
                                        "Invalid",
                                    ] as const
                                ).map((instantCase) =>
                                    choice_button(
                                        instantCase,
                                        model.instantCase === instantCase,
                                        DateTimeDemo.Message.SelectedDateTimeInstantCase(
                                            { instantCase }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("input", snapshot.inputLabel, h),
                            metric(
                                "DateTime.make",
                                snapshot.optionTag,
                                h,
                                snapshot.optionTag === "Some"
                                    ? "green"
                                    : "amber"
                            ),
                            metric(
                                "isDateTime",
                                String(snapshot.isDateTime),
                                h,
                                snapshot.isDateTime ? "green" : "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Decoded instant",
                [
                    h.div(
                        [h.Class("space-y-3 p-5")],
                        [
                            h.div(
                                [h.Class("grid gap-3 sm:grid-cols-2")],
                                [
                                    metric(
                                        "variant",
                                        snapshot.variant,
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "formatIso",
                                        snapshot.iso,
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "epoch millis",
                                        snapshot.epochMillis,
                                        h
                                    ),
                                    metric(
                                        "epoch seconds",
                                        snapshot.epochSeconds,
                                        h
                                    ),
                                ]
                            ),
                            metric("toPartsUtc", snapshot.partsUtc, h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The safe constructor isolates parsing failure in Option. Once present, every representation maps back to the same epoch-based instant model.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const zones_view = <ParentMessage>(
    model: DateTimeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DateTimeDemo.zone_snapshot(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            h.div(
                [h.Class("grid gap-5 xl:grid-cols-2")],
                [
                    panel(
                        "Attach a zone to one instant",
                        [
                            h.div(
                                [h.Class("space-y-4 p-5")],
                                [
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        (
                                            [
                                                "London",
                                                "NewYork",
                                                "Offset",
                                            ] as const
                                        ).map((zoneCase) =>
                                            choice_button(
                                                zoneCase === "NewYork"
                                                    ? "New York"
                                                    : zoneCase === "Offset"
                                                      ? "+05:30"
                                                      : "London",
                                                model.zoneCase === zoneCase,
                                                DateTimeDemo.Message.SelectedDateTimeZoneCase(
                                                    { zoneCase }
                                                ),
                                                to_parent_message,
                                                h
                                            )
                                        )
                                    ),
                                    h.div(
                                        [h.Class("grid gap-3 sm:grid-cols-2")],
                                        [
                                            metric(
                                                "zone variant",
                                                snapshot.zoneKind,
                                                h
                                            ),
                                            metric(
                                                "zoneToString",
                                                snapshot.zoneName,
                                                h,
                                                "cyan"
                                            ),
                                            metric(
                                                "offset",
                                                snapshot.offsetIso,
                                                h
                                            ),
                                            metric(
                                                "same epoch as UTC?",
                                                String(snapshot.sameEpochAsUtc),
                                                h,
                                                "green"
                                            ),
                                        ]
                                    ),
                                    metric(
                                        "formatIsoZoned",
                                        snapshot.zonedIso,
                                        h
                                    ),
                                    metric(
                                        "formatIso (UTC instant)",
                                        snapshot.utcIso,
                                        h
                                    ),
                                    metric(
                                        "local ISO date",
                                        snapshot.localDate,
                                        h
                                    ),
                                ]
                            ),
                        ],
                        h
                    ),
                    panel(
                        "DST repeated wall time",
                        [
                            h.div(
                                [h.Class("space-y-4 p-5")],
                                [
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "America/New_York · 2025-11-02 01:30 occurs twice when clocks fall back.",
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        (
                                            [
                                                "Earlier",
                                                "Later",
                                                "Reject",
                                            ] as const
                                        ).map((disambiguation) =>
                                            choice_button(
                                                disambiguation,
                                                model.disambiguation ===
                                                    disambiguation,
                                                DateTimeDemo.Message.SelectedDateTimeDisambiguation(
                                                    { disambiguation }
                                                ),
                                                to_parent_message,
                                                h
                                            )
                                        )
                                    ),
                                    metric(
                                        "makeZoned result",
                                        snapshot.repeatedResult,
                                        h,
                                        snapshot.repeatedUtc === "—"
                                            ? "amber"
                                            : "green"
                                    ),
                                    metric(
                                        "resolved UTC instant",
                                        snapshot.repeatedUtc,
                                        h
                                    ),
                                    metric(
                                        "resolved zoned time",
                                        snapshot.repeatedZoned,
                                        h
                                    ),
                                ]
                            ),
                        ],
                        h
                    ),
                ]
            ),
            panel(
                "CurrentTimeZone is an Effect service",
                [
                    h.div(
                        [h.Class("grid gap-0 md:grid-cols-[1fr_auto_1fr]")],
                        [
                            h.div(
                                [h.Class("p-5")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        ["DateTime.nowInCurrentZone"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Reads Clock plus the ambient CurrentTimeZone capability.",
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
                                ["provide zone →"]
                            ),
                            h.div(
                                [h.Class("p-5")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        [
                                            "withCurrentZoneNamed / layerCurrentZoneNamed",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Makes zone-sensitive current-time code deterministic and injectable.",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const math_view = <ParentMessage>(
    model: DateTimeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DateTimeDemo.math_snapshot(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "Spring-forward experiment",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Start at noon in New York on March 8, 2025. Overnight, daylight saving moves clocks forward by one hour.",
                                ]
                            ),
                            metric("base", snapshot.base, h, "cyan"),
                            h.div(
                                [h.Class("grid gap-3 lg:grid-cols-2")],
                                [
                                    h.div(
                                        [h.Class("space-y-3")],
                                        [
                                            metric(
                                                "add({ days: 1 })",
                                                snapshot.calendar,
                                                h
                                            ),
                                            metric(
                                                "elapsed distance",
                                                `${snapshot.calendarHours} hours`,
                                                h,
                                                "green"
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("space-y-3")],
                                        [
                                            metric(
                                                'addDuration("24 hours")',
                                                snapshot.elapsed,
                                                h
                                            ),
                                            metric(
                                                "elapsed distance",
                                                `${snapshot.elapsedHours} hours`,
                                                h,
                                                "green"
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            h.div(
                [h.Class("grid gap-5 xl:grid-cols-2")],
                [
                    panel(
                        "Select the semantic operation",
                        [
                            h.div(
                                [h.Class("space-y-4 p-5")],
                                [
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        (["Calendar", "Elapsed"] as const).map(
                                            (mathMode) =>
                                                choice_button(
                                                    mathMode,
                                                    model.mathMode === mathMode,
                                                    DateTimeDemo.Message.SelectedDateTimeMathMode(
                                                        { mathMode }
                                                    ),
                                                    to_parent_message,
                                                    h
                                                )
                                        )
                                    ),
                                    metric(
                                        "operation",
                                        snapshot.selectedLabel,
                                        h,
                                        "cyan"
                                    ),
                                    metric("result", snapshot.selectedValue, h),
                                ]
                            ),
                        ],
                        h
                    ),
                    panel(
                        "Calendar boundaries",
                        [
                            h.div(
                                [h.Class("space-y-3 p-5")],
                                [
                                    metric(
                                        'startOf("day")',
                                        snapshot.startOfDay,
                                        h
                                    ),
                                    metric(
                                        'endOf("day")',
                                        snapshot.endOfDay,
                                        h
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "startOf/endOf preserve the DateTime variant and use its zone when calculating the local calendar boundary.",
                                        ]
                                    ),
                                ]
                            ),
                        ],
                        h
                    ),
                ]
            ),
        ]
    )
}

const format_view = <ParentMessage>(
    model: DateTimeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DateTimeDemo.format_snapshot(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "One instant, three representations",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["UTC", "London", "Auckland"] as const).map(
                                    (formatZone) =>
                                        choice_button(
                                            formatZone,
                                            model.formatZone === formatZone,
                                            DateTimeDemo.Message.SelectedDateTimeFormatZone(
                                                { formatZone }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                                    ),
                                ],
                                [
                                    metric(
                                        "variant",
                                        snapshot.variant,
                                        h,
                                        "cyan"
                                    ),
                                    metric("zone", snapshot.zone, h),
                                    metric(
                                        "DateTime.match",
                                        snapshot.matchResult,
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            h.div(
                [h.Class("grid gap-5 xl:grid-cols-2")],
                [
                    panel(
                        "Stable ISO helpers",
                        [
                            h.div(
                                [h.Class("space-y-3 p-5")],
                                [
                                    metric(
                                        "formatIso",
                                        snapshot.iso,
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "formatIsoDate",
                                        snapshot.isoDate,
                                        h
                                    ),
                                    metric(
                                        "formatIsoDateUtc",
                                        snapshot.isoDateUtc,
                                        h
                                    ),
                                    metric(
                                        "formatIsoOffset",
                                        snapshot.isoOffset,
                                        h
                                    ),
                                    metric(
                                        "formatIsoZoned",
                                        snapshot.isoZoned,
                                        h
                                    ),
                                ]
                            ),
                        ],
                        h
                    ),
                    panel(
                        "Intl formatting",
                        [
                            h.div(
                                [h.Class("space-y-4 p-5")],
                                [
                                    metric(
                                        'format({ locale: "en-GB", ... })',
                                        snapshot.intl,
                                        h,
                                        "cyan"
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "DateTime.format delegates presentation to Intl.DateTimeFormat. Zoned values use their attached zone unless the formatting options override it.",
                                        ]
                                    ),
                                ]
                            ),
                        ],
                        h
                    ),
                ]
            ),
        ]
    )
}

const notice_panel = <ParentMessage>(
    details: DateTimeDemo.StageDetails,
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

export const view = <ParentMessage>(
    model: DateTimeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = DateTimeDemo.stage_details[model.stage]

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
                                        ["effect / DateTime"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Absolute instants with calendar context",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "See where UTC identity ends and time-zone interpretation begins, then compare DST-aware calendar math with exact elapsed durations.",
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
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["96-export module"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["IANA zones"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["DST aware"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            intro_panel(details, h),
            model.stage === "Instant"
                ? instant_view(model, to_parent_message, h)
                : model.stage === "Zones"
                  ? zones_view(model, to_parent_message, h)
                  : model.stage === "Math"
                    ? math_view(model, to_parent_message, h)
                    : format_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
