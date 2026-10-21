import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as CronDemo from "./cron.ts"

type ToParentMessage<ParentMessage> = (
    message: CronDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: CronDemo.Stage,
    model: CronDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                CronDemo.Message.SelectedCronStage({ stage })
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
    model: CronDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Cron examples"),
        ],
        [
            stage_button("Parse", model, to_parent_message, h),
            stage_button("Build", model, to_parent_message, h),
            stage_button("Match", model, to_parent_message, h),
            stage_button("Sequence", model, to_parent_message, h),
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

const choice_button = <ParentMessage>(
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
    details: CronDemo.StageDetails,
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
    details: CronDemo.StageDetails,
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

const label_value = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border border-border bg-background/70 p-3"
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
                [h.Class("mt-1 break-words font-mono text-xs font-semibold")],
                [value]
            ),
        ]
    )

const status_badge = <ParentMessage>(
    label: string,
    good: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.span(
        [
            h.Class(
                good
                    ? "rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1 font-mono text-[10px] font-semibold text-emerald-600"
                    : "rounded-full border border-red-500/30 bg-red-500/5 px-2.5 py-1 font-mono text-[10px] font-semibold text-red-600"
            ),
        ],
        [label]
    )

const field_grid = <ParentMessage>(
    fields: CronDemo.CronFields,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("grid gap-2 sm:grid-cols-2 xl:grid-cols-3")],
        [
            label_value("seconds", fields.seconds, h),
            label_value("minutes", fields.minutes, h),
            label_value("hours", fields.hours, h),
            label_value("days", fields.days, h),
            label_value("months", fields.months, h),
            label_value("weekdays", fields.weekdays, h),
        ]
    )

const parse_view = <ParentMessage>(
    model: CronDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = CronDemo.parse_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
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
                                ["Expression input"]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "Weekdays",
                                        to_parent_message(
                                            CronDemo.Message.SelectedCronParsePreset(
                                                {
                                                    preset: "Weekdays",
                                                }
                                            )
                                        ),
                                        model.parsePreset === "Weekdays",
                                        h
                                    ),
                                    choice_button(
                                        "10 seconds",
                                        to_parent_message(
                                            CronDemo.Message.SelectedCronParsePreset(
                                                {
                                                    preset: "Seconds",
                                                }
                                            )
                                        ),
                                        model.parsePreset === "Seconds",
                                        h
                                    ),
                                    choice_button(
                                        "Invalid",
                                        to_parent_message(
                                            CronDemo.Message.SelectedCronParsePreset(
                                                {
                                                    preset: "Invalid",
                                                }
                                            )
                                        ),
                                        model.parsePreset === "Invalid",
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-5 rounded-[var(--radius-surface)] border border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Cron expression"]
                                    ),
                                    h.code(
                                        [
                                            h.Class(
                                                "mt-2 block break-all font-mono text-base font-semibold text-cyan-700"
                                            ),
                                        ],
                                        [snapshot.expression]
                                    ),
                                    h.div(
                                        [h.Class("mt-3 flex flex-wrap gap-2")],
                                        [
                                            status_badge(
                                                snapshot.status === "success"
                                                    ? "Result.Success"
                                                    : "Result.Failure",
                                                snapshot.status === "success",
                                                h
                                            ),
                                            status_badge(
                                                `isCron: ${String(snapshot.isCron)}`,
                                                snapshot.isCron,
                                                h
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            snapshot.status === "failure"
                                ? h.div(
                                      [
                                          h.Class(
                                              "mt-4 rounded-[var(--radius-surface)] border border-red-500/30 bg-red-500/5 p-4"
                                          ),
                                      ],
                                      [
                                          h.div(
                                              [
                                                  h.Class(
                                                      "font-mono text-[10px] font-semibold text-red-600"
                                                  ),
                                              ],
                                              [
                                                  `CronParseError · ${String(snapshot.isCronParseError)}`,
                                              ]
                                          ),
                                          h.p(
                                              [
                                                  h.Class(
                                                      "mt-2 text-sm leading-6 text-red-700"
                                                  ),
                                              ],
                                              [snapshot.error]
                                          ),
                                      ]
                                  )
                                : h.div([], []),
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
                                ["Parsed Cron value"]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            field_grid(snapshot.fields, h),
                            h.div(
                                [h.Class("grid gap-2 md:grid-cols-2")],
                                [
                                    label_value(
                                        "Cron.format",
                                        snapshot.formatted,
                                        h
                                    ),
                                    label_value(
                                        "includeSeconds",
                                        snapshot.formattedWithSeconds,
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

const day_mode_control = <ParentMessage>(
    model: CronDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-wrap items-center gap-3")],
        [
            choice_button(
                model.dayMode === "Or" ? "OR mode" : "AND mode",
                to_parent_message(CronDemo.Message.ClickedToggleCronDayMode()),
                true,
                h
            ),
            h.span(
                [h.Class("text-xs text-muted-foreground")],
                [
                    model.dayMode === "Or"
                        ? "Either day-of-month or weekday may match."
                        : "Both day-of-month and weekday must match.",
                ]
            ),
        ]
    )

const build_view = <ParentMessage>(
    model: CronDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = CronDemo.build_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[1fr_1fr]")],
        [
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
                                ["Day matching rule"]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("space-y-5 p-5")],
                        [
                            day_mode_control(model, to_parent_message, h),
                            h.div(
                                [
                                    h.Class(
                                        "grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border border-border bg-background p-5"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                                                    ),
                                                ],
                                                ["day-of-month"]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-2 font-mono text-3xl font-semibold"
                                                    ),
                                                ],
                                                ["15"]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "grid place-items-center rounded-[var(--radius-surface)] border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 font-mono text-xs font-semibold text-cyan-700"
                                            ),
                                        ],
                                        [model.dayMode.toUpperCase()]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border border-border bg-background p-5"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                                                    ),
                                                ],
                                                ["weekday"]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-2 font-mono text-3xl font-semibold"
                                                    ),
                                                ],
                                                ["MON"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-muted/30 px-4 py-3 font-mono text-sm"
                                    ),
                                ],
                                [snapshot.dayRule]
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
                                ["Cron.make result"]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            field_grid(snapshot.fields, h),
                            h.div(
                                [h.Class("grid gap-2 md:grid-cols-2")],
                                [
                                    label_value(
                                        "format",
                                        snapshot.formatted,
                                        h
                                    ),
                                    label_value(
                                        "format + seconds",
                                        snapshot.includeSeconds,
                                        h
                                    ),
                                    label_value(
                                        "timezone",
                                        snapshot.timezone,
                                        h
                                    ),
                                    label_value(
                                        "Cron.isCron",
                                        String(snapshot.isCron),
                                        h
                                    ),
                                    label_value(
                                        "Cron.equals(rebuilt)",
                                        String(snapshot.equalsRebuilt),
                                        h
                                    ),
                                    label_value(
                                        "Cron.Equivalence(rebuilt)",
                                        String(snapshot.equivalentToRebuilt),
                                        h
                                    ),
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-amber-700"
                                    ),
                                ],
                                [
                                    "Formatting intentionally drops timezone and the AND/OR day-mode distinction, so formatted text is not always a lossless serialization of a Cron value.",
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const criterion = <ParentMessage>(
    label: string,
    value: string,
    matched: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                matched
                    ? "rounded-[var(--radius-surface)] border border-emerald-500/30 bg-emerald-500/5 p-4"
                    : "rounded-[var(--radius-surface)] border border-border bg-background p-4"
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
            h.div([h.Class("mt-2 font-mono text-sm font-semibold")], [value]),
            h.div(
                [h.Class("mt-3")],
                [status_badge(matched ? "matches" : "misses", matched, h)]
            ),
        ]
    )

const match_case_button = <ParentMessage>(
    matchCase: CronDemo.MatchCase,
    label: string,
    model: CronDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    choice_button(
        label,
        to_parent_message(
            CronDemo.Message.SelectedCronMatchCase({ matchCase })
        ),
        model.matchCase === matchCase,
        h
    )

const match_view = <ParentMessage>(
    model: CronDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = CronDemo.match_snapshot(model)

    return h.section(
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
                        ["Interactive match probe"]
                    ),
                ]
            ),
            h.div(
                [h.Class("space-y-5 p-5")],
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        [
                            match_case_button(
                                "Both",
                                "Mon 15 · both",
                                model,
                                to_parent_message,
                                h
                            ),
                            match_case_button(
                                "WeekdayOnly",
                                "Mon 22 · weekday",
                                model,
                                to_parent_message,
                                h
                            ),
                            match_case_button(
                                "DayOnly",
                                "Tue 15 · day",
                                model,
                                to_parent_message,
                                h
                            ),
                            match_case_button(
                                "Neither",
                                "Tue 22 · neither",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    day_mode_control(model, to_parent_message, h),
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
                                        "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                                    ),
                                ],
                                [snapshot.label]
                            ),
                            h.code(
                                [
                                    h.Class(
                                        "mt-2 block break-all font-mono text-sm font-semibold"
                                    ),
                                ],
                                [snapshot.iso]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("grid gap-3 md:grid-cols-2")],
                        [
                            criterion(
                                "day-of-month = 15",
                                snapshot.dayMatches ? "15" : "not 15",
                                snapshot.dayMatches,
                                h
                            ),
                            criterion(
                                "weekday = Monday",
                                snapshot.weekdayMatches
                                    ? "Monday"
                                    : "not Monday",
                                snapshot.weekdayMatches,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                snapshot.matched
                                    ? "rounded-[var(--radius-surface)] border border-emerald-500/30 bg-emerald-500/5 p-5"
                                    : "rounded-[var(--radius-surface)] border border-red-500/30 bg-red-500/5 p-5"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                                    ),
                                ],
                                ["Cron.match"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        snapshot.matched
                                            ? "mt-2 font-mono text-2xl font-semibold text-emerald-700"
                                            : "mt-2 font-mono text-2xl font-semibold text-red-700"
                                    ),
                                ],
                                [String(snapshot.matched)]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [snapshot.explanation]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const timeline_card = <ParentMessage>(
    label: string,
    value: string,
    accent: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                accent
                    ? "rounded-[var(--radius-surface)] border border-cyan-500/30 bg-cyan-500/5 p-4"
                    : "rounded-[var(--radius-surface)] border border-border bg-background p-4"
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
            h.code(
                [
                    h.Class(
                        "mt-2 block break-all font-mono text-xs font-semibold"
                    ),
                ],
                [value]
            ),
        ]
    )

const sequence_view = <ParentMessage>(
    model: CronDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = CronDemo.sequence_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
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
                                ["Strict neighbors"]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("space-y-3 p-5")],
                        [
                            label_value("schedule", snapshot.expression, h),
                            timeline_card(
                                "Cron.prev",
                                snapshot.previous,
                                false,
                                h
                            ),
                            timeline_card("anchor", snapshot.anchor, true, h),
                            timeline_card("Cron.next", snapshot.next, false, h),
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
                                "flex items-center justify-between gap-4 border-b-(length:--surface-border-width) border-border px-5 py-3"
                            ),
                        ],
                        [
                            h.h3(
                                [
                                    h.Class(
                                        "text-xs font-semibold tracking-widest uppercase"
                                    ),
                                ],
                                [`Cron.sequence · first ${snapshot.count}`]
                            ),
                            choice_button(
                                `take ${snapshot.count}`,
                                to_parent_message(
                                    CronDemo.Message.ClickedCycleCronSequenceCount()
                                ),
                                true,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("grid gap-2 p-5")],
                        snapshot.upcoming.map((value, index) =>
                            h.keyed("div")(
                                value,
                                [
                                    h.Class(
                                        "grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-[var(--radius-surface)] border border-border bg-background px-4 py-3"
                                    ),
                                ],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold text-cyan-700"
                                            ),
                                        ],
                                        [`#${index + 1}`]
                                    ),
                                    h.code(
                                        [
                                            h.Class(
                                                "break-all font-mono text-xs"
                                            ),
                                        ],
                                        [value]
                                    ),
                                ]
                            )
                        )
                    ),
                ]
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: CronDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = CronDemo.stage_details[model.stage]

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
                                        ["effect / Cron"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        ["Cron as calendar data"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Parse recurring schedules into typed values, inspect their fields, test calendar instants, and walk deterministic future occurrences.",
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
                                        ["Result parsing"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["timezone aware"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["lazy sequence"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            stage_intro(details, h),
            model.stage === "Parse"
                ? parse_view(model, to_parent_message, h)
                : model.stage === "Build"
                  ? build_view(model, to_parent_message, h)
                  : model.stage === "Match"
                    ? match_view(model, to_parent_message, h)
                    : sequence_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
