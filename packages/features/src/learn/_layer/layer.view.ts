import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as LayerDemo from "./examples/layer.ts"

type ToParentMessage<ParentMessage> = (
    message: LayerDemo.Message
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
    message: LayerDemo.Message,
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
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs font-semibold tracking-wide transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: LayerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Layer examples"),
        ],
        LayerDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        LayerDemo.SelectedLayerStage({ stage })
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
                            [stage]
                        ),
                },
                h
            )
        )
    )

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

const layer_box = <ParentMessage>(
    label: string,
    provides: ReadonlyArray<string>,
    requires: ReadonlyArray<string>,
    tone: "normal" | "accent",
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                tone === "accent"
                    ? "rounded-[var(--radius-surface)] border border-violet-500/40 bg-violet-500/5 p-4"
                    : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
            ),
        ],
        [
            h.div([h.Class("font-mono text-sm font-semibold")], [label]),
            h.div(
                [h.Class("mt-4 space-y-2")],
                [
                    h.div(
                        [h.Class("flex flex-wrap items-center gap-2")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "w-16 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                    ),
                                ],
                                ["provides"]
                            ),
                            ...(provides.length === 0
                                ? [
                                      h.span(
                                          [
                                              h.Class(
                                                  "font-mono text-[10px] text-muted-foreground"
                                              ),
                                          ],
                                          ["∅"]
                                      ),
                                  ]
                                : provides.map((service) =>
                                      h.span(
                                          [
                                              h.Class(
                                                  "rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 font-mono text-[10px] text-emerald-600"
                                              ),
                                          ],
                                          [service]
                                      )
                                  )),
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap items-center gap-2")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "w-16 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                    ),
                                ],
                                ["requires"]
                            ),
                            ...(requires.length === 0
                                ? [
                                      h.span(
                                          [
                                              h.Class(
                                                  "font-mono text-[10px] text-muted-foreground"
                                              ),
                                          ],
                                          ["∅"]
                                      ),
                                  ]
                                : requires.map((service) =>
                                      h.span(
                                          [
                                              h.Class(
                                                  "rounded-full border border-amber-500/30 bg-amber-500/5 px-2 py-1 font-mono text-[10px] text-amber-600"
                                              ),
                                          ],
                                          [service]
                                      )
                                  )),
                        ]
                    ),
                ]
            ),
        ]
    )

const log_view = <ParentMessage>(
    entries: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    entries.length === 0
        ? h.div(
              [h.Class("px-5 py-8 text-center text-sm text-muted-foreground")],
              ["Nothing built yet."]
          )
        : h.div(
              [],
              entries.map((entry, index) =>
                  h.div(
                      [
                          h.Class(
                              "grid grid-cols-[2.5rem_1fr] gap-3 border-t-(length:--surface-border-width) border-border px-5 py-3 first:border-t-0"
                          ),
                      ],
                      [
                          h.span(
                              [
                                  h.Class(
                                      "font-mono text-xs text-muted-foreground"
                                  ),
                              ],
                              [String(index + 1).padStart(2, "0")]
                          ),
                          h.span([h.Class("font-mono text-xs")], [entry]),
                      ]
                  )
              )
          )

const construct_view = <ParentMessage>(
    model: LayerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · construct a service",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            action(
                                "Layer.succeed",
                                LayerDemo.SelectedLayerConstructorKind({
                                    kind: "Succeed",
                                }),
                                to_parent_message,
                                model.constructor_kind === "Succeed",
                                h
                            ),
                            action(
                                "Layer.effect",
                                LayerDemo.SelectedLayerConstructorKind({
                                    kind: "Effect",
                                }),
                                to_parent_message,
                                model.constructor_kind === "Effect",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            layer_box(
                                model.constructor_kind === "Succeed"
                                    ? "ConfigLive"
                                    : "DatabaseLive",
                                model.constructor_kind === "Succeed"
                                    ? ["Config"]
                                    : ["Database"],
                                model.constructor_kind === "Succeed"
                                    ? []
                                    : ["Config"],
                                "accent",
                                h
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→ build →"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        model.constructor_built
                                            ? "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-5 text-center"
                                            : "rounded-[var(--radius-surface)] border border-dashed border-border p-5 text-center"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Context"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                model.constructor_built
                                                    ? "mt-3 font-mono text-sm font-semibold text-emerald-600"
                                                    : "mt-3 font-mono text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            model.constructor_built
                                                ? model.constructor_kind ===
                                                  "Succeed"
                                                    ? "{ Config }"
                                                    : "{ Database }"
                                                : "not built",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Build Layer",
                                LayerDemo.ClickedBuildLayerConstructor(),
                                to_parent_message,
                                model.constructor_built,
                                h
                            ),
                            action(
                                "Reset",
                                LayerDemo.ClickedResetLayerConstructor(),
                                to_parent_message,
                                !model.constructor_built,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel("Build log", [log_view(model.constructor_log, h)], h),
            panel(
                "Type",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 p-4 font-mono text-xs md:grid-cols-3"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] bg-emerald-500/5 p-3 text-emerald-600"
                                    ),
                                ],
                                [
                                    "ROut = ",
                                    model.constructor_kind === "Succeed"
                                        ? "Config"
                                        : "Database",
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] bg-destructive/5 p-3 text-destructive"
                                    ),
                                ],
                                ["E = never"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] bg-amber-500/5 p-3 text-amber-600"
                                    ),
                                ],
                                [
                                    "RIn = ",
                                    model.constructor_kind === "Succeed"
                                        ? "never"
                                        : "Config",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const merge_view = <ParentMessage>(
    model: LayerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · merge independent outputs",
                [
                    h.div(
                        [h.Class("grid gap-3 p-5 md:grid-cols-[1fr_auto_1fr]")],
                        [
                            layer_box(
                                "DatabaseReady",
                                ["Database"],
                                [],
                                "normal",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["Layer.mergeAll"]
                            ),
                            layer_box(
                                "LoggerLive",
                                ["Logger"],
                                [],
                                "normal",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        model.merge_built
                                            ? "rounded-[var(--radius-surface)] border border-violet-500/40 bg-violet-500/5 p-5"
                                            : "rounded-[var(--radius-surface)] border border-dashed border-border p-5 opacity-50"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-center text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Merged output"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 text-center font-mono text-sm font-semibold"
                                            ),
                                        ],
                                        [
                                            model.merge_built
                                                ? "{ Database, Logger }"
                                                : "build to combine Context outputs",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Build merge",
                                LayerDemo.ClickedBuildMergedLayer(),
                                to_parent_message,
                                model.merge_built,
                                h
                            ),
                            action(
                                "Reset",
                                LayerDemo.ClickedResetMergedLayer(),
                                to_parent_message,
                                !model.merge_built,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Merge does not feed dependencies",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Layer.mergeAll combines the services produced by independent Layers. Use Layer.provide when one Layer's output must satisfy another Layer's input requirements.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const provide_view = <ParentMessage>(
    model: LayerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const outputs = LayerDemo.provided_outputs(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · satisfy a Layer's requirements",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            action(
                                "Layer.provide",
                                LayerDemo.SelectedLayerProvideMode({
                                    mode: "Provide",
                                }),
                                to_parent_message,
                                model.provide_mode === "Provide",
                                h
                            ),
                            action(
                                "Layer.provideMerge",
                                LayerDemo.SelectedLayerProvideMode({
                                    mode: "ProvideMerge",
                                }),
                                to_parent_message,
                                model.provide_mode === "ProvideMerge",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            layer_box(
                                "UserServiceLive",
                                ["UserService"],
                                ["Database", "Logger"],
                                "accent",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                [
                                    model.provide_mode === "Provide"
                                        ? "provide ←"
                                        : "provideMerge ←",
                                ]
                            ),
                            layer_box(
                                "AppDependencies",
                                ["Database", "Logger"],
                                [],
                                "normal",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        model.provide_built
                                            ? "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-4"
                                            : "rounded-[var(--radius-surface)] border border-dashed border-border p-4 opacity-50"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Result ROut"]
                                    ),
                                    h.div(
                                        [h.Class("mt-3 flex flex-wrap gap-2")],
                                        (model.provide_built
                                            ? outputs
                                            : ["?"]
                                        ).map((service) =>
                                            h.span(
                                                [
                                                    h.Class(
                                                        "rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 font-mono text-[10px] text-emerald-600"
                                                    ),
                                                ],
                                                [service]
                                            )
                                        )
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Compose",
                                LayerDemo.ClickedBuildProvidedLayer(),
                                to_parent_message,
                                model.provide_built,
                                h
                            ),
                            action(
                                "Reset",
                                LayerDemo.ClickedResetProvidedLayer(),
                                to_parent_message,
                                !model.provide_built,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Private vs retained dependencies",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.provide_mode === "Provide"
                                ? "provide feeds Database + Logger into UserServiceLive, then keeps those dependencies private. The resulting Layer only provides UserService."
                                : "provideMerge feeds the same dependencies into UserServiceLive but also retains Database + Logger in the resulting Layer output.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const lifetime_mode_action = <ParentMessage>(
    mode: LayerDemo.LifetimeMode,
    model: LayerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        LayerDemo.SelectedLayerLifetimeMode({ mode }),
        to_parent_message,
        model.lifetime_mode === mode,
        h
    )

const lifetime_view = <ParentMessage>(
    model: LayerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const ids = LayerDemo.lifetime_connection_ids(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · scope + memoization",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            lifetime_mode_action(
                                "Memoized",
                                model,
                                to_parent_message,
                                h
                            ),
                            lifetime_mode_action(
                                "Fresh",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Left consumer"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 font-mono text-sm font-semibold"
                                            ),
                                        ],
                                        [
                                            model.lifetime_acquires > 0
                                                ? ids.left
                                                : "waiting",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("self-center text-center")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                model.lifetime_scope_open
                                                    ? "rounded-[var(--radius-surface)] border border-violet-500/40 bg-violet-500/5 px-4 py-3"
                                                    : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-4 py-3"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                                    ),
                                                ],
                                                ["Layer scope"]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-1 font-mono text-xs"
                                                    ),
                                                ],
                                                [
                                                    model.lifetime_scope_open
                                                        ? "OPEN"
                                                        : model.lifetime_releases >
                                                            0
                                                          ? "CLOSED"
                                                          : "not built",
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Right consumer"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 font-mono text-sm font-semibold"
                                            ),
                                        ],
                                        [
                                            model.lifetime_acquires > 0
                                                ? ids.right
                                                : "waiting",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid grid-cols-2 gap-px border-t-(length:--surface-border-width) border-border bg-border"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("bg-card p-4 text-center")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Acquires"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-2xl font-bold text-emerald-600"
                                            ),
                                        ],
                                        [String(model.lifetime_acquires)]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("bg-card p-4 text-center")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Releases"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-2xl font-bold text-destructive"
                                            ),
                                        ],
                                        [String(model.lifetime_releases)]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Open scope",
                                LayerDemo.ClickedOpenLayerScope(),
                                to_parent_message,
                                model.lifetime_scope_open ||
                                    model.lifetime_acquires > 0,
                                h
                            ),
                            action(
                                "Close scope",
                                LayerDemo.ClickedCloseLayerScope(),
                                to_parent_message,
                                !model.lifetime_scope_open,
                                h
                            ),
                            action(
                                "Reset",
                                LayerDemo.ClickedResetLayerLifetime(),
                                to_parent_message,
                                model.lifetime_acquires === 0,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel("Lifecycle log", [log_view(model.lifetime_log, h)], h),
            panel(
                "Why the counts differ",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.lifetime_mode === "Memoized"
                                ? "The same ConnectionLive Layer instance is reused twice inside one Layer scope, so normal Layer memoization acquires it once and both consumers share the service."
                                : "Layer.fresh bypasses normal memoization. Each dependency edge builds its own Connection resource, so the scope owns two acquisitions and later runs two releases.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: LayerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Construct"
                ? construct_view(model, to_parent_message, h)
                : model.stage === "Merge"
                  ? merge_view(model, to_parent_message, h)
                  : model.stage === "Provide"
                    ? provide_view(model, to_parent_message, h)
                    : lifetime_view(model, to_parent_message, h),
        ]
    )
