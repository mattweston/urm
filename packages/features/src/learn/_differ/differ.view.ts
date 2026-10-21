import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as DifferDemo from "./differ.ts"

type ToParentMessage<ParentMessage> = (
    message: DifferDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: DifferDemo.Stage,
    model: DifferDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                DifferDemo.Message.SelectedDifferStage({ stage })
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
    model: DifferDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Differ examples"),
        ],
        DifferDemo.stages.map((stage) =>
            stage_button(stage, model, to_parent_message, h)
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
    message: DifferDemo.Message,
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

const profile_card = <ParentMessage>(
    eyebrow: string,
    profile: DifferDemo.Profile,
    h: HtmlBuilder<ParentMessage>,
    tone: "default" | "cyan" = "default"
): Html =>
    h.div(
        [
            h.Class(
                tone === "cyan"
                    ? "rounded-[var(--radius-surface)] border border-cyan-500/30 bg-cyan-500/5 p-4"
                    : "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                    ),
                ],
                [eyebrow]
            ),
            h.div(
                [h.Class("mt-2 font-mono text-sm font-semibold")],
                [profile.name]
            ),
            h.div(
                [h.Class("mt-3 grid grid-cols-2 gap-2 text-xs")],
                [
                    h.div(
                        [
                            h.Class(
                                "rounded border border-border bg-background px-2 py-1.5"
                            ),
                        ],
                        [`role: ${profile.role}`]
                    ),
                    h.div(
                        [
                            h.Class(
                                "rounded border border-border bg-background px-2 py-1.5"
                            ),
                        ],
                        [`alerts: ${profile.alerts ? "on" : "off"}`]
                    ),
                ]
            ),
        ]
    )

const patch_list = <ParentMessage>(
    patch: DifferDemo.ProfilePatch,
    h: HtmlBuilder<ParentMessage>
): Html =>
    patch.length === 0
        ? h.div(
              [
                  h.Class(
                      "rounded-[var(--radius-surface)] border border-dashed border-border bg-background/50 px-4 py-7 text-center"
                  ),
              ],
              [
                  h.div(
                      [
                          h.Class(
                              "font-mono text-sm font-semibold text-muted-foreground"
                          ),
                      ],
                      ["[]"]
                  ),
                  h.div(
                      [h.Class("mt-1 text-xs text-muted-foreground")],
                      ["empty patch — no operations"]
                  ),
              ]
          )
        : h.div(
              [h.Class("space-y-2")],
              patch.map((change, index) =>
                  h.keyed("div")(
                      `${index}-${DifferDemo.format_change(change)}`,
                      [
                          h.Class(
                              "grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 rounded-[var(--radius-surface)] border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5"
                          ),
                      ],
                      [
                          h.span(
                              [
                                  h.Class(
                                      "grid size-7 place-items-center rounded-full bg-cyan-500/10 font-mono text-[10px] font-semibold text-cyan-700"
                                  ),
                              ],
                              [String(index + 1)]
                          ),
                          h.code(
                              [h.Class("font-mono text-xs font-semibold")],
                              [DifferDemo.format_change(change)]
                          ),
                      ]
                  )
              )
          )

const intro_panel = <ParentMessage>(
    details: DifferDemo.StageDetails,
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

const diff_view = <ParentMessage>(
    model: DifferDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DifferDemo.diff_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Change case",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "RoleOnly",
                                        "NameAndAlerts",
                                        "NoChange",
                                    ] as const
                                ).map((diffCase) =>
                                    choice_button(
                                        diffCase === "RoleOnly"
                                            ? "Role only"
                                            : diffCase === "NameAndAlerts"
                                              ? "Name + alerts"
                                              : "No change",
                                        model.diffCase === diffCase,
                                        DifferDemo.Message.SelectedDifferCase({
                                            diffCase,
                                        }),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            profile_card("before", snapshot.before, h),
                            profile_card("after", snapshot.after, h, "cyan"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Computed patch",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            patch_list(snapshot.patch, h),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "operations",
                                        String(snapshot.operationCount),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "patch(old, diff) = new",
                                        String(snapshot.roundTrip),
                                        h,
                                        snapshot.roundTrip ? "green" : "amber"
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["replayed result"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        [
                                            DifferDemo.format_profile(
                                                snapshot.replayed
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
        ]
    )
}

const combine_view = <ParentMessage>(
    model: DifferDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DifferDemo.combine_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.9fr_1.1fr]")],
        [
            panel(
                "Patch order",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "A → B",
                                        model.combineOrder ===
                                            "FirstThenSecond",
                                        DifferDemo.Message.SelectedDifferCombineOrder(
                                            {
                                                combineOrder: "FirstThenSecond",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                    choice_button(
                                        "B → A",
                                        model.combineOrder ===
                                            "SecondThenFirst",
                                        DifferDemo.Message.SelectedDifferCombineOrder(
                                            {
                                                combineOrder: "SecondThenFirst",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("grid gap-3 md:grid-cols-2")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "font-mono text-xs font-semibold"
                                                    ),
                                                ],
                                                [snapshot.firstName]
                                            ),
                                            h.pre(
                                                [
                                                    h.Class(
                                                        "mt-2 whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    DifferDemo.format_patch(
                                                        snapshot.first
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "font-mono text-xs font-semibold"
                                                    ),
                                                ],
                                                [snapshot.secondName]
                                            ),
                                            h.pre(
                                                [
                                                    h.Class(
                                                        "mt-2 whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    DifferDemo.format_patch(
                                                        snapshot.second
                                                    ),
                                                ]
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
            panel(
                "Combined result",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            patch_list(snapshot.combined, h),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "combined operations",
                                        String(snapshot.operationCount),
                                        h
                                    ),
                                    metric(
                                        "final role",
                                        snapshot.finalRole,
                                        h,
                                        "cyan"
                                    ),
                                ]
                            ),
                            profile_card(
                                "patch(base, combined)",
                                snapshot.result,
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
                                    "Both patches set role. The later SetRole wins, so reversing combine order changes the final role.",
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

const patch_view = <ParentMessage>(
    model: DifferDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DifferDemo.patch_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.85fr_1.15fr]")],
        [
            panel(
                "Computed once",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            profile_card("source", snapshot.source, h),
                            profile_card(
                                "desired",
                                snapshot.desired,
                                h,
                                "cyan"
                            ),
                            patch_list(snapshot.patch, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Replay later",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "Original base",
                                        model.replayBase === "Original",
                                        DifferDemo.Message.SelectedDifferReplayBase(
                                            {
                                                replayBase: "Original",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                    choice_button(
                                        "Alternate base",
                                        model.replayBase === "Alternate",
                                        DifferDemo.Message.SelectedDifferReplayBase(
                                            {
                                                replayBase: "Alternate",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                ]
                            ),
                            profile_card("replay base", snapshot.replayBase, h),
                            h.div(
                                [
                                    h.Class(
                                        "grid place-items-center py-1 font-mono text-cyan-600"
                                    ),
                                ],
                                ["↓ patch"]
                            ),
                            profile_card("result", snapshot.result, h, "cyan"),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "changed fields",
                                        String(snapshot.changedFields),
                                        h
                                    ),
                                    metric(
                                        "source round-trip",
                                        String(snapshot.sourceRoundTrip),
                                        h,
                                        "green"
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

const contract_view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    const snapshot = DifferDemo.contract_snapshot()

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.75fr_1.25fr]")],
        [
            panel(
                "Empty patch",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            patch_list(snapshot.empty, h),
                            metric(
                                "patch(value, empty) preserves value",
                                String(snapshot.emptyPreservesValue),
                                h,
                                "green"
                            ),
                            profile_card("result", snapshot.patchEmpty, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Useful identities",
                [
                    h.div(
                        [h.Class("space-y-3 p-5")],
                        [
                            metric(
                                "combine(empty, p) = p",
                                String(snapshot.leftIdentityHolds),
                                h,
                                "green"
                            ),
                            metric(
                                "combine(p, empty) = p",
                                String(snapshot.rightIdentityHolds),
                                h,
                                "green"
                            ),
                            metric(
                                "patch(old, combine(diff(old, mid), diff(mid, new))) = new",
                                String(snapshot.sequentialLawHolds),
                                h,
                                "green"
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        ["Differ<T, Patch>"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 grid gap-2 font-mono text-xs text-muted-foreground sm:grid-cols-2"
                                            ),
                                        ],
                                        [
                                            h.div([], ["empty: Patch"]),
                                            h.div([], ["diff(old, new)"]),
                                            h.div(
                                                [],
                                                ["combine(first, second)"]
                                            ),
                                            h.div([], ["patch(old, patch)"]),
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

const notice_panel = <ParentMessage>(
    details: DifferDemo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    panel(
        "What to notice",
        [
            h.p(
                [h.Class("px-5 py-4 text-sm leading-6 text-muted-foreground")],
                [details.notice]
            ),
        ],
        h
    )

export const view = <ParentMessage>(
    model: DifferDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = DifferDemo.stage_details[model.stage]

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
                                        ["effect / Differ"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        ["Changes as first-class values"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Implement the tiny Differ contract for a Profile, then compute, compose, store, and replay patches while checking the identities that make the abstraction useful.",
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
                                        ["1 export"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["custom Patch"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["ordered composition"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),

            stage_tabs(model, to_parent_message, h),

            intro_panel(details, h),

            model.stage === "Diff"
                ? diff_view(model, to_parent_message, h)
                : model.stage === "Combine"
                  ? combine_view(model, to_parent_message, h)
                  : model.stage === "Patch"
                    ? patch_view(model, to_parent_message, h)
                    : contract_view(h),

            notice_panel(details, h),
        ]
    )
}
