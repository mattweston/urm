import type { Html, HtmlBuilder } from "foldkit/html"

import {
    RHYTHMS,
    STICKING,
    rhythmIds,
    totalUnits,
    type RhythmId,
} from "./rhythm-stack.data.ts"
import {
    ClickedPlay,
    ClickedReset,
    ClickedStop,
    ClickedTempoDown,
    ClickedTempoUp,
    ToggledRhythm,
    type Message,
} from "./rhythm-stack.message.ts"
import type { Model } from "./rhythm-stack.model.ts"

const activeMasterPulse = (model: Model): number => model.transport.step % 12

const activeRhythmUnit = (model: Model, rhythmId: RhythmId): number =>
    model.transport.step % totalUnits(rhythmId)

const foundationView = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("rounded-xl border border-border bg-card p-4 space-y-3")],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-3")],
                [
                    h.div(
                        [],
                        [
                            h.h3(
                                [h.Class("font-semibold")],
                                ["Constant 4/4 bass drum"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "12/8 subdivision: three eighth notes per beat",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "rounded-md border border-border px-3 py-1 text-lg font-semibold tabular-nums"
                            ),
                        ],
                        [String(Math.floor(activeMasterPulse(model) / 3) + 1)]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid grid-cols-4 gap-2")],
                Array.from({ length: 4 }, (_, beat) => {
                    const beatStart = beat * 3

                    return h.div(
                        [
                            h.Class(
                                "rounded-lg border border-border p-2 space-y-2"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "flex items-center justify-between text-xs"
                                    ),
                                ],
                                [
                                    h.span(
                                        [h.Class("text-muted-foreground")],
                                        ["BASS"]
                                    ),
                                    h.strong([], [String(beat + 1)]),
                                ]
                            ),
                            h.div(
                                [h.Class("grid grid-cols-3 gap-1")],
                                Array.from({ length: 3 }, (_, offset) => {
                                    const pulse = beatStart + offset
                                    const isActive =
                                        pulse === activeMasterPulse(model)

                                    return h.div(
                                        [
                                            h.Class(
                                                [
                                                    "rounded-md border px-1 py-2 text-center text-xs font-semibold",
                                                    isActive
                                                        ? "border-primary bg-primary/15"
                                                        : "border-border",
                                                ].join(" ")
                                            ),
                                        ],
                                        [
                                            STICKING[pulse] ?? "",
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-1 text-[10px] text-muted-foreground"
                                                    ),
                                                ],
                                                [String(pulse + 1)]
                                            ),
                                        ]
                                    )
                                })
                            ),
                        ]
                    )
                })
            ),
            h.p(
                [h.Class("text-xs text-muted-foreground")],
                ["LH RH LH · RH LH RH · LH RH LH · RH LH RH"]
            ),
        ]
    )

const rhythmView = <ParentMessage>(
    model: Model,
    rhythmId: RhythmId,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const rhythm = RHYTHMS[rhythmId]
    const activeUnit = activeRhythmUnit(model, rhythmId)
    let groupOffset = 0

    return h.div(
        [h.Class("rounded-xl border border-border p-4 space-y-3")],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-3")],
                [
                    h.div(
                        [],
                        [
                            h.h3([h.Class("font-semibold")], [rhythm.label]),
                            h.p(
                                [h.Class("text-xs text-muted-foreground")],
                                [
                                    `${rhythm.groups.join("–")} · ${totalUnits(
                                        rhythmId
                                    )} eighth-note pulses`,
                                ]
                            ),
                        ]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(
                                toParentMessage(ToggledRhythm({ rhythmId }))
                            ),
                            h.Class(
                                [
                                    "min-w-20 rounded-md border px-3 py-2 text-sm font-medium",
                                    model.enabledRhythms[rhythmId]
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-background",
                                ].join(" ")
                            ),
                        ],
                        [model.enabledRhythms[rhythmId] ? "On" : "Off"]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        model.enabledRhythms[rhythmId]
                            ? "flex gap-2"
                            : "flex gap-2 opacity-35"
                    ),
                ],
                rhythm.groups.map((groupLength, groupIndex) => {
                    const start = groupOffset
                    groupOffset += groupLength

                    return h.div(
                        [h.Class("min-w-0 flex-1 rounded-lg bg-muted/50 p-2")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "mb-2 flex items-center justify-between gap-2"
                                    ),
                                ],
                                [
                                    h.strong(
                                        [h.Class("text-sm")],
                                        [rhythm.voice[groupIndex] ?? ""]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [String(groupLength)]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class("grid gap-1"),
                                    h.Style({
                                        "grid-template-columns": `repeat(${groupLength}, minmax(0, 1fr))`,
                                    }),
                                ],
                                Array.from(
                                    { length: groupLength },
                                    (_, offset) => {
                                        const unit = start + offset
                                        const isActive = unit === activeUnit

                                        return h.div(
                                            [
                                                h.Class(
                                                    [
                                                        "h-2 rounded-full",
                                                        isActive
                                                            ? "bg-primary"
                                                            : "bg-border",
                                                    ].join(" ")
                                                ),
                                            ],
                                            []
                                        )
                                    }
                                )
                            ),
                            h.div(
                                [
                                    h.Class("mt-1 grid gap-1"),
                                    h.Style({
                                        "grid-template-columns": `repeat(${groupLength}, minmax(0, 1fr))`,
                                    }),
                                ],
                                Array.from(
                                    { length: groupLength },
                                    (_, offset) =>
                                        h.span(
                                            [
                                                h.Class(
                                                    "text-center text-[10px] text-muted-foreground"
                                                ),
                                            ],
                                            [
                                                (start + offset) % 2 === 0
                                                    ? "LH"
                                                    : "RH",
                                            ]
                                        )
                                )
                            ),
                        ]
                    )
                })
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class("space-y-6")],
        [
            h.div(
                [h.Class("space-y-2")],
                [
                    h.h2(
                        [h.Class("text-2xl font-bold text-foreground")],
                        ["Longo Rhythm Stack"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-sm text-muted-foreground")],
                        [
                            "A constant 12/8 hand stream felt as 4/4, with independent rhythm groupings layered over it.",
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "flex flex-wrap items-center gap-2 rounded-xl border border-border p-3"
                    ),
                ],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(
                                toParentMessage(
                                    model.transport._tag === "Playing"
                                        ? ClickedStop()
                                        : ClickedPlay()
                                )
                            ),
                            h.Class(
                                "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                            ),
                        ],
                        [model.transport._tag === "Playing" ? "Stop" : "Play"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(toParentMessage(ClickedReset())),
                            h.Class(
                                "rounded-md border border-border px-4 py-2 text-sm font-medium"
                            ),
                        ],
                        ["Reset"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(toParentMessage(ClickedTempoDown())),
                            h.Class(
                                "rounded-md border border-border px-3 py-2 text-sm font-medium"
                            ),
                        ],
                        ["−5"]
                    ),
                    h.div(
                        [
                            h.Class(
                                "min-w-20 text-center text-sm font-semibold tabular-nums"
                            ),
                        ],
                        [`${model.tempo} BPM`]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(toParentMessage(ClickedTempoUp())),
                            h.Class(
                                "rounded-md border border-border px-3 py-2 text-sm font-medium"
                            ),
                        ],
                        ["+5"]
                    ),
                ]
            ),
            foundationView(model, h),
            h.div(
                [h.Class("space-y-3")],
                rhythmIds.map((rhythmId) =>
                    rhythmView(model, rhythmId, toParentMessage, h)
                )
            ),
        ]
    )
