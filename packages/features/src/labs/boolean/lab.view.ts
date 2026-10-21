import { Boolean } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Message } from "./message.ts"
import type { Model } from "./model.ts"
import { view as checkboxView } from "./checkbox.ts"
import { listView } from "./list.ts"
import { view as notView } from "./not.ts"
import { pairView } from "./pair.ts"

export const labView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.main(
        [h.Class("mx-auto flex w-full max-w-4xl flex-col gap-10 p-6")],
        [
            h.h1([h.Class("text-3xl font-bold")], ["Boolean"]),
            checkboxView(model, toParentMessage, h),
            h.section(
                [h.Class("space-y-4")],
                [
                    h.h2([h.Class("text-2xl font-semibold")], ["Not"]),
                    notView(model, toParentMessage, h),
                ]
            ),
            h.section(
                [h.Class("space-y-4")],
                [
                    h.h2([h.Class("text-2xl font-semibold")], ["And"]),
                    pairView("and", Boolean.and)(model, toParentMessage, h),
                ]
            ),
            h.section(
                [h.Class("space-y-4")],
                [
                    h.h2([h.Class("text-2xl font-semibold")], ["Every"]),
                    listView("every", Boolean.every)(model, toParentMessage, h),
                ]
            ),
        ]
    )
