import { Match as M, Option } from "effect"
import { Submodel } from "foldkit"
import { inertHtml } from "foldkit/html"
import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    category_for,
    example_by_key,
    example_node_label,
    type Example,
} from "./catalog.ts"
import { MeasureHighlight, TARGETS_ATTRIBUTE } from "./measure.ts"
import { STEP_INDEX_ATTRIBUTE } from "./animation.ts"
import {
    ClickedNode,
    ChangedConcurrencyMode,
    ChangedFinalizerOutcome,
    HoveredControl,
    UnhoveredControl,
    HoveredNode,
    HoveredStep,
    UnhoveredStep,
    ToggledSound,
    UnhoveredNode,
    type Message,
} from "./message.ts"
import type { ConcurrencyMode, FinalizerOutcome } from "./catalog/options.ts"
import { example_timelines } from "./catalog/timelines.ts"
import type { ExampleState, Finalizer, Model, Notification } from "./model.ts"
import { VARIABLE_PREFIX, type CodeLine } from "./shiki.ts"
import * as Styles from "./styles.ts"
import { snippet_result_target_key } from "./snippet-highlights.ts"
import { sound_preference_label } from "./audio.ts"
import { result_text, type ResultValue } from "./result.ts"
import { step_target_key } from "./catalog/define.ts"

// PORT NOTE: the source had two of these — `phaseClass` returning "effect-idle"
// and `inputPhase` returning "idle" — then built the brand mark's class as
// `site-brand-mark-${phaseClass}`, i.e. `site-brand-mark-effect-running`, which
// no rule matches. One function, bare names, and the brand mark now spins.
const phase_of = (state: ExampleState): string =>
    M.value(state).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
            Idle: () => "idle",
            Running: () => "running",
            Succeeded: () => "succeeded",
            Failed: () => "failed",
            Died: () => "died",
            Interrupted: () => "interrupted",
        })
    )

const header_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.header(
        [h.Class(Styles.HEADER)],
        [
            h.div(
                [h.Class(Styles.BRAND)],
                [
                    h.span(
                        [h.Class(Styles.brand_mark(phase_of(model.state)))],
                        ["✦"]
                    ),
                    h.span([h.Class(Styles.BRAND_TITLE)], ["VISUAL EFFECT"]),
                ]
            ),
            h.button(
                [
                    h.Type("button"),
                    h.Class(Styles.sound(model.sound_preference.toLowerCase())),
                    h.AriaLabel(
                        `Sound: ${model.sound_preference.toLowerCase()}`
                    ),
                    h.OnClick(ToggledSound()),
                ],
                [sound_preference_label(model.sound_preference)]
            ),
        ]
    )

// PORT NOTE: upstream shows a sparkle at rest and swaps it, on hover, for the
// action the button would take — play, stop or reset. The port had the sparkle
// in every state, so the gesture was only discoverable from the intro text.
// The option-key "copy deep link" affordance is not ported: routes already put
// each example in the address bar.
export const control_icon_name = (
    state: ExampleState,
    is_hovered: boolean
): "star" | "play" | "stop" | "reset" => {
    if (!is_hovered) {
        return "star"
    }

    return M.value(state).pipe(
        M.withReturnType<"play" | "stop" | "reset">(),
        M.tagsExhaustive({
            Idle: () => "play",
            Running: () => "stop",
            Succeeded: () => "reset",
            Failed: () => "reset",
            Died: () => "reset",
            Interrupted: () => "reset",
        })
    )
}

const control_icon = (name: string, phase: string): Html => {
    if (name === "play") {
        return AppIcon.IconPlay({ class: Styles.CARD_ICON_GLYPH })
    }

    if (name === "stop") {
        return AppIcon.IconSquare({ class: Styles.CARD_ICON_GLYPH })
    }

    if (name === "reset") {
        return AppIcon.IconRotateCcw({ class: Styles.CARD_ICON_GLYPH })
    }

    return inertHtml.span([inertHtml.Class(Styles.sparkle(phase))], [])
}

const node_status = (state: ExampleState): string =>
    M.value(state).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
            Idle: () => "Run this effect",
            Running: ({ elapsed_millis }) =>
                `Running — ${Math.round(elapsed_millis)} ms. Tap to interrupt.`,
            Succeeded: ({ duration_millis, result }) =>
                `Succeeded — ${result_text(result)} (${Math.round(duration_millis)} ms). Tap to reset.`,
            Failed: ({ duration_millis, error }) =>
                `Failed — ${error} (${Math.round(duration_millis)} ms). Tap to reset.`,
            Died: ({ duration_millis, defect }) =>
                `Died — ${defect} (${Math.round(duration_millis)} ms). Tap to reset.`,
            Interrupted: ({ duration_millis }) =>
                `Interrupted — ${Math.round(duration_millis)} ms. Tap to reset.`,
        })
    )

// PORT NOTE: upstream's `RenderableResult.render()` lives here instead — the
// class hierarchy became a tagged union, so the per-kind markup is one match
// rather than a method on each subclass. A temperature gets its degree sign and
// its own size; an emoji gets a bigger one.
const result_view = (value: ResultValue, h: HtmlBuilder<Message>): Html =>
    M.value(value).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            PrimitiveResult: ({ value: text }) =>
                h.span([h.Class(Styles.RESULT_PRIMITIVE)], [text]),
            EmojiResult: ({ emoji }) =>
                h.span([h.Class(Styles.RESULT_EMOJI)], [emoji]),
            TemperatureResult: ({ degrees }) =>
                h.span(
                    [h.Class(Styles.RESULT_TEMPERATURE)],
                    [`${degrees.toString()}°`]
                ),
            TemperatureListResult: ({ degrees }) =>
                h.span(
                    [h.Class(Styles.RESULT_TEMPERATURE_LIST)],
                    degrees.map((value, index) =>
                        h.span(
                            [h.Class(Styles.RESULT_TEMPERATURE)],
                            [
                                index === degrees.length - 1
                                    ? `${value.toString()}°`
                                    : `${value.toString()}°, `,
                            ]
                        )
                    )
                ),
        })
    )

const node_content = (
    state: ExampleState,
    h: HtmlBuilder<Message>
): Html | string =>
    M.value(state).pipe(
        M.withReturnType<Html | string>(),
        M.tagsExhaustive({
            Idle: () => "✦",
            Running: () => "✦",
            Succeeded: ({ result }) => result_view(result, h),
            Failed: () => "!",
            Died: () => "!",
            Interrupted: () => "✦",
        })
    )

const step_node_content = (
    state: ExampleState,
    h: HtmlBuilder<Message>
): Html | string =>
    M.value(state).pipe(
        M.withReturnType<Html | string>(),
        M.tag("Idle", () => h.span([h.Class(Styles.sparkle("idle"))])),
        M.tag("Running", () => h.span([h.Class(Styles.sparkle("running"))])),
        M.orElse(() => node_content(state, h))
    )

// Sits above the node. The death variant's text is already glitched by the
// time it reaches here — the substitution is random, so it happens once when
// the notification is raised rather than on every render.
const notification_view = (
    notification: Notification,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class(Styles.NOTIFICATION)],
        [
            h.span(
                [
                    h.Class(Styles.notification_bubble(notification.variant)),
                    h.AriaLabel(notification.label),
                ],
                [
                    h.span([h.Class(Styles.NOTIFICATION_ARROW)]),
                    h.span(
                        [
                            h.Class(
                                Styles.notification_text(notification.variant)
                            ),
                        ],
                        [notification.text]
                    ),
                ]
            ),
        ]
    )

// Auto-dismissed after its duration, but `show_on_hover` brings it back while
// the node is hovered — the source keeps the notification and re-derives
// visibility rather than discarding it.
const visible_notification = (model: Model): Notification | undefined =>
    Option.match(model.notification, {
        onNone: () => undefined,
        onSome: (notification) =>
            model.is_notification_visible ||
            (notification.show_on_hover && model.is_node_hovered)
                ? notification
                : undefined,
    })

// The original has no Start/Stop/Reset row — one node, tapped.
const node_view = (
    example: Example,
    model: Model,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class(Styles.STAGE)],
        [
            ...model.concurrency_steps.map((step) =>
                h.div(
                    [
                        h.Class(Styles.STEP),
                        h.OnMouseEnter(HoveredStep({ index: step.index })),
                        h.OnMouseLeave(UnhoveredStep()),
                    ],
                    [
                        h.div(
                            [
                                h.Class(Styles.step_node(phase_of(step.state))),
                                // What the shake Command looks the node up by.
                                h.DataAttribute(
                                    STEP_INDEX_ATTRIBUTE,
                                    step.index.toString()
                                ),
                            ],
                            [step_node_content(step.state, h)]
                        ),
                        h.span([h.Class(Styles.NODE_LABEL)], [step.label]),
                    ]
                )
            ),
            ...(model.concurrency_steps.length > 0
                ? [
                      h.span(
                          [h.Class(Styles.STEP_ARROW), h.AriaHidden(true)],
                          ["➜"]
                      ),
                  ]
                : []),
            h.div(
                [
                    h.Class(Styles.NODE_SLOT),
                    h.OnMouseEnter(HoveredNode()),
                    h.OnMouseLeave(UnhoveredNode()),
                ],
                [
                    ...((notification) =>
                        notification === undefined
                            ? []
                            : [notification_view(notification, h)])(
                        visible_notification(model)
                    ),
                    h.div(
                        [h.Class(Styles.NODE_FRAME)],
                        [
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Class(Styles.node(phase_of(model.state))),
                                    h.AriaLabel(node_status(model.state)),
                                    h.OnClick(ClickedNode()),
                                    // The original springs the node box itself, not
                                    // just its contents — hence its `will-change:
                                    // transform, filter`. The spring overshoots 1, so
                                    // the box pops slightly past full size and settles.
                                    h.Style({
                                        transform: `scale(${(0.88 + 0.12 * model.highlight.position).toFixed(4)})`,
                                    }),
                                ],
                                [
                                    // A white overlay layer at mix-blend-mode: overlay,
                                    // which the original flashes on each state change.
                                    h.span([h.Class(Styles.NODE_FLASH)]),
                                    h.span(
                                        [
                                            h.Class(Styles.NODE_VALUE),
                                            // Not down to zero: at rest the original
                                            // shows a soft blurred mark, not an empty
                                            // square.
                                            h.Style({
                                                opacity: `${(0.4 + 0.6 * clamp(model.highlight.position)).toFixed(4)}`,
                                                filter: `blur(${(4 * (1 - clamp(model.highlight.position))).toFixed(2)}px)`,
                                            }),
                                        ],
                                        [node_content(model.state, h)]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.span(
                        [h.Class(Styles.NODE_LABEL)],
                        [example_node_label(example.key)]
                    ),
                ]
            ),
        ]
    )

const concurrency_control_view = (
    model: Model,
    h: HtmlBuilder<Message>
): Html => {
    const modes: ReadonlyArray<ConcurrencyMode> = [
        "Sequential",
        "Numbered",
        "Unbounded",
    ]

    return h.div(
        [h.Class(Styles.CONTROLS)],
        [
            h.span([h.Class(Styles.CONTROLS_LABEL)], ["CONCURRENCY"]),
            h.div(
                [h.Class(Styles.CONTROL_OPTIONS)],
                modes.map((mode) =>
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(
                                Styles.control_option(
                                    mode === model.options.concurrency_mode
                                )
                            ),
                            h.AriaPressed(
                                mode === model.options.concurrency_mode
                                    ? "true"
                                    : "false"
                            ),
                            h.OnClick(ChangedConcurrencyMode({ mode })),
                        ],
                        [
                            mode === "Numbered"
                                ? "numbered (2)"
                                : mode.toLowerCase(),
                        ]
                    )
                )
            ),
        ]
    )
}

// Mirrors `concurrency_control_view`: the outcome rewrites the snippet as well
// as the run, so it belongs above the node with the code, not beside it.
const finalizer_control_view = (
    model: Model,
    h: HtmlBuilder<Message>
): Html => {
    const outcomes: ReadonlyArray<FinalizerOutcome> = [
        "Succeed",
        "Fail",
        "Die",
        "Interrupt",
    ]

    return h.div(
        [h.Class(Styles.CONTROLS)],
        [
            h.span([h.Class(Styles.CONTROLS_LABEL)], ["OUTCOME"]),
            h.div(
                [h.Class(Styles.CONTROL_OPTIONS)],
                outcomes.map((outcome) =>
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(
                                Styles.control_option(
                                    outcome === model.options.finalizer_outcome
                                )
                            ),
                            h.AriaPressed(
                                outcome === model.options.finalizer_outcome
                                    ? "true"
                                    : "false"
                            ),
                            h.OnClick(ChangedFinalizerOutcome({ outcome })),
                        ],
                        [outcome.toLowerCase()]
                    )
                )
            ),
        ]
    )
}

// The ref panel. `just_changed` drives a flash that the Model clears on its own
// timer, so the class is derived rather than animated in the view.
const ref_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    Option.match(model.ref_value, {
        onNone: () => h.span([]),
        onSome: (ref) =>
            h.div(
                [h.Class(Styles.ref_panel(ref.just_changed))],
                [
                    h.span([h.Class(Styles.REF_PANEL_NAME)], [ref.name]),
                    h.span([h.Class(Styles.REF_PANEL_SEPARATOR)]),
                    h.span([h.Class(Styles.REF_PANEL_VALUE)], [ref.value]),
                ]
            ),
    })

// Upstream slides each card left -> centre -> right as it runs. The lanes are
// the same three positions, laid out by the flex row rather than by measuring
// the container and animating an x offset.
const scope_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const pending = model.finalizers.filter(
        (finalizer) => finalizer.state === "Pending"
    )
    const running = model.finalizers.filter(
        (finalizer) => finalizer.state === "Running"
    )
    const completed = model.finalizers.filter(
        (finalizer) => finalizer.state === "Completed"
    )

    const card = (finalizer: Finalizer): Html =>
        h.div(
            [h.Class(Styles.finalizer_card(finalizer.state.toLowerCase()))],
            [
                h.span(
                    [
                        h.Class(
                            Styles.finalizer_check(
                                finalizer.state.toLowerCase()
                            )
                        ),
                    ],
                    [finalizer.state === "Completed" ? "✓" : ""]
                ),
                h.span([h.Class("finalizer-card-name")], [finalizer.name]),
            ]
        )

    return h.div(
        [h.Class(Styles.scope_panel(model.scope_state.toLowerCase()))],
        [
            h.div(
                [h.Class(Styles.SCOPE_PANEL_HEADING)],
                [
                    h.span([h.Class("scope-panel-title")], ["FINALIZERS"]),
                    h.span(
                        [h.Class(Styles.SCOPE_PANEL_STATE)],
                        [model.scope_state.toUpperCase()]
                    ),
                ]
            ),
            h.div(
                [h.Class(Styles.SCOPE_PANEL_LANES)],
                [
                    h.div([h.Class(Styles.SCOPE_LANE)], pending.map(card)),
                    h.div(
                        [h.Class(Styles.SCOPE_LANE_CENTRE)],
                        running.map(card)
                    ),
                    h.div(
                        [h.Class(Styles.SCOPE_LANE_END)],
                        completed.map(card)
                    ),
                ]
            ),
        ]
    )
}

const fallback_lines = (source: string): ReadonlyArray<CodeLine> =>
    source.split("\n").map((line) => [
        {
            content: line,
            color: `var(${VARIABLE_PREFIX}foreground)`,
            is_italic: false,
        },
    ])

const schedule_timeline_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class(Styles.TIMELINE)],
        [
            h.div([h.Class(Styles.TIMELINE_TITLE)], ["RETRY TIMELINE"]),
            h.div(
                [h.Class(Styles.TIMELINE_TRACK)],
                [
                    h.span([
                        h.Class(
                            Styles.timeline_progress(phase_of(model.state))
                        ),
                    ]),
                    ...Array.from(
                        {
                            length:
                                model.selected_example_key === "RepeatSpaced"
                                    ? 20
                                    : model.selected_example_key ===
                                        "RepeatWhile"
                                      ? 10
                                      : 5,
                        },
                        (_, index) => index + 1
                    ).map((attempt) =>
                        h.span(
                            [h.Class(Styles.TIMELINE_STEP)],
                            [
                                h.span([
                                    h.Class(
                                        Styles.timeline_dot(
                                            phase_of(model.state),
                                            attempt === 1
                                        )
                                    ),
                                ]),
                                `#${attempt}`,
                            ]
                        )
                    ),
                ]
            ),
        ]
    )

const clamp = (value: number): number => Math.min(1, Math.max(0, value))

// Hovering a step node points the box at that step's code; otherwise it sits
// on the result, which is where a finished run leaves it.
const active_target = (model: Model): string =>
    Option.match(model.hovered_step, {
        onNone: () => snippet_result_target_key,
        onSome: (index) => step_target_key(index),
    })

const active_rect = (model: Model) =>
    model.highlight_rects.find(
        (measured) => measured.target === active_target(model)
    )?.rect

// Geometry comes from the Mount's measurement; the spring supplies only the
// entrance the live site shows — scale 0.9 -> 1 (overshooting), opacity 0 -> 1,
// blur 4px -> 0.
const highlight_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const rect = active_rect(model)
    const progress = model.highlight.position

    if (rect === undefined || progress <= 0.001) {
        return h.span([])
    }

    return h.span([
        h.Class(Styles.CODE_HIGHLIGHT),
        h.Style({
            transform: [
                `translate(${rect.x.toFixed(2)}px, ${rect.y.toFixed(2)}px)`,
                `scale(${(0.9 + 0.1 * progress).toFixed(4)})`,
            ].join(" "),
            width: `${rect.width.toFixed(2)}px`,
            height: `${rect.height.toFixed(2)}px`,
            opacity: `${clamp(progress).toFixed(4)}`,
            filter: `blur(${(4 * (1 - clamp(progress))).toFixed(2)}px)`,
        }),
    ])
}

const code_view = (
    example: Example,
    model: Model,
    h: HtmlBuilder<Message>
): Html => {
    const lines =
        model.code.length > 0 ? model.code : fallback_lines(example.code.source)

    // Which targets each character offset belongs to, so a token can be
    // stamped with every highlight that covers it.
    const targets = Object.entries(example.code.highlights_by_target)
    let offset = 0

    const targets_at = (start: number, end: number): string =>
        targets
            .filter(([, ranges]) =>
                ranges.some((range) =>
                    start === end
                        ? start >= range.start_offset &&
                          start < range.end_offset
                        : start < range.end_offset && end > range.start_offset
                )
            )
            .map(([target]) => target)
            .join(" ")

    return h.pre(
        [h.Class(Styles.CODE_BLOCK), h.OnMount(MeasureHighlight())],
        [
            highlight_view(model, h),
            ...lines.map((line, line_index) => {
                if (line_index > 0) {
                    offset = offset + 1
                }

                return h.span(
                    [h.Class(Styles.CODE_LINE)],
                    line.map((token) => {
                        const start = offset
                        offset = offset + token.content.length

                        // The mount unions the spans carrying each target, so
                        // the view decides what a highlight covers and the
                        // measurement stays a pure DOM read.
                        return h.span(
                            [
                                h.DataAttribute(
                                    TARGETS_ATTRIBUTE,
                                    targets_at(start, offset)
                                ),
                                h.Style({
                                    color: token.color,
                                    fontStyle: token.is_italic
                                        ? "italic"
                                        : "normal",
                                }),
                            ],
                            [token.content]
                        )
                    })
                )
            }),
        ]
    )
}

export const view = Submodel.defineView<Model, Message>((model, h) => {
    const example = example_by_key(model.selected_example_key, model.options)

    return h.div(
        [h.Class(Styles.ROOT)],
        [
            h.main(
                [h.Class(Styles.MAIN)],
                [
                    header_view(model, h),
                    h.div(
                        [h.Class(Styles.CONTENT)],
                        [
                            ...(model.route._tag === "SucceedRoute"
                                ? [
                                      h.div(
                                          [h.Class(Styles.INTRO_CARD)],
                                          [
                                              h.p(
                                                  [],
                                                  [
                                                      "A Foldkit port of ",
                                                      h.a(
                                                          [
                                                              h.Href(
                                                                  "https://effect.kitlangton.com"
                                                              ),
                                                              h.Target(
                                                                  "_blank"
                                                              ),
                                                              h.Rel(
                                                                  "noopener noreferrer"
                                                              ),
                                                              h.Class(
                                                                  "intro-link"
                                                              ),
                                                          ],
                                                          [
                                                              "Kit Langton's Visual Effect",
                                                              AppIcon.IconExternalLink(
                                                                  {
                                                                      class: Styles.INTRO_LINK_ICON,
                                                                  }
                                                              ),
                                                              h.span(
                                                                  [
                                                                      h.Class(
                                                                          "sr-only"
                                                                      ),
                                                                  ],
                                                                  [
                                                                      " (opens in a new tab)",
                                                                  ]
                                                              ),
                                                          ]
                                                      ),
                                                      ".",
                                                  ]
                                              ),
                                          ]
                                      ),
                                  ]
                                : []),
                            h.h2(
                                [
                                    h.Class(
                                        model.route._tag === "SucceedRoute"
                                            ? "category-title"
                                            : "category-title category-title-first"
                                    ),
                                ],
                                [
                                    `#  ${category_for(model.selected_example_key, model.options).toUpperCase()}`,
                                ]
                            ),
                            h.section(
                                [h.Class(Styles.CARD)],
                                [
                                    h.div(
                                        [h.Class(Styles.CARD_HEADING)],
                                        [
                                            // The heading icon is interactive in
                                            // the original (its row is
                                            // cursor-pointer) and the sparkle
                                            // inside carries its own blur and
                                            // transform. Both restored here.
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.Class(
                                                        Styles.card_icon(
                                                            phase_of(
                                                                model.state
                                                            )
                                                        )
                                                    ),
                                                    h.AriaLabel(
                                                        node_status(model.state)
                                                    ),
                                                    h.OnClick(ClickedNode()),
                                                    h.OnMouseEnter(
                                                        HoveredControl()
                                                    ),
                                                    h.OnMouseLeave(
                                                        UnhoveredControl()
                                                    ),
                                                ],
                                                [
                                                    // The class carries which
                                                    // icon this is, so swapping
                                                    // it restarts the CSS
                                                    // entrance — snabbdom reuses
                                                    // the element otherwise and
                                                    // the animation never reruns.
                                                    ((name) =>
                                                        // Keyed on the icon name
                                                        // so swapping the icon
                                                        // replaces the element
                                                        // and replays its
                                                        // entrance.
                                                        h.keyed("span")(
                                                            name,
                                                            [
                                                                h.Class(
                                                                    Styles.card_icon_slot(
                                                                        name,
                                                                        phase_of(
                                                                            model.state
                                                                        )
                                                                    )
                                                                ),
                                                            ],
                                                            [
                                                                control_icon(
                                                                    name,
                                                                    phase_of(
                                                                        model.state
                                                                    )
                                                                ),
                                                            ]
                                                        ))(
                                                        control_icon_name(
                                                            model.state,
                                                            model.is_control_hovered
                                                        )
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [h.Class(Styles.CARD_TEXT)],
                                                [
                                                    h.h1(
                                                        [],
                                                        example.subtitle ===
                                                            undefined
                                                            ? [example.title]
                                                            : [
                                                                  example.title,
                                                                  h.span(
                                                                      [
                                                                          h.Class(
                                                                              "example-card-variant"
                                                                          ),
                                                                      ],
                                                                      [
                                                                          example.subtitle,
                                                                      ]
                                                                  ),
                                                              ]
                                                    ),
                                                    h.p(
                                                        [],
                                                        [example.description]
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                    ...(model.selected_example_key === "All"
                                        ? [concurrency_control_view(model, h)]
                                        : []),
                                    ...(model.selected_example_key ===
                                    "AddFinalizer"
                                        ? [finalizer_control_view(model, h)]
                                        : []),
                                    ...(Option.isSome(model.ref_value)
                                        ? [ref_view(model, h)]
                                        : []),
                                    node_view(example, model, h),
                                    ...(example_timelines[
                                        model.selected_example_key
                                    ].has_scope === true
                                        ? [scope_view(model, h)]
                                        : []),
                                    ...(model.selected_example_key ===
                                        "RetryRecurs" ||
                                    model.selected_example_key ===
                                        "RetryExponential" ||
                                    model.selected_example_key ===
                                        "RepeatSpaced" ||
                                    model.selected_example_key === "RepeatWhile"
                                        ? [schedule_timeline_view(model, h)]
                                        : []),
                                    code_view(example, model, h),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
})
