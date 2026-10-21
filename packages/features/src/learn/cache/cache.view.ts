import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as CacheDemo from "./cache.ts"

type ToParentMessage<ParentMessage> = (
    message: CacheDemo.Message
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
    message: CacheDemo.Message,
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
    model: CacheDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Cache examples"),
        ],
        CacheDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        CacheDemo.SelectedCacheStage({ stage })
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

const log_view = <ParentMessage>(
    entries: ReadonlyArray<string>,
    empty: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    entries.length === 0
        ? h.div(
              [h.Class("px-5 py-8 text-center text-sm text-muted-foreground")],
              [empty]
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

const cache_entry = <ParentMessage>(
    key: string,
    cached: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                cached
                    ? "rounded-[var(--radius-surface)] border border-success/40 bg-success/5 p-4"
                    : "rounded-[var(--radius-surface)] border border-dashed border-border bg-background p-4"
            ),
        ],
        [
            h.div([h.Class("font-mono text-xs font-semibold")], [key]),
            h.div(
                [
                    h.Class(
                        cached
                            ? "mt-2 font-mono text-[10px] text-success"
                            : "mt-2 font-mono text-[10px] text-muted-foreground"
                    ),
                ],
                [cached ? "cached" : "missing"]
            ),
        ]
    )

const lookup_view = <ParentMessage>(
    model: CacheDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const selectedCached =
        model.lookup_key === "ada"
            ? model.lookup_ada_cached
            : model.lookup_grace_cached

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · miss → lookup → hit",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            action(
                                "ada",
                                CacheDemo.SelectedCacheLookupKey({
                                    lookup_key: "ada",
                                }),
                                to_parent_message,
                                model.lookup_key === "ada",
                                h
                            ),
                            action(
                                "grace",
                                CacheDemo.SelectedCacheLookupKey({
                                    lookup_key: "grace",
                                }),
                                to_parent_message,
                                model.lookup_key === "grace",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1.2fr] md:items-center"
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
                                        ["Cache.get key"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 font-mono text-2xl font-bold text-chart-2"
                                            ),
                                        ],
                                        [model.lookup_key]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            selectedCached
                                                ? "next get = hit"
                                                : "next get = miss",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                [
                                    selectedCached
                                        ? "return cached →"
                                        : "lookup →",
                                ]
                            ),
                            h.div(
                                [h.Class("grid gap-2 sm:grid-cols-2")],
                                [
                                    cache_entry(
                                        "ada",
                                        model.lookup_ada_cached,
                                        h
                                    ),
                                    cache_entry(
                                        "grace",
                                        model.lookup_grace_cached,
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-px border-t-(length:--surface-border-width) border-border bg-border sm:grid-cols-2"
                            ),
                        ],
                        [
                            stat("lookup calls", String(model.lookup_count), h),
                            stat(
                                "selected",
                                selectedCached ? "HIT" : "MISS",
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Cache.get",
                                CacheDemo.ClickedCacheGet(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "3 concurrent gets",
                                CacheDemo.ClickedCacheConcurrentGet(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Reset",
                                CacheDemo.ClickedResetCacheLookup(),
                                to_parent_message,
                                model.lookup_count === 0 &&
                                    !model.lookup_ada_cached &&
                                    !model.lookup_grace_cached,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Lookup log",
                [log_view(model.lookup_log, "No gets yet.", h)],
                h
            ),
            panel(
                "Single-flight behavior",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "When several fibers call Cache.get for the same missing key, the first call creates the lookup entry and the other callers await that same in-flight Fiber. One lookup result — success or failure — is shared.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const stat = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("bg-card p-4 text-center")],
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
                [h.Class("mt-2 font-mono text-xl font-bold text-chart-2")],
                [value]
            ),
        ]
    )

const ttl_view = <ParentMessage>(
    model: CacheDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const valid = CacheDemo.ttl_is_valid(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · time-to-live",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 p-5 md:grid-cols-[1fr_1fr] md:items-center"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        valid
                                            ? "rounded-[var(--radius-surface)] border border-success/40 bg-success/5 p-5"
                                            : model.ttl_cached
                                              ? "rounded-[var(--radius-surface)] border border-warning/40 bg-warning/5 p-5"
                                              : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-5"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["user entry · ttl 30s"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 font-mono text-xl font-bold"
                                            ),
                                        ],
                                        [CacheDemo.ttl_status(model)]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            model.ttl_cached
                                                ? `value version v${model.ttl_version}`
                                                : "no value",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("space-y-3")],
                                [
                                    stat("clock", `${model.ttl_now}s`, h),
                                    stat(
                                        "lookup calls",
                                        String(model.ttl_lookup_count),
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Cache.get",
                                CacheDemo.ClickedCacheTTLGet(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "+20s",
                                CacheDemo.ClickedAdvanceCacheTTL20(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "+15s",
                                CacheDemo.ClickedAdvanceCacheTTL15(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Reset",
                                CacheDemo.ClickedResetCacheTTL(),
                                to_parent_message,
                                model.ttl_now === 0 && !model.ttl_cached,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Expired means absent on access",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Cache.get and has treat an expired entry as absent. A later get starts a new lookup and gives the new entry a fresh TTL. `makeWith` can compute TTL dynamically from both the lookup Exit and the key.",
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-3 text-xs leading-5 text-muted-foreground"
                            ),
                        ],
                        [
                            "Cache.size is approximate: expired entries can still be counted until an operation touches or enumerates them and removes them.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const key_chip = <ParentMessage>(
    key: string,
    index: number,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border border-chart-1/40 bg-chart-1/5 px-4 py-3 text-center"
            ),
        ],
        [
            h.div([h.Class("font-mono text-lg font-bold text-chart-1")], [key]),
            h.div(
                [
                    h.Class(
                        "mt-1 text-[9px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [index === 0 ? "oldest" : "fresher"]
            ),
        ]
    )

const capacity_view = <ParentMessage>(
    model: CacheDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · capacity + access freshness",
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "mb-3 flex items-center justify-between gap-3"
                                    ),
                                ],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["capacity = 3 · oldest → freshest"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "font-mono text-xs text-chart-1"
                                            ),
                                        ],
                                        [`${model.capacity_keys.length} / 3`]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "grid min-h-24 grid-cols-3 gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
                                    ),
                                ],
                                model.capacity_keys.length === 0
                                    ? [
                                          h.div(
                                              [
                                                  h.Class(
                                                      "col-span-3 self-center text-center font-mono text-xs text-muted-foreground"
                                                  ),
                                              ],
                                              ["empty"]
                                          ),
                                      ]
                                    : model.capacity_keys.map((key, index) =>
                                          key_chip(key, index, h)
                                      )
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Fill a, b, c",
                                CacheDemo.ClickedFillCacheCapacity(),
                                to_parent_message,
                                model.capacity_keys.length > 0,
                                h
                            ),
                            action(
                                "Get b",
                                CacheDemo.ClickedTouchCacheB(),
                                to_parent_message,
                                !model.capacity_keys.includes("b"),
                                h
                            ),
                            action(
                                "Set d",
                                CacheDemo.ClickedAddCacheD(),
                                to_parent_message,
                                model.capacity_keys.includes("d"),
                                h
                            ),
                            action(
                                "Reset",
                                CacheDemo.ClickedResetCacheCapacity(),
                                to_parent_message,
                                model.capacity_keys.length === 0,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Eviction log",
                [log_view(model.capacity_log, "Fill the cache to start.", h)],
                h
            ),
            panel(
                "Why touching b matters",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "The cache map has insertion order. A successful read moves that live entry to the end, making it fresher. When capacity is exceeded, the implementation removes entries from the oldest end.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const control_view = <ParentMessage>(
    model: CacheDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · read vs populate vs replace",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 md:grid-cols-[1fr_1fr]")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        model.control_cached
                                            ? "rounded-[var(--radius-surface)] border border-success/40 bg-success/5 p-5"
                                            : "rounded-[var(--radius-surface)] border border-dashed border-border bg-background p-5"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["user entry"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                model.control_cached
                                                    ? "mt-3 font-mono text-sm font-semibold text-success"
                                                    : "mt-3 font-mono text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            model.control_cached
                                                ? model.control_value
                                                : "missing",
                                        ]
                                    ),
                                ]
                            ),
                            stat(
                                "lookup calls",
                                String(model.control_lookup_count),
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        [
                            action(
                                "getOption",
                                CacheDemo.ClickedCacheGetOption(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "getSuccess",
                                CacheDemo.ClickedCacheGetSuccess(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "get",
                                CacheDemo.ClickedControlCacheGet(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "set manual",
                                CacheDemo.ClickedCacheSet(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "refresh",
                                CacheDemo.ClickedCacheRefresh(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "invalidate",
                                CacheDemo.ClickedCacheInvalidate(),
                                to_parent_message,
                                !model.control_cached,
                                h
                            ),
                            action(
                                "Reset",
                                CacheDemo.ClickedResetCacheControl(),
                                to_parent_message,
                                model.control_log.length === 0,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Operation log",
                [
                    log_view(
                        model.control_log,
                        "Try the read/control operations.",
                        h
                    ),
                ],
                h
            ),
            panel(
                "Operation semantics",
                [
                    h.div(
                        [
                            h.Class(
                                "grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "p-4 text-xs leading-5 text-muted-foreground"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono font-semibold text-chart-2"
                                            ),
                                        ],
                                        ["getOption / getSuccess"]
                                    ),
                                    h.p(
                                        [h.Class("mt-2")],
                                        [
                                            "Read existing cache state. A missing getOption does not start lookup; getSuccess only exposes an already-resolved successful entry.",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "p-4 text-xs leading-5 text-muted-foreground"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono font-semibold text-chart-1"
                                            ),
                                        ],
                                        ["get / set / refresh / invalidate"]
                                    ),
                                    h.p(
                                        [h.Class("mt-2")],
                                        [
                                            "get may populate, set bypasses lookup, refresh always invokes lookup, and invalidate removes the entry.",
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

export const view = <ParentMessage>(
    model: CacheDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Lookup"
                ? lookup_view(model, to_parent_message, h)
                : model.stage === "TTL"
                  ? ttl_view(model, to_parent_message, h)
                  : model.stage === "Capacity"
                    ? capacity_view(model, to_parent_message, h)
                    : control_view(model, to_parent_message, h),
        ]
    )
