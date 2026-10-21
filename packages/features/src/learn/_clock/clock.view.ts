import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./clock.ts"

type ToParentMessage<ParentMessage> = (message: Demo.Message) => ParentMessage

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
                        [label]
                    ),
                ]
            ),
            ...children,
        ]
    )

const action = <ParentMessage>(
    label: string,
    message: Demo.Message,
    toParent: ToParentMessage<ParentMessage>,
    active: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: toParent(message),
            isDisabled: active,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const tabs = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
        ],
        Demo.stages.map((stage) =>
            action(
                stage,
                Demo.Message.SelectedClockStage({ stage }),
                toParent,
                model.stage === stage,
                h
            )
        )
    )

const card = <ParentMessage>(
    label: string,
    value: string,
    tone: "cyan" | "green" | "amber" | "violet",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "green"
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600"
            : tone === "amber"
              ? "border-amber-500/40 bg-amber-500/5 text-amber-600"
              : tone === "violet"
                ? "border-violet-500/40 bg-violet-500/5 text-violet-500"
                : "border-cyan-500/40 bg-cyan-500/5 text-cyan-500"

    return h.div(
        [h.Class(`rounded-[var(--radius-surface)] border p-4 ${classes}`)],
        [
            h.div(
                [
                    h.Class(
                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div(
                [h.Class("mt-2 break-words font-mono text-xs font-semibold")],
                [value]
            ),
        ]
    )
}

const factGrid = <ParentMessage>(
    facts: ReadonlyArray<readonly [string, string]>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4")],
        facts.map(([label, value], index) =>
            card(
                label,
                value,
                index === 3 ? "amber" : index === 1 ? "green" : "cyan",
                h
            )
        )
    )

const wallView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · wall-clock timestamps",
                [
                    factGrid(Demo.wallFacts(model), h),
                    h.div(
                        [
                            h.Class(
                                "flex gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        [
                            action(
                                "Read wall clock",
                                Demo.Message.ClickedReadWallClock(),
                                toParent,
                                false,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Millis vs nanos",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const millis =
  yield* Clock.currentTimeMillis

const nanos =
  yield* Clock.currentTimeNanos`,
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Both are Unix wall-clock timestamps. Use them for timestamps and serialization, not elapsed-time measurement: the system clock can move forward or backward when corrected.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const monotonicView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · monotonic time is for elapsed durations",
                [
                    factGrid(Demo.monotonicFacts(model), h),
                    h.div(
                        [
                            h.Class(
                                "flex gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        [
                            action(
                                model.elapsedStatus === "measuring 250ms sleep…"
                                    ? "Measuring…"
                                    : "Measure 250ms",
                                Demo.Message.ClickedMeasureElapsed(),
                                toParent,
                                model.elapsedStatus ===
                                    "measuring 250ms sleep…",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Subtract readings; never serialize them",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const start =
  yield* Clock.monotonicTimeNanos

yield* Effect.sleep("250 millis")

const end =
  yield* Clock.monotonicTimeNanos

const elapsed =
  end - start`,
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "monotonicTimeNanos was added to the v4 Clock contract specifically for elapsed-time measurement. Its origin is arbitrary, so only differences between readings from the same clock are meaningful.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const sleepView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · Effect.sleep delegates to the active Clock",
                [
                    factGrid(Demo.sleepFacts(model), h),
                    h.div(
                        [
                            h.Class(
                                "flex gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        [
                            action(
                                model.sleepStatus === "sleeping 750ms…"
                                    ? "Sleeping…"
                                    : "Sleep 750ms",
                                Demo.Message.ClickedSleep(),
                                toParent,
                                model.sleepStatus === "sleeping 750ms…",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Clock is the service behind sleep",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "`Effect.sleep` uses the active Clock service. The Clock interface itself exposes `sleep(duration)`, so replacing Clock changes both current-time reads and scheduled delays consistently.",
                        ]
                    ),
                ],
                h
            ),
            panel(
                "clockWith for full service access",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const snapshot =
  Clock.clockWith(clock =>
    Effect.sync(() => ({
      millis:
        clock.currentTimeMillisUnsafe(),

      wallNanos:
        clock.currentTimeNanosUnsafe(),

      monotonicNanos:
        clock.monotonicTimeNanosUnsafe()
    }))
  )`,
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const testView = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const steps = Demo.testClockSteps()

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · replace time for deterministic tests",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 p-5 md:grid-cols-2 lg:grid-cols-4"
                            ),
                        ],
                        steps.map((step, index) =>
                            h.div(
                                [
                                    h.Class(
                                        model.testStep > index
                                            ? "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-4"
                                            : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 opacity-35"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        [step.title]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-[10px] leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [step.detail]
                                    ),
                                ]
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        [
                            action(
                                "Advance story",
                                Demo.Message.ClickedAdvanceTestClock(),
                                toParent,
                                model.testStep >= 3,
                                h
                            ),
                            action(
                                "Reset",
                                Demo.Message.ClickedResetTestClock(),
                                toParent,
                                model.testStep === 0,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Custom Clock service",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 md:grid-cols-[1fr_1fr]")],
                        [
                            card(
                                "fixed clock",
                                `currentTimeMillis = 1000\ncurrentTimeNanos = 1000000000\nmonotonic = 500000000`,
                                "violet",
                                h
                            ),
                            card(
                                "last read",
                                model.fixedClockMillis === 0
                                    ? "not read yet"
                                    : `${model.fixedClockMillis} ms\n${model.fixedClockNanos} ns`,
                                model.fixedClockMillis === 0 ? "cyan" : "green",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        [
                            action(
                                "Read fixed Clock",
                                Demo.Message.ClickedReadFixedClock(),
                                toParent,
                                false,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "TestClock does not wait in real time",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const sleeper =
  yield* Effect.sleep(
    "5 seconds"
  ).pipe(
    Effect.forkChild
  )

yield* TestClock.adjust(
  "5 seconds"
)

// sleeper becomes due immediately`,
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "`TestClock.layer()` installs controlled time. `adjust` advances by a duration, `setTime` jumps to a timestamp, and `withLive` temporarily runs one Effect with the real Clock.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Demo.Model,
    toParent: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            tabs(model, toParent, h),
            model.stage === "Wall"
                ? wallView(model, toParent, h)
                : model.stage === "Monotonic"
                  ? monotonicView(model, toParent, h)
                  : model.stage === "Sleep"
                    ? sleepView(model, toParent, h)
                    : testView(model, toParent, h),
        ]
    )
