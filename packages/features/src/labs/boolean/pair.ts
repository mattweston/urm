import type { Html, HtmlBuilder } from "foldkit/html"

import { ToggledOperandA, ToggledOperandB, type Message } from "./message.ts"
import type { Model } from "./model.ts"
import { operandCheckbox, operandPanel, resultPanel } from "./operand.ts"

// Every pairwise combinator page is this demo with a different name and a
// different function; the two operands live in one place in the Model.
export const pairView =
    (name: string, apply: (a: boolean, b: boolean) => boolean) =>
    <ParentMessage>(
        model: Model,
        toParentMessage: (message: Message) => ParentMessage,
        h: HtmlBuilder<ParentMessage>
    ): Html => {
        const a = model.operandA
        const b = model.operandB

        return h.div(
            [h.Class("max-w-2xl")],
            [
                operandPanel([
                    operandCheckbox(
                        "boolean-operand-a-demo",
                        model.operandA,
                        "a",
                        (isChecked) => ToggledOperandA({ isChecked }),
                        toParentMessage,
                        h
                    ),
                    operandCheckbox(
                        "boolean-operand-b-demo",
                        model.operandB,
                        "b",
                        (isChecked) => ToggledOperandB({ isChecked }),
                        toParentMessage,
                        h
                    ),
                ]),
                resultPanel(`Boolean.${name}(${a}, ${b})`, apply(a, b)),
            ]
        )
    }
