import { Option, String } from "effect"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Model } from "./kanban.model.ts"
import type { Card } from "./kanban.card.ts"

const cardContent = <ParentMessage>(
    card: Card,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> => {
    return [
        h.span([h.Class("text-sm font-medium text-foreground")], [card.title]),
        ...(String.isNonEmpty(card.description)
            ? [
                  h.div(
                      [
                          h.Class(
                              "mt-1 text-xs text-muted-foreground line-clamp-2"
                          ),
                      ],
                      [card.description]
                  ),
              ]
            : []),
    ]
}

const className = (model: Model, cardId: string) => {
    const isThisCardBeingDragged = Option.exists(
        Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop),
        (id) => id === cardId
    )
    const isPointerDragged =
        model.dragAndDrop.dragState._tag === "Dragging" &&
        isThisCardBeingDragged
    const isKeyboardDragged =
        model.dragAndDrop.dragState._tag === "KeyboardDragging" &&
        isThisCardBeingDragged

    if (isPointerDragged) {
        return "rounded-[var(--radius-surface)] p-3 border-2 outline-none bg-muted border-dashed border-border opacity-50"
    }

    if (isKeyboardDragged) {
        return "rounded-[var(--radius-surface)] p-3 border-2 outline-none bg-card [box-shadow:var(--shadow-surface)] border-primary"
    }

    return "rounded-[var(--radius-surface)] p-3 border-2 outline-none bg-card [box-shadow:var(--shadow-surface)] select-none border-transparent focus:border-primary cursor-grab"
}

export const cardView = <ParentMessage>(
    model: Model,
    card: Card,
    columnId: string,
    index: number,
    toParentMessage: (message: Ui.DragAndDrop.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("li")(
        card.id,
        [
            h.Class(className(model, card.id)),
            ...Ui.DragAndDrop.draggable(
                {
                    model: model.dragAndDrop,
                    toParentMessage,
                    itemId: card.id,
                    containerId: columnId,
                    index,
                },
                h
            ),
        ],
        cardContent<ParentMessage>(card, h)
    )
}

export const ghostCardView = <ParentMessage>(
    card: Card,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] p-3 border-(length:--surface-border-width) border-border scale-105 rotate-2"
            ),
        ],
        cardContent<ParentMessage>(card, h)
    )
}
