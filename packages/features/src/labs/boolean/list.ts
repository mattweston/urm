import type { Html, HtmlBuilder } from "foldkit/html"

import {
    ToggledListA,
    ToggledListB,
    ToggledListC,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"
import { operandCheckbox, operandPanel, resultPanel } from "./operand.ts"

// every and some fold a collection rather than a pair, so their demo holds
// three checkboxes and shows the result for both the full list and an empty one.
export const listView =
    (name: string, apply: (collection: Iterable<boolean>) => boolean) =>
    <ParentMessage>(
        model: Model,
        toParentMessage: (message: Message) => ParentMessage,
        h: HtmlBuilder<ParentMessage>
    ): Html => {
        const values: ReadonlyArray<boolean> = [
            model.listA,
            model.listB,
            model.listC,
        ]

        return h.div(
            [h.Class("max-w-2xl")],
            [
                operandPanel([
                    operandCheckbox(
                        "boolean-list-a-demo",
                        model.listA,
                        "first",
                        (isChecked) => ToggledListA({ isChecked }),
                        toParentMessage,
                        h
                    ),
                    operandCheckbox(
                        "boolean-list-b-demo",
                        model.listB,
                        "second",
                        (isChecked) => ToggledListB({ isChecked }),
                        toParentMessage,
                        h
                    ),
                    operandCheckbox(
                        "boolean-list-c-demo",
                        model.listC,
                        "third",
                        (isChecked) => ToggledListC({ isChecked }),
                        toParentMessage,
                        h
                    ),
                ]),
                resultPanel(
                    `Boolean.${name}([${values.join(", ")}])`,
                    apply(values)
                ),
                resultPanel(`Boolean.${name}([])`, apply([])),
            ]
        )
    }
