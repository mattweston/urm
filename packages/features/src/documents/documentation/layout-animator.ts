import { Schema as S } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

import { IconPause, IconPlay } from "@urm/ui/foldkit/icons/view.ts"

export const Model = S.Struct({ paused_ids: S.Array(S.String) })
export type Model = typeof Model.Type

export const ToggledLayoutAnimatorPlayback = taggedStruct(
    "ToggledLayoutAnimatorPlayback",
    {
        id: S.String,
    }
)
export const Message = S.Union([ToggledLayoutAnimatorPlayback])
export type Message = typeof Message.Type

export const init = (): Model => ({ paused_ids: [] })

export const update = (model: Model, message: Message): Model =>
    modifyFields(model, {
        paused_ids: (paused_ids) =>
            paused_ids.includes(message.id)
                ? paused_ids.filter((id) => id !== message.id)
                : [...paused_ids, message.id],
    })

export const view = <ParentMessage>(
    model: Model,
    id: string,
    label: string,
    content: ReadonlyArray<Html>,
    to_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const is_playing = !model.paused_ids.includes(id)

    return h.figure(
        [
            h.Class(
                is_playing
                    ? "documentation-layout-animator"
                    : "documentation-layout-animator is-paused"
            ),
        ],
        [
            h.figcaption(
                [h.Class("documentation-layout-animator-header")],
                [
                    h.span([], [label]),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class("documentation-layout-animator-button"),
                            h.AriaPressed(String(!is_playing)),
                            h.OnClick(
                                to_message(
                                    ToggledLayoutAnimatorPlayback({ id })
                                )
                            ),
                        ],
                        is_playing
                            ? [IconPause(), "Pause"]
                            : [IconPlay(), "Resume"]
                    ),
                ]
            ),
            h.div(
                [h.Class("documentation-layout-animator-stage")],
                [
                    h.div(
                        [h.Class("documentation-layout-animator-frame")],
                        content
                    ),
                ]
            ),
        ]
    )
}
