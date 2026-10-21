import type { Document, HtmlBuilder } from "foldkit/html"
import { inertHtml } from "foldkit/html"
import { ClickedCrash, type Message } from "./crash-view.message.ts"
import type { Model } from "./crash-view.model.ts"

export const view = <ParentMessage>(
    _model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Document["body"] => {
    return h.div(
        [h.Class("flex min-h-[60vh] items-center justify-center")],
        [
            h.button(
                [
                    h.OnClick(toParentMessage(ClickedCrash())),
                    h.Class(
                        "rounded-[var(--radius-control)] bg-destructive px-6 py-3 text-lg font-semibold text-destructive-foreground transition hover:bg-destructive/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                    ),
                ],
                ["Crash"]
            ),
        ]
    )
}

export const crashView = <AppModelType, AppMessageType>({
    error,
}: {
    error: Error
    model: AppModelType
    message: AppMessageType
}): Document => {
    const h = inertHtml

    return {
        title: "Crash View Example - crashed",
        body: h.div(
            [
                h.Class(
                    "flex min-h-screen items-center justify-center bg-red-50 p-8"
                ),
            ],
            [
                h.div(
                    [
                        h.Class(
                            "w-full max-w-md rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/40 bg-card p-8 text-center"
                        ),
                    ],
                    [
                        h.h1(
                            [
                                h.Class(
                                    "mb-4 text-2xl font-semibold text-red-600"
                                ),
                            ],
                            ["Something went wrong"]
                        ),
                        h.p(
                            [h.Class("mb-6 text-gray-700 leading-relaxed")],
                            [error.message]
                        ),
                        h.button(
                            [
                                h.Class(
                                    "rounded-md bg-red-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
                                ),
                                // NOTE: this button renders after the runtime
                                // has crashed, so an OnClick would have no
                                // update loop to dispatch into. The raw
                                // attribute is the only thing that still works.
                                // oxlint-disable-next-line foldkit/no-raw-dom-event-attributes
                                h.Attribute("onclick", "location.reload()"),
                            ],
                            ["Reload"]
                        ),
                    ]
                ),
            ]
        ),
    }
}
