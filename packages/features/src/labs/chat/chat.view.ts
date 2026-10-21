import { Array, DateTime, Match as M, String } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Message } from "./chat.message.ts"
import {
    ClickedConnect,
    SubmittedMessage,
    UpdatedMessageInput,
} from "./chat.message.ts"
import type { ChatMessage, ConnectionState, Model } from "./chat.model.ts"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [
            h.Class(
                "min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "bg-card text-card-foreground border-(length:--surface-border-width) border-border rounded-[var(--radius-surface)] [box-shadow:var(--shadow-surface)] w-full max-w-2xl flex flex-col h-[600px]"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "p-6 border-b-(length:--surface-border-width) border-border flex items-center justify-between"
                            ),
                        ],
                        [
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-2xl font-bold text-foreground"
                                            ),
                                        ],
                                        ["WebSocket Chat"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground mt-1"
                                            ),
                                        ],
                                        ["Echo server demo"]
                                    ),
                                ]
                            ),
                            connectionStatusView(model.connection, h),
                        ]
                    ),
                    messagesView(model.messages, h),
                    M.value(model.connection).pipe(
                        M.tagsExhaustive({
                            ConnectionDisconnected: () =>
                                connectButtonView(
                                    toParentMessage(ClickedConnect()),
                                    h
                                ),
                            ConnectionConnecting: () =>
                                connectingView<ParentMessage>(h),
                            ConnectionConnected: () =>
                                messageInputView(
                                    model.messageInput,
                                    toParentMessage(SubmittedMessage()),
                                    (value) =>
                                        toParentMessage(
                                            UpdatedMessageInput({ value })
                                        ),
                                    h
                                ),
                            ConnectionError: ({ error }) =>
                                errorView(
                                    error,
                                    toParentMessage(ClickedConnect()),
                                    h
                                ),
                        })
                    ),
                ]
            ),
        ]
    )
}

const connectionStatusView = <ParentMessage>(
    connection: ConnectionState,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("flex items-center gap-2")],
        [
            M.value(connection).pipe(
                M.tagsExhaustive({
                    ConnectionDisconnected: () =>
                        h.div(
                            [h.Class("w-3 h-3 rounded-full bg-destructive")],
                            []
                        ),
                    ConnectionConnecting: () =>
                        h.div(
                            [
                                h.Class(
                                    "w-3 h-3 rounded-full bg-secondary animate-pulse"
                                ),
                            ],
                            []
                        ),
                    ConnectionConnected: () =>
                        h.div([h.Class("w-3 h-3 rounded-full bg-primary")], []),
                    ConnectionError: () =>
                        h.div(
                            [h.Class("w-3 h-3 rounded-full bg-destructive")],
                            []
                        ),
                })
            ),
            M.value(connection).pipe(
                M.tagsExhaustive({
                    ConnectionDisconnected: () =>
                        h.span(
                            [h.Class("text-sm text-muted-foreground")],
                            ["Disconnected"]
                        ),
                    ConnectionConnecting: () =>
                        h.span(
                            [h.Class("text-sm text-muted-foreground")],
                            ["Connecting..."]
                        ),
                    ConnectionConnected: () =>
                        h.span(
                            [h.Class("text-sm text-muted-foreground")],
                            ["Connected"]
                        ),
                    ConnectionError: () =>
                        h.span(
                            [h.Class("text-sm text-destructive")],
                            ["Error"]
                        ),
                })
            ),
        ]
    )
}

const messagesView = <ParentMessage>(
    messages: ReadonlyArray<ChatMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return Array.match(messages, {
        onEmpty: () =>
            h.div(
                [
                    h.Class(
                        "flex-1 p-6 overflow-y-auto flex items-center justify-center"
                    ),
                ],
                [
                    h.div(
                        [h.Class("text-center text-muted-foreground")],
                        [
                            h.p(
                                [h.Class("text-lg mb-2 text-foreground")],
                                ["No messages yet"]
                            ),
                            h.p(
                                [h.Class("text-sm")],
                                ["Send a message to get started!"]
                            ),
                        ]
                    ),
                ]
            ),
        onNonEmpty: (nonEmptyMessages) =>
            h.div(
                [h.Class("flex-1 p-6 overflow-y-auto")],
                [
                    h.ul(
                        [h.Class("space-y-3")],
                        nonEmptyMessages.map((message) =>
                            h.li(
                                [
                                    h.Class(
                                        message.isSent
                                            ? "flex justify-end"
                                            : "flex justify-start"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                message.isSent
                                                    ? "bg-primary text-primary-foreground rounded-[var(--radius-control)] px-4 py-2 max-w-xs border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                                    : "bg-muted text-foreground rounded-[var(--radius-surface)] px-4 py-2 max-w-xs"
                                            ),
                                        ],
                                        [
                                            h.p(
                                                [h.Class("break-words")],
                                                [message.text]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        message.isSent
                                                            ? "text-primary-foreground/80 text-xs mt-1"
                                                            : "text-muted-foreground text-xs mt-1"
                                                    ),
                                                ],
                                                [
                                                    DateTime.format(
                                                        message.zoned,
                                                        {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            second: "2-digit",
                                                        }
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            )
                        )
                    ),
                ]
            ),
    })
}

const connectButtonView = <ParentMessage>(
    clickedConnect: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [
            h.Class(
                "p-6 border-t-(length:--surface-border-width) border-border flex items-center justify-center"
            ),
        ],
        [
            h.button(
                [
                    h.OnClick(clickedConnect),
                    h.Class(
                        "bg-primary hover:opacity-90 text-primary-foreground font-semibold px-8 py-3 rounded-[var(--radius-control)] transition border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                    ),
                ],
                ["Connect to Chat"]
            ),
        ]
    )
}

const connectingView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    return h.div(
        [
            h.Class(
                "p-6 border-t-(length:--surface-border-width) border-border flex items-center justify-center"
            ),
        ],
        [
            h.div(
                [h.Class("text-muted-foreground font-semibold")],
                ["Connecting..."]
            ),
        ]
    )
}

const messageInputView = <ParentMessage>(
    messageInput: string,
    submittedMessage: ParentMessage,
    onInput: (value: string) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.form(
        [
            h.Class(
                "p-6 border-t-(length:--surface-border-width) border-border"
            ),
            h.OnSubmit(submittedMessage),
        ],
        [
            h.div(
                [h.Class("flex gap-3")],
                [
                    h.input([
                        h.Type("text"),
                        h.Value(messageInput),
                        h.Placeholder("Type a message..."),
                        h.OnInput(onInput),
                        h.Class(
                            "flex-1 px-4 py-3 border-(length:--surface-border-width) border-border bg-background text-foreground rounded-[var(--radius-surface)] focus:outline-none focus:ring-2 focus:ring-ring"
                        ),
                    ]),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Disabled(
                                String.isEmpty(String.trim(messageInput))
                            ),
                            h.Class(
                                "bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold px-6 py-3 rounded-[var(--radius-control)] transition border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        ["Send"]
                    ),
                ]
            ),
        ]
    )
}

const errorView = <ParentMessage>(
    error: string,
    clickedConnect: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("p-6 border-t-(length:--surface-border-width) border-border")],
        [
            h.div(
                [
                    h.Class(
                        "bg-destructive/10 border-(length:--surface-border-width) border-destructive/20 rounded-[var(--radius-surface)] p-4 mb-4"
                    ),
                ],
                [
                    h.p(
                        [h.Class("text-destructive font-semibold mb-1")],
                        ["Connection Error"]
                    ),
                    h.p([h.Class("text-destructive text-sm")], [error]),
                ]
            ),
            h.button(
                [
                    h.OnClick(clickedConnect),
                    h.Class(
                        "w-full bg-primary hover:opacity-90 text-primary-foreground font-semibold px-6 py-3 rounded-[var(--radius-control)] transition border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                    ),
                ],
                ["Try Again"]
            ),
        ]
    )
}
