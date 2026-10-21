import { Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import { ClickedToggleStream, type Message } from "./streaming.message.ts"
import type { Model } from "./streaming.model.ts"
import { VIDEO_ID } from "./streaming.subscription.ts"

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
                        ["Streaming"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-sm text-muted-foreground")],
                        [
                            "Preview your camera and microphone stream locally in the browser.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex flex-col items-center gap-4")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(toParentMessage(ClickedToggleStream())),
                            h.Class(
                                "min-w-40 rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground [box-shadow:var(--shadow-primary)] hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
                            ),
                        ],
                        [
                            model.status === "Idle"
                                ? "Start Stream"
                                : model.status === "Starting"
                                  ? "Starting…"
                                  : "Stop Stream",
                        ]
                    ),
                    Option.match(model.errorMessage, {
                        onNone: () => h.empty,
                        onSome: (message) =>
                            h.p(
                                [
                                    h.Role("alert"),
                                    h.Class("text-sm text-destructive"),
                                ],
                                [message]
                            ),
                    }),
                    h.video(
                        [
                            h.Id(VIDEO_ID),
                            h.Attribute("width", "640"),
                            h.Attribute("height", "480"),
                            h.Autoplay(true),
                            h.Muted(true),
                            h.Playsinline(true),
                            h.Class(
                                "my-4 aspect-4/3 h-auto w-160 max-w-full rounded border-4 border-border bg-muted bg-[url('/public/images/card-thumbs/sepia.jpeg')] bg-cover bg-no-repeat p-0"
                            ),
                        ],
                        []
                    ),
                ]
            ),
        ]
    )
