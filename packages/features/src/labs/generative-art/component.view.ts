import type { Html, HtmlBuilder } from "foldkit/html"

import type { GenerativeArtModel } from "./model.ts"
import type { GenerativeArtMessage } from "./message.ts"
import { generativeArtView } from "./view.ts"

export const view = <ParentMessage>(
    model: GenerativeArtModel,
    toGenerativeArtMessage: (message: GenerativeArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Generative art"]
            ),
            generativeArtView(model, toGenerativeArtMessage, h),
        ]
    )
