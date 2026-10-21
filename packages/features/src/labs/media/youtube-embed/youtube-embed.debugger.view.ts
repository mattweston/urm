import { Array as Arr, Option, Schema as S } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    IconBug,
    IconChevronDown,
    IconChevronUp,
    IconPause,
    IconPlay,
} from "@urm/ui/foldkit/icons/view.ts"

import {
    ChangedSeekInput,
    ClearedDebugFilters,
    ClickedPause,
    ClickedPlay,
    SubmittedSeek,
    ToggledDebugFilter,
    ToggledDebugger,
    type Message,
} from "./youtube-embed.message.ts"
import type { Model } from "./youtube-embed.model.ts"

// The panel sits over the video frame, so it keeps a fixed dark palette rather
// than the theme tokens — it has to stay readable against whatever is playing.

const TaggedEvent = S.Struct({ event: S.String })

const decodeTaggedEvent = S.decodeUnknownOption(S.fromJsonString(TaggedEvent))
const decodeJsonValue = S.decodeUnknownOption(S.fromJsonString(S.Unknown))

const eventLabel = (raw: string): string =>
    Option.match(decodeTaggedEvent(raw), {
        onNone: () => "unknown",
        onSome: ({ event }) => event,
    })

const prettyJson = (raw: string): string =>
    Option.match(decodeJsonValue(raw), {
        onNone: () => raw,
        onSome: (value) => JSON.stringify(value, null, 2),
    })

const stateSummary = (model: Model): string =>
    JSON.stringify(
        {
            handshake: model.handshake,
            playback: model.playback,
            playerError: Option.getOrNull(model.maybePlayerError),
            isPreviewing: model.isPreviewing,
            pendingRequests: model.pendingRequests,
        },
        null,
        2
    )

const statePill = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>,
    accentClass: string,
    label: string,
    value: string
): Html =>
    h.div(
        [
            h.Class(
                `rounded-full border px-2 py-1 font-mono text-[10px] ${accentClass}`
            ),
        ],
        [
            h.span([h.Class("text-zinc-400")], [`${label}: `]),
            h.span([], [value]),
        ]
    )

const controlButton = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>,
    label: string,
    icon: Html,
    message: ParentMessage
): Html =>
    h.button(
        [
            h.Type("button"),
            h.OnClick(message),
            h.Class(
                "inline-flex items-center gap-1 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border border-zinc-700 bg-zinc-900/80 px-2 py-1 font-mono text-[11px] text-zinc-200 transition hover:border-zinc-500 hover:text-white [box-shadow:var(--shadow-control)]"
            ),
        ],
        [icon, h.span([], [label])]
    )

const sectionHeading = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>,
    label: string,
    trailing: Html
): Html =>
    h.div(
        [
            h.Class(
                "flex items-center justify-between border-b border-zinc-800 px-2.5 py-1.5"
            ),
        ],
        [
            h.p(
                [
                    h.Class(
                        "font-mono text-[10px] tracking-[0.22em] text-zinc-400 uppercase"
                    ),
                ],
                [label]
            ),
            trailing,
        ]
    )

const collapsedView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.button(
        [
            h.Type("button"),
            h.OnClick(toParentMessage(ToggledDebugger())),
            h.AriaLabel("Open the player debugger"),
            h.Class(
                "pointer-events-auto inline-flex cursor-pointer items-center gap-2 rounded-full border-(length:--control-outline-border-width) border-border border-cyan-400/30 bg-zinc-950/90 px-3 py-1.5 font-mono text-[11px] text-cyan-100 [box-shadow:var(--shadow-overlay)] shadow-black/35 backdrop-blur-md transition hover:border-cyan-300/50 hover:bg-zinc-950"
            ),
        ],
        [
            IconBug({ class: "size-3.5" }),
            h.span([], ["debug"]),
            h.span(
                [
                    h.Class(
                        "rounded-full bg-cyan-400/12 px-1.5 py-0.5 text-[10px] text-cyan-200"
                    ),
                ],
                [String(model.debugEvents.length)]
            ),
        ]
    )

const pillsView = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-wrap items-center gap-1.5")],
        [
            statePill(
                h,
                "border-cyan-500/30 bg-cyan-500/10 text-cyan-100",
                "state",
                model.handshake._tag
            ),
            statePill(
                h,
                "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
                "playback",
                model.handshake._tag === "HandshakeConnected"
                    ? model.playback._tag
                    : "-"
            ),
            statePill(
                h,
                "border-amber-500/30 bg-amber-500/10 text-amber-100",
                "preview",
                model.isPreviewing ? "poster" : "iframe"
            ),
            statePill(
                h,
                "border-rose-500/30 bg-rose-500/10 text-rose-100",
                "events",
                String(model.debugEvents.length)
            ),
            ...(model.pendingRequests.length > 0
                ? [
                      statePill(
                          h,
                          "border-sky-500/30 bg-sky-500/10 text-sky-100",
                          "queued",
                          String(model.pendingRequests.length)
                      ),
                  ]
                : []),
            ...Option.match(model.maybePlayerError, {
                onNone: () => [],
                onSome: (error) => [
                    statePill(
                        h,
                        "border-red-500/40 bg-red-500/15 text-red-100",
                        "error",
                        error
                    ),
                ],
            }),
        ]
    )

const controlsView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-wrap gap-1.5")],
        [
            controlButton(
                h,
                "Play",
                IconPlay({ class: "size-3" }),
                toParentMessage(ClickedPlay())
            ),
            controlButton(
                h,
                "Pause",
                IconPause({ class: "size-3" }),
                toParentMessage(ClickedPause())
            ),
            h.form(
                [
                    h.Class("flex items-center gap-1.5"),
                    h.OnSubmit(toParentMessage(SubmittedSeek())),
                ],
                [
                    h.input([
                        h.Type("number"),
                        h.Attribute("min", "0"),
                        h.Attribute("step", "0.1"),
                        h.InputMode("decimal"),
                        h.AriaLabel("Seek to seconds"),
                        h.Value(model.seekInput),
                        h.OnInput((value) =>
                            toParentMessage(ChangedSeekInput({ value }))
                        ),
                        h.Class(
                            "w-18 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-zinc-700 bg-zinc-900/80 px-2 py-1 font-mono text-[11px] text-zinc-100 transition outline-none focus:border-cyan-400/60"
                        ),
                    ]),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-cyan-500/30 bg-cyan-500/10 px-2 py-1 font-mono text-[11px] text-cyan-100 transition hover:border-cyan-400/50 hover:bg-cyan-500/15"
                            ),
                        ],
                        ["Seek"]
                    ),
                ]
            ),
        ]
    )

const filtersView = <ParentMessage>(
    counts: ReadonlyArray<readonly [string, number]>,
    activeFilters: ReadonlyArray<string>,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex items-start gap-2")],
        [
            h.div(
                [h.Class("flex min-w-0 flex-1 flex-wrap gap-1.5")],
                counts.map(([label, count]) => {
                    const isActive =
                        activeFilters.length === 0 ||
                        activeFilters.includes(label)

                    return h.button(
                        [
                            h.Key(label),
                            h.Type("button"),
                            h.AriaPressed(String(isActive)),
                            h.OnClick(
                                toParentMessage(ToggledDebugFilter({ label }))
                            ),
                            h.Class(
                                isActive
                                    ? "rounded-full border-(length:--surface-border-width) px-2 py-1 font-mono text-[10px] transition border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
                                    : "rounded-full border-(length:--surface-border-width) px-2 py-1 font-mono text-[10px] transition border-zinc-700 bg-zinc-900/80 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                            ),
                        ],
                        [`${label} ${count}`]
                    )
                })
            ),
            h.button(
                [
                    h.Type("button"),
                    h.Disabled(activeFilters.length === 0),
                    h.OnClick(toParentMessage(ClearedDebugFilters())),
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-zinc-700 bg-zinc-900/80 px-2 py-1 font-mono text-[10px] text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-default disabled:opacity-40"
                    ),
                ],
                ["clear"]
            ),
        ]
    )

const eventsView = <ParentMessage>(
    entries: ReadonlyArray<{ readonly label: string; readonly raw: string }>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [
            h.Class(
                "flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-zinc-800 bg-black/15"
            ),
        ],
        [
            sectionHeading(
                h,
                "events",
                h.div(
                    [h.Class("font-mono text-[10px] text-zinc-500")],
                    [String(entries.length)]
                )
            ),
            h.div(
                [h.Class("min-h-44 overflow-y-auto px-2 py-2")],
                entries.length === 0
                    ? [
                          h.div(
                              [
                                  h.Class(
                                      "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-zinc-700/80 bg-zinc-900/60 px-2.5 py-3 font-mono text-[10px] text-zinc-400"
                                  ),
                              ],
                              ["Waiting for matching events."]
                          ),
                      ]
                    : [
                          h.div(
                              [h.Class("space-y-2")],
                              Arr.reverse(
                                  entries.map((entry, index) => ({
                                      ...entry,
                                      number: index + 1,
                                  }))
                              ).map((entry) =>
                                  h.article(
                                      [
                                          h.Key(
                                              `${entry.label}-${entry.number}`
                                          ),
                                          h.Class(
                                              "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-zinc-800 bg-zinc-900/80"
                                          ),
                                      ],
                                      [
                                          h.div(
                                              [
                                                  h.Class(
                                                      "flex items-center justify-between gap-2 border-b border-zinc-800 px-2 py-1.5"
                                                  ),
                                              ],
                                              [
                                                  h.p(
                                                      [
                                                          h.Class(
                                                              "truncate font-mono text-[10px] text-zinc-200"
                                                          ),
                                                      ],
                                                      [entry.label]
                                                  ),
                                                  h.span(
                                                      [
                                                          h.Class(
                                                              "font-mono text-[10px] text-zinc-500"
                                                          ),
                                                      ],
                                                      [`#${entry.number}`]
                                                  ),
                                              ]
                                          ),
                                          h.pre(
                                              [
                                                  h.Class(
                                                      "overflow-x-auto px-2 py-1.5 font-mono text-[10px] leading-4 text-zinc-300"
                                                  ),
                                              ],
                                              [
                                                  h.code(
                                                      [],
                                                      [prettyJson(entry.raw)]
                                                  ),
                                              ]
                                          ),
                                      ]
                                  )
                              )
                          ),
                      ]
            ),
        ]
    )

const expandedView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const entries = model.debugEvents.map((raw) => ({
        raw,
        label: eventLabel(raw),
    }))

    const counts = [
        ...entries
            .reduce(
                (accumulated, entry) =>
                    accumulated.set(
                        entry.label,
                        (accumulated.get(entry.label) ?? 0) + 1
                    ),
                new Map<string, number>()
            )
            .entries(),
    ].sort(([left], [right]) => left.localeCompare(right))

    // A filter for a label that has since scrolled out of the capped buffer
    // would otherwise silently hide everything.
    const activeFilters = model.debugFilters.filter((label) =>
        counts.some(([available]) => available === label)
    )

    const filtered =
        activeFilters.length === 0
            ? entries
            : entries.filter((entry) => activeFilters.includes(entry.label))

    return h.section(
        [
            h.Class(
                "pointer-events-auto flex max-h-full w-full flex-col overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-cyan-500/20 bg-zinc-950/94 text-zinc-100 [box-shadow:var(--shadow-overlay)] shadow-black/45 backdrop-blur-md"
            ),
        ],
        [
            h.header(
                [
                    h.Class(
                        "flex items-start justify-between gap-3 border-b border-zinc-800/90 px-3 py-2.5"
                    ),
                ],
                [
                    h.div(
                        [h.Class("min-w-0 space-y-2")],
                        [
                            pillsView(model, h),
                            controlsView(model, toParentMessage, h),
                        ]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(toParentMessage(ToggledDebugger())),
                            h.AriaLabel("Collapse the player debugger"),
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-zinc-700 bg-zinc-900/80 p-1.5 text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                            ),
                        ],
                        [IconChevronUp({ class: "size-4" })]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex min-h-0 flex-1 flex-col gap-2 px-3 py-2.5")],
                [
                    filtersView(counts, activeFilters, toParentMessage, h),
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
                            ),
                        ],
                        [
                            h.section(
                                [
                                    h.Class(
                                        "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-zinc-800 bg-black/15"
                                    ),
                                ],
                                [
                                    sectionHeading(
                                        h,
                                        "state",
                                        IconChevronDown({
                                            class: "size-3 text-zinc-500",
                                        })
                                    ),
                                    h.pre(
                                        [
                                            h.Class(
                                                "overflow-x-auto px-2.5 py-2 font-mono text-[10px] leading-4 text-zinc-300"
                                            ),
                                        ],
                                        [h.code([], [stateSummary(model)])]
                                    ),
                                ]
                            ),
                            eventsView(filtered, h),
                        ]
                    ),
                ]
            ),
        ]
    )
}

export const debuggerView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "pointer-events-none absolute top-2 right-2 z-20 flex max-h-[calc(100%-1rem)] w-[min(28rem,calc(100%-1rem))] justify-end"
            ),
        ],
        [
            model.isDebuggerOpen
                ? expandedView(model, toParentMessage, h)
                : collapsedView(model, toParentMessage, h),
        ]
    )
