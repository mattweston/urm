import { Array, Match as M, Option } from "effect"
import { Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    ChangedChannel,
    ChangedComposer,
    ChangedThreadDraft,
    ClickedLoadEarlier,
    ClickedReaction,
    ClosedThread,
    OpenedThread,
    RequestedTeammateUpdate,
    SubmittedMessage,
    SubmittedThreadReply,
    ToggledConnection,
    type Message,
} from "./relay.message.ts"
import type { Model, RelayMessage } from "./relay.model.ts"

const button_class =
    "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40 [box-shadow:var(--shadow-control)]"
const messageView = (message: RelayMessage, h: HtmlBuilder<Message>): Html =>
    h.article(
        [
            h.Class(
                `grid grid-cols-[2.5rem_1fr] gap-3 rounded-lg p-3 hover:bg-muted/40 ${message.delivery === "Failed" ? "border-(length:--surface-border-width) border-destructive/40" : ""}`
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        `flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold avatar-${message.author.tone}`
                    ),
                ],
                [message.author.initials]
            ),
            h.div(
                [],
                [
                    h.header(
                        [h.Class("flex flex-wrap items-baseline gap-2")],
                        [
                            h.strong([], [message.author.name]),
                            h.time(
                                [h.Class("text-xs text-muted-foreground")],
                                [message.sent_at]
                            ),
                            message.delivery === "Published"
                                ? h.span([], [])
                                : h.span(
                                      [
                                          h.Class(
                                              `text-xs ${message.delivery === "Failed" ? "text-destructive" : "text-muted-foreground"}`
                                          ),
                                      ],
                                      [
                                          message.delivery === "Pending"
                                              ? "Sending…"
                                              : "Not sent",
                                      ]
                                  ),
                        ]
                    ),
                    h.p([h.Class("mt-1 leading-6")], [message.body]),
                    h.div(
                        [h.Class("mt-2 flex gap-2")],
                        [
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(
                                        ClickedReaction({ id: message.id })
                                    ),
                                    h.Class(button_class),
                                ],
                                [`Applaud ${message.reactions}`]
                            ),
                            message.thread_count > 0
                                ? h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(
                                              OpenedThread({ id: message.id })
                                          ),
                                          h.Class(button_class),
                                      ],
                                      [`${message.thread_count} replies`]
                                  )
                                : h.span([], []),
                        ]
                    ),
                ]
            ),
        ]
    )

const threadView = (model: Model, h: HtmlBuilder<Message>): Html =>
    Option.match(model.open_thread_id, {
        onNone: () => h.span([], []),
        onSome: (id) =>
            h.aside(
                [
                    h.Class(
                        "fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l-(length:--surface-border-width) border-border bg-background p-5 [box-shadow:var(--shadow-overlay)]"
                    ),
                ],
                [
                    h.header(
                        [h.Class("flex items-center justify-between")],
                        [
                            h.div(
                                [],
                                [
                                    h.p(
                                        [
                                            h.Class(
                                                "text-xs uppercase tracking-wider text-muted-foreground"
                                            ),
                                        ],
                                        ["Focused conversation"]
                                    ),
                                    h.h2(
                                        [h.Class("text-2xl font-bold")],
                                        ["Thread"]
                                    ),
                                ]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(ClosedThread()),
                                    h.Class(button_class),
                                ],
                                ["Close"]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("mt-5 flex-1 space-y-4 overflow-auto")],
                        [
                            M.value(model.thread_state).pipe(
                                M.when("Loading", () =>
                                    h.p(
                                        [h.Class("text-muted-foreground")],
                                        ["Loading replies…"]
                                    )
                                ),
                                M.when("Unavailable", () =>
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-4 bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                                            ),
                                        ],
                                        [
                                            h.strong(
                                                [],
                                                ["Thread unavailable"]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "mt-1 text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    "This message does not have a thread in the current channel.",
                                                ]
                                            ),
                                        ]
                                    )
                                ),
                                M.when("Ready", () =>
                                    h.div(
                                        [h.Class("space-y-4")],
                                        model.thread_replies.map((reply) =>
                                            h.article(
                                                [
                                                    h.Class(
                                                        "grid grid-cols-[2rem_1fr] gap-2"
                                                    ),
                                                ],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold"
                                                            ),
                                                        ],
                                                        [reply.author.initials]
                                                    ),
                                                    h.div(
                                                        [],
                                                        [
                                                            h.strong(
                                                                [
                                                                    h.Class(
                                                                        "text-sm"
                                                                    ),
                                                                ],
                                                                [
                                                                    reply.author
                                                                        .name,
                                                                ]
                                                            ),
                                                            h.p(
                                                                [
                                                                    h.Class(
                                                                        "text-sm"
                                                                    ),
                                                                ],
                                                                [reply.body]
                                                            ),
                                                        ]
                                                    ),
                                                ]
                                            )
                                        )
                                    )
                                ),
                                M.when("Idle", () => h.span([], [])),
                                M.exhaustive
                            ),
                        ]
                    ),
                    model.thread_state === "Ready"
                        ? h.div(
                              [
                                  h.Class(
                                      "space-y-2 border-t-(length:--surface-border-width) border-border pt-4"
                                  ),
                              ],
                              [
                                  h.label(
                                      [h.Class("text-sm font-medium")],
                                      ["Reply to thread"]
                                  ),
                                  h.textarea([
                                      h.Rows(3),
                                      h.Value(model.thread_draft),
                                      h.OnInput((value) =>
                                          ChangedThreadDraft({ value })
                                      ),
                                      h.Class(
                                          "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
                                      ),
                                      h.Placeholder("Add a useful detail…"),
                                  ]),
                                  h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(SubmittedThreadReply()),
                                          h.Disabled(
                                              model.thread_draft.trim() === ""
                                          ),
                                          h.Class(button_class),
                                      ],
                                      ["Reply"]
                                  ),
                              ]
                          )
                        : h.span([], []),
                    h.span([h.Class("sr-only")], [id]),
                ]
            ),
    })

const relayView = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("grid gap-5 lg:grid-cols-[14rem_1fr]")],
        [
            h.aside(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
                    ),
                ],
                [
                    h.p(
                        [
                            h.Class(
                                "mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                            ),
                        ],
                        ["Channels"]
                    ),
                    ...(["general", "design", "random"] as const).map(
                        (channel) =>
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(ChangedChannel({ channel })),
                                    h.Class(
                                        `mb-1 block w-full rounded-md px-3 py-2 text-left ${model.channel === channel ? "bg-muted font-semibold" : "hover:bg-muted/60"}`
                                    ),
                                ],
                                [`# ${channel}`]
                            )
                    ),
                ]
            ),
            h.section(
                [
                    h.Class(
                        "min-w-0 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"
                    ),
                ],
                [
                    h.header(
                        [
                            h.Class(
                                "flex flex-wrap items-center justify-between gap-3 border-b-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            h.div(
                                [],
                                [
                                    h.h1(
                                        [h.Class("text-2xl font-bold")],
                                        [`# ${model.channel}`]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            model.channel === "general"
                                                ? "Company-wide announcements and work in progress"
                                                : model.channel === "design"
                                                  ? "Critiques, research notes, and product craft"
                                                  : "A quiet corner beyond the roadmap",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("flex items-center gap-2")],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            model.connection === "Live"
                                                ? "Live"
                                                : "Updates paused",
                                        ]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.OnClick(ToggledConnection()),
                                            h.Class(button_class),
                                        ],
                                        [
                                            model.connection === "Paused"
                                                ? "Reconnect"
                                                : "Pause updates",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    model.connection === "Paused"
                        ? h.div(
                              [
                                  h.Class(
                                      "flex items-center justify-between gap-3 border-b-(length:--surface-border-width) border-border bg-muted/50 p-4"
                                  ),
                              ],
                              [
                                  h.p(
                                      [],
                                      [
                                          "Live updates are paused. Drafts remain safe.",
                                      ]
                                  ),
                                  h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(RequestedTeammateUpdate()),
                                          h.Class(button_class),
                                      ],
                                      ["Queue teammate update"]
                                  ),
                              ]
                          )
                        : h.span([], []),
                    h.div(
                        [h.Class("max-h-[620px] overflow-auto p-3")],
                        [
                            model.has_more
                                ? h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(ClickedLoadEarlier()),
                                          h.Disabled(
                                              model.load_state === "Loading"
                                          ),
                                          h.Class(
                                              `${button_class} mb-3 w-full`
                                          ),
                                      ],
                                      [
                                          model.load_state === "Loading"
                                              ? "Loading earlier messages…"
                                              : "Load earlier messages",
                                      ]
                                  )
                                : h.span([], []),
                            Array.match(model.messages, {
                                onEmpty: () =>
                                    h.div(
                                        [h.Class("py-20 text-center")],
                                        [
                                            h.h2(
                                                [h.Class("text-xl font-bold")],
                                                [`Start #${model.channel}`]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    "This channel is wonderfully quiet.",
                                                ]
                                            ),
                                        ]
                                    ),
                                onNonEmpty: (messages) =>
                                    h.div(
                                        [h.Class("space-y-1")],
                                        messages.map((message) =>
                                            h.keyed("div")(
                                                message.id,
                                                [],
                                                [messageView(message, h)]
                                            )
                                        )
                                    ),
                            }),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "space-y-3 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        [
                            h.textarea([
                                h.Rows(3),
                                h.Value(model.composer),
                                h.OnInput((value) =>
                                    ChangedComposer({ value })
                                ),
                                h.Placeholder(
                                    model.connection === "Paused"
                                        ? "Draft safely while updates are paused…"
                                        : `Message #${model.channel}`
                                ),
                                h.Class(
                                    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
                                ),
                            ]),
                            h.div(
                                [h.Class("flex justify-between gap-2")],
                                [
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.OnClick(
                                                RequestedTeammateUpdate()
                                            ),
                                            h.Disabled(
                                                model.connection === "Paused"
                                            ),
                                            h.Class(button_class),
                                        ],
                                        ["Bring in a teammate update"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.OnClick(SubmittedMessage()),
                                            h.Disabled(
                                                model.composer.trim() === "" ||
                                                    model.connection ===
                                                        "Paused"
                                            ),
                                            h.Class(button_class),
                                        ],
                                        ["Send message"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            threadView(model, h),
        ]
    )
export const view = Submodel.defineView<Model, Message>(relayView)
