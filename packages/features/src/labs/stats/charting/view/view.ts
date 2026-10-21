import type { Html, HtmlBuilder } from "foldkit/html"
import type { Message } from "../message.ts"
import type { Model } from "../model.ts"
import { headerView, telemetryStateView } from "./layout.ts"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("min-h-full bg-background text-foreground")],
        [
            h.main(
                [
                    h.Class(
                        "mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8"
                    ),
                ],
                [
                    headerView(model, toParentMessage, h),
                    telemetryStateView(model, toParentMessage, h),
                ]
            ),
        ]
    )
}
