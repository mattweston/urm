import { Match as M, Schema as S } from "effect"
import { Command, Submodel } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

import { Button } from "@foldkit/ui"

export const Model = S.Struct({ count: S.Number })
export type Model = typeof Model.Type

export const init: Model = { count: 0 }

export const ClickedDecrement = taggedStruct("ClickedDecrement")
export const ClickedIncrement = taggedStruct("ClickedIncrement")

export const Message = S.Union([ClickedDecrement, ClickedIncrement])
export type Message = typeof Message.Type

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ClickedDecrement: () => [
                evo(model, { count: (count) => count - 1 }),
                [],
            ],
            ClickedIncrement: () => [
                evo(model, { count: (count) => count + 1 }),
                [],
            ],
        })
    )

const BUTTON_CLASS =
    "h-9 w-9 rounded-full border-(length:--field-border-width) border-input text-lg leading-none text-foreground hover:bg-accent hover:text-accent-foreground transition motion-reduce:transition-none cursor-pointer"

export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [h.Class("flex items-center gap-4")],
        [
            Button.view(
                {
                    onClick: ClickedDecrement(),
                    toView: (attributes) =>
                        h.button(
                            [...attributes.button, h.Class(BUTTON_CLASS)],
                            ["-"]
                        ),
                },
                h
            ),
            h.span(
                [
                    h.Class(
                        "w-12 text-center font-mono text-2xl tabular-nums text-foreground"
                    ),
                ],
                [model.count.toString()]
            ),
            Button.view(
                {
                    onClick: ClickedIncrement(),
                    toView: (attributes) =>
                        h.button(
                            [...attributes.button, h.Class(BUTTON_CLASS)],
                            ["+"]
                        ),
                },
                h
            ),
        ]
    )
)
