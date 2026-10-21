import { Array, Option, pipe } from "effect"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Message } from "./kanban.message.ts"
import type { Model } from "./kanban.model.ts"
import { ghostCardView } from "./kanban.view.card.ts"
import { columnView } from "./kanban.view.column.ts"

const findDraggedCard = (model: Model) =>
    pipe(
        model.dragAndDrop,
        Ui.DragAndDrop.maybeDraggedItemId,
        Option.flatMap((cardId) =>
            pipe(
                model.columns,
                Array.flatMap(({ cards }) => cards),
                Array.findFirst(({ id }) => id === cardId)
            )
        )
    )

const ghostElement = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return pipe(
        Ui.DragAndDrop.ghostStyle(model.dragAndDrop),
        Option.flatMap((ghostStyle) =>
            Option.map(findDraggedCard(model), (card) => ({ ghostStyle, card }))
        ),
        Option.match({
            onNone: () => h.empty,
            onSome: ({ ghostStyle, card }) =>
                h.div(
                    [h.Style(ghostStyle), h.Class("w-64"), h.AriaHidden(true)],
                    [ghostCardView<ParentMessage>(card, h)]
                ),
        })
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("flex flex-col min-h-screen bg-background text-foreground")],
        [
            h.div(
                [
                    h.Class(
                        "px-6 py-4 bg-card border-b-(length:--surface-border-width) border-border text-card-foreground"
                    ),
                ],
                [
                    h.h1(
                        [h.Class("text-lg font-semibold text-foreground")],
                        ["Kanban Board"]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "flex-1 p-6 grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-6 items-start bg-background"
                    ),
                ],
                Array.map(model.columns, (column) =>
                    columnView<ParentMessage>(model, column, toParentMessage, h)
                )
            ),
            ghostElement<ParentMessage>(model, h),
            h.div(
                [h.Class("sr-only"), h.AriaLive("assertive")],
                [model.announcement]
            ),
        ]
    )
}
