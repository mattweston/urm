import type { Html, HtmlBuilder } from "foldkit/html"

import type { PixelArtModel } from "./model.ts"
import type { PixelArtMessage } from "./message.ts"
import { pixelArtView } from "./view.ts"

export const view = <ParentMessage>(
    model: PixelArtModel,
    toPixelArtMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Pixel art"]
            ),
            pixelArtView(model, toPixelArtMessage, h),
        ]
    )
