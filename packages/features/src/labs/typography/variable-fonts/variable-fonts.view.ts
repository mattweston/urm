import clsx from "clsx"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    ITALIC_VARIABLE_BYTES,
    MONO_VARIABLE_BYTES,
    VARIABLE_BYTES,
    bracketingInstances,
    fontOptions,
    fontOptionFor,
    formatKilobytes,
    namedInstances,
    samples,
    staticTotalBytes,
    twoStaticWeightsBytes,
} from "./variable-fonts.data.ts"
import {
    ClickedLoadStaticFonts,
    ClickedNamedInstance,
    SelectedFont,
    SelectedSample,
    ToggledAnimation,
    ToggledItalic,
    UpdatedSample,
    UpdatedSize,
    UpdatedWeight,
    type Message,
} from "./variable-fonts.message.ts"
import type { Model } from "./variable-fonts.model.ts"

type ToParent<ParentMessage> = (message: Message) => ParentMessage

const panelClassName =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 [box-shadow:var(--shadow-surface)]"
const labelClassName =
    "font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground"
const buttonClassName =
    "cursor-pointer rounded-[var(--radius-control)] border-(length:--control-outline-border-width) px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

const selectableButtonClassName = (isActive: boolean): string =>
    clsx(buttonClassName, {
        "border-primary bg-primary text-primary-foreground": isActive,
        "border-border bg-background text-foreground hover:bg-accent":
            !isActive,
    })

const familyName = (model: Model): string =>
    model.font === "geist-mono"
        ? '"Labs Geist Mono Variable", ui-monospace, monospace'
        : model.font === "inter"
          ? '"Labs Inter Variable", system-ui, sans-serif'
          : model.font === "fira-code"
            ? '"Labs Fira Code Variable", ui-monospace, monospace'
            : '"Labs Geist Variable", system-ui, sans-serif'

const rangeControl = <ParentMessage>(
    config: Readonly<{
        label: string
        value: number
        minimum: number
        maximum: number
        suffix: string
        onInput: (value: number) => Message
    }>,
    toParentMessage: ToParent<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.label(
        [h.Class("grid gap-2"), h.AriaLabel(config.label)],
        [
            h.span(
                [h.Class("flex items-baseline justify-between gap-4")],
                [
                    h.span([h.Class(labelClassName)], [config.label]),
                    h.span(
                        [
                            h.Class(
                                "font-mono text-sm tabular-nums text-foreground"
                            ),
                        ],
                        [`${config.value}${config.suffix}`]
                    ),
                ]
            ),
            h.input([
                h.Type("range"),
                h.Class("w-full accent-primary"),
                h.Min(String(config.minimum)),
                h.Max(String(config.maximum)),
                h.Step("1"),
                h.Value(String(config.value)),
                h.OnInput((value) =>
                    toParentMessage(config.onInput(Number(value)))
                ),
            ]),
        ]
    )

const toggleButton = <ParentMessage>(
    label: string,
    isActive: boolean,
    message: Message,
    toParentMessage: ToParent<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.button(
        [
            h.Type("button"),
            h.Class(selectableButtonClassName(isActive)),
            h.AriaPressed(String(isActive)),
            h.OnClick(toParentMessage(message)),
        ],
        [label]
    )

const controlsView = <ParentMessage>(
    model: Model,
    toParentMessage: ToParent<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(clsx(panelClassName, "grid gap-5"))],
        [
            h.div(
                [h.Class("grid gap-5 sm:grid-cols-2")],
                [
                    rangeControl(
                        {
                            label: "wght",
                            value: model.weight,
                            minimum: fontOptionFor(model.font).minimum,
                            maximum: fontOptionFor(model.font).maximum,
                            suffix: "",
                            onInput: (value) => UpdatedWeight({ value }),
                        },
                        toParentMessage,
                        h
                    ),
                    rangeControl(
                        {
                            label: "Size",
                            value: model.size,
                            minimum: 12,
                            maximum: 160,
                            suffix: "px",
                            onInput: (value) => UpdatedSize({ value }),
                        },
                        toParentMessage,
                        h
                    ),
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap items-center gap-2")],
                [
                    h.label(
                        [h.Class("flex items-center gap-2")],
                        [
                            h.span([h.Class(labelClassName)], ["Font"]),
                            h.select(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground"
                                    ),
                                    h.Value(model.font),
                                    h.OnChange((value) =>
                                        toParentMessage(SelectedFont({ value }))
                                    ),
                                ],
                                fontOptions.map((option) =>
                                    h.keyed("option")(
                                        option.value,
                                        [h.Value(option.value)],
                                        [option.label]
                                    )
                                )
                            ),
                        ]
                    ),
                    fontOptionFor(model.font).supportsItalic
                        ? toggleButton(
                              "Italic",
                              model.isItalic,
                              ToggledItalic(),
                              toParentMessage,
                              h
                          )
                        : h.button(
                              [
                                  h.Type("button"),
                                  h.Class(
                                      clsx(
                                          buttonClassName,
                                          "cursor-not-allowed border-border bg-muted text-muted-foreground"
                                      )
                                  ),
                                  h.Disabled(true),
                              ],
                              ["Italic unavailable"]
                          ),
                    toggleButton(
                        "Animate wght",
                        model.isAnimating,
                        ToggledAnimation(),
                        toParentMessage,
                        h
                    ),
                    h.span([h.Class("grow")], []),
                    ...samples.map((sample) =>
                        h.button(
                            [
                                h.Type("button"),
                                h.Class(
                                    selectableButtonClassName(
                                        model.sample === sample
                                    )
                                ),
                                h.AriaPressed(String(model.sample === sample)),
                                h.OnClick(
                                    toParentMessage(
                                        SelectedSample({ value: sample })
                                    )
                                ),
                            ],
                            [sample]
                        )
                    ),
                ]
            ),
            h.label(
                [h.Class("grid gap-2")],
                [
                    h.span([h.Class(labelClassName)], ["Sample text"]),
                    h.input([
                        h.Type("text"),
                        h.Class(
                            "w-full rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 py-2 text-sm text-foreground"
                        ),
                        h.Value(model.sample),
                        h.OnInput((value) =>
                            toParentMessage(UpdatedSample({ value }))
                        ),
                    ]),
                ]
            ),
        ]
    )

const specimenView = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class("grid gap-3")],
        [
            h.h2([h.Class(labelClassName)], ["Specimen"]),
            h.div(
                [
                    h.Class(
                        "overflow-x-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-6 py-10"
                    ),
                ],
                [
                    h.p(
                        [
                            h.Class(
                                clsx(
                                    "whitespace-nowrap leading-none text-foreground",
                                    {
                                        "geist-variable-weight-pulse":
                                            model.isAnimating,
                                    }
                                )
                            ),
                            h.Style({
                                fontFamily: familyName(model),
                                fontSize: `${model.size}px`,
                                fontStyle: model.isItalic ? "italic" : "normal",
                                fontVariationSettings: `"wght" ${model.weight}`,
                                "--variable-font-minimum": String(
                                    fontOptionFor(model.font).minimum
                                ),
                                "--variable-font-maximum": String(
                                    fontOptionFor(model.font).maximum
                                ),
                            }),
                        ],
                        [model.sample]
                    ),
                ]
            ),
            h.p(
                [h.Class("font-mono text-xs text-muted-foreground")],
                [`font-variation-settings: "wght" ${model.weight};`]
            ),
        ]
    )

const comparisonView = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const bracket = bracketingInstances(model.weight)
    const isNamedInstance = namedInstances.some(
        (instance) => instance.weight === model.weight
    )

    const comparisonCell = (
        label: string,
        fontFamily: string,
        weight: number,
        isVariable: boolean
    ): Html =>
        h.div(
            [
                h.Class(
                    isVariable ? "bg-muted/40 px-5 py-6" : "bg-card px-5 py-6"
                ),
            ],
            [
                h.p(
                    [
                        h.Class(
                            isVariable
                                ? "text-xs text-primary"
                                : "text-xs text-muted-foreground"
                        ),
                    ],
                    [label]
                ),
                h.p(
                    [
                        h.Class(
                            "mt-3 truncate text-4xl leading-none text-foreground"
                        ),
                        h.Style(
                            isVariable
                                ? {
                                      fontFamily,
                                      fontVariationSettings: `"wght" ${weight}`,
                                  }
                                : {
                                      fontFamily,
                                      fontWeight: String(weight),
                                  }
                        ),
                    ],
                    [model.sample]
                ),
            ]
        )

    return h.section(
        [h.Class("grid gap-3")],
        [
            h.h2(
                [h.Class(labelClassName)],
                ["Geist case study: between the named instances"]
            ),
            model.font === "geist-sans"
                ? h.empty
                : h.p(
                      [h.Class("text-sm text-muted-foreground")],
                      [
                          "This comparison stays on Geist Sans so its variable file can be compared with the matching static faces. The specimen and weight ramp use your selected font.",
                      ]
                  ),
            h.div(
                [
                    h.Class(
                        "grid gap-px overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-border sm:grid-cols-3"
                    ),
                ],
                [
                    comparisonCell(
                        `Static · ${bracket.lower.name} ${bracket.lower.weight}`,
                        '"Labs Geist Static", system-ui, sans-serif',
                        bracket.lower.weight,
                        false
                    ),
                    comparisonCell(
                        `Variable · wght ${model.weight}${isNamedInstance ? " (on a named instance)" : ""}`,
                        '"Labs Geist Variable", system-ui, sans-serif',
                        model.weight,
                        true
                    ),
                    comparisonCell(
                        `Static · ${bracket.upper.name} ${bracket.upper.weight}`,
                        '"Labs Geist Static", system-ui, sans-serif',
                        bracket.upper.weight,
                        false
                    ),
                ]
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "The outer two are the files a static family would have made you choose between. Move the slider off a hundred and the middle one is drawn by interpolating between masters inside the same file.",
                ]
            ),
        ]
    )
}

const namedInstancesView = <ParentMessage>(
    model: Model,
    toParentMessage: ToParent<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class("grid gap-3")],
        [
            h.h2([h.Class(labelClassName)], ["The nine named instances"]),
            h.div(
                [
                    h.Class(
                        "divide-y divide-border overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"
                    ),
                ],
                namedInstances
                    .filter((instance) => {
                        const option = fontOptionFor(model.font)
                        return (
                            instance.weight >= option.minimum &&
                            instance.weight <= option.maximum
                        )
                    })
                    .map((instance) =>
                        h.keyed("button")(
                            String(instance.weight),
                            [
                                h.Type("button"),
                                h.Class(
                                    "flex w-full items-baseline gap-5 px-5 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                                ),
                                h.OnClick(
                                    toParentMessage(
                                        ClickedNamedInstance({
                                            weight: instance.weight,
                                        })
                                    )
                                ),
                            ],
                            [
                                h.span(
                                    [
                                        h.Class(
                                            "w-28 shrink-0 font-mono text-xs text-muted-foreground"
                                        ),
                                    ],
                                    [`${instance.weight} ${instance.name}`]
                                ),
                                h.span(
                                    [
                                        h.Class(
                                            "truncate text-2xl leading-tight text-foreground"
                                        ),
                                        h.Style({
                                            fontFamily: familyName(model),
                                            fontStyle: model.isItalic
                                                ? "italic"
                                                : "normal",
                                            fontVariationSettings: `"wght" ${instance.weight}`,
                                        }),
                                    ],
                                    [model.sample]
                                ),
                            ]
                        )
                    )
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "Every row is the same file at a different coordinate. Select one to move the slider there.",
                ]
            ),
        ]
    )

const loadedStaticsView = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("grid gap-2")],
        [
            h.p(
                [h.Class("text-sm text-foreground")],
                [
                    "Nine requests just went out — the faces were declared all along, but a face is only fetched once something on the page is set in it.",
                ]
            ),
            h.div(
                [h.Class("overflow-x-auto")],
                [
                    h.table(
                        [h.Class("w-full text-left text-sm")],
                        [
                            h.thead(
                                [
                                    h.Class(
                                        "text-xs uppercase text-muted-foreground"
                                    ),
                                ],
                                [
                                    h.tr(
                                        [],
                                        [
                                            h.th(
                                                [
                                                    h.Class(
                                                        "py-2 pr-4 font-medium"
                                                    ),
                                                ],
                                                ["File"]
                                            ),
                                            h.th(
                                                [
                                                    h.Class(
                                                        "py-2 pr-4 font-medium"
                                                    ),
                                                ],
                                                ["Size"]
                                            ),
                                            h.th(
                                                [h.Class("py-2 font-medium")],
                                                ["Rendered"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.tbody(
                                [h.Class("divide-y divide-border")],
                                namedInstances.map((instance) =>
                                    h.keyed("tr")(
                                        instance.file,
                                        [],
                                        [
                                            h.td(
                                                [
                                                    h.Class(
                                                        "py-2 pr-4 font-mono text-xs text-muted-foreground"
                                                    ),
                                                ],
                                                [instance.file]
                                            ),
                                            h.td(
                                                [
                                                    h.Class(
                                                        "py-2 pr-4 font-mono text-xs tabular-nums text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    formatKilobytes(
                                                        instance.bytes
                                                    ),
                                                ]
                                            ),
                                            h.td(
                                                [
                                                    h.Class(
                                                        "py-2 text-lg text-foreground"
                                                    ),
                                                    h.Style({
                                                        fontFamily:
                                                            '"Labs Geist Static", system-ui, sans-serif',
                                                        fontWeight: String(
                                                            instance.weight
                                                        ),
                                                    }),
                                                ],
                                                [model.sample]
                                            ),
                                        ]
                                    )
                                )
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const costView = <ParentMessage>(
    model: Model,
    toParentMessage: ToParent<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const saving = Math.round((1 - VARIABLE_BYTES / staticTotalBytes) * 100)

    const metric = (label: string, value: string, note: string): Html =>
        h.div(
            [],
            [
                h.p([h.Class("text-xs text-muted-foreground")], [label]),
                h.p(
                    [h.Class("mt-1 font-mono text-2xl text-foreground")],
                    [value]
                ),
                h.p([h.Class("mt-1 text-xs text-muted-foreground")], [note]),
            ]
        )

    return h.section(
        [h.Class("grid gap-3")],
        [
            h.h2(
                [h.Class(labelClassName)],
                ["Geist case study: what it costs"]
            ),
            h.div(
                [h.Class(clsx(panelClassName, "grid gap-5"))],
                [
                    h.div(
                        [h.Class("grid gap-4 sm:grid-cols-3")],
                        [
                            metric(
                                "Geist[wght].woff2",
                                formatKilobytes(VARIABLE_BYTES),
                                "One file, weights 100–900"
                            ),
                            metric(
                                "Nine static files",
                                formatKilobytes(staticTotalBytes),
                                "Thin through Black"
                            ),
                            metric(
                                "Difference",
                                `−${saving}%`,
                                "And one request, not nine"
                            ),
                        ]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            `A page using two weights is the case where statics still win: ${formatKilobytes(twoStaticWeightsBytes)} for Regular and Bold against ${formatKilobytes(VARIABLE_BYTES)} for the whole range. The variable file pays off at three weights and above, or wherever a weight between the nine is wanted.`,
                        ]
                    ),
                    model.areStaticsLoaded
                        ? loadedStaticsView(model, h)
                        : h.button(
                              [
                                  h.Type("button"),
                                  h.Class(selectableButtonClassName(false)),
                                  h.OnClick(
                                      toParentMessage(ClickedLoadStaticFonts())
                                  ),
                              ],
                              ["Load the nine static files"]
                          ),
                ]
            ),
        ]
    )
}

const axisLimitsView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    const note = (
        title: string,
        children: ReadonlyArray<Html | string>
    ): Html =>
        h.article(
            [h.Class(panelClassName)],
            [
                h.h3([h.Class("font-medium text-foreground")], [title]),
                h.p(
                    [
                        h.Class(
                            "mt-2 text-sm leading-relaxed text-muted-foreground"
                        ),
                    ],
                    children
                ),
            ]
        )

    const code = (text: string): Html =>
        h.code([h.Class("font-mono text-xs text-foreground")], [text])

    return h.section(
        [h.Class("grid gap-3")],
        [
            h.h2(
                [h.Class(labelClassName)],
                ["Geist case study: where the axis ends"]
            ),
            h.div(
                [h.Class("grid gap-4 sm:grid-cols-2")],
                [
                    note("Italic is a second file", [
                        "Geist ships ",
                        code("Geist-Italic[wght].woff2"),
                        ` (${formatKilobytes(ITALIC_VARIABLE_BYTES)}) beside the roman. There is no `,
                        code("slnt"),
                        " or ",
                        code("ital"),
                        " axis to slide: the Italic toggle switches files through ",
                        code("font-style"),
                        `, the same as a static family would. Mono is a third file again, at ${formatKilobytes(MONO_VARIABLE_BYTES)}.`,
                    ]),
                    note("font-variation-settings does not set font-weight", [
                        "The two are separate properties. Setting ",
                        code('"wght" 700'),
                        " leaves ",
                        code("font-weight"),
                        " at 400, so a browser may still synthesise a bold on top of a font already drawn heavy. Where a whole-number weight is wanted, set ",
                        code("font-weight"),
                        " and let the face's ",
                        code("100 900"),
                        " range map it to the axis.",
                    ]),
                ]
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: ToParent<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.main(
        [h.Class("mx-auto grid w-full max-w-4xl gap-10 pb-20 text-foreground")],
        [
            h.header(
                [h.Class("grid gap-3")],
                [
                    h.p(
                        [h.Class("text-sm font-medium text-muted-foreground")],
                        ["Typography / variable fonts"]
                    ),
                    h.h1(
                        [h.Class("text-3xl font-semibold tracking-tight")],
                        ["Geist across the weight axis"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-muted-foreground")],
                        [
                            "One variable font file can draw every weight between its named instances. Move through the axis, compare it with static faces, and inspect the actual download trade-off.",
                        ]
                    ),
                ]
            ),
            controlsView(model, toParentMessage, h),
            specimenView(model, h),
            comparisonView(model, h),
            namedInstancesView(model, toParentMessage, h),
            costView(model, toParentMessage, h),
            axisLimitsView(h),
        ]
    )
