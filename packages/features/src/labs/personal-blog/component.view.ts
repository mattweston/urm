import type { Html, HtmlBuilder } from "foldkit/html"

import type { PersonalBlogModel } from "./model.ts"
import type { PersonalBlogMessage } from "./message.ts"
import { personalBlogView, type PersonalBlogHrefs } from "./view.ts"

export const view = <ParentMessage>(
    model: PersonalBlogModel,
    hrefs: PersonalBlogHrefs,
    toPersonalBlogMessage: (message: PersonalBlogMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Personal blog"]
            ),
            personalBlogView(model, hrefs, toPersonalBlogMessage, h),
        ]
    )
