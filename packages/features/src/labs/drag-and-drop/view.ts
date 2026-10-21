import clsx from "clsx"
import { Array, Option, pipe } from "effect"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import type { DemoCard, DemoColumn } from "./columns.ts"
import { GotDragAndDropMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const cardClassName =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card px-3 py-2 text-sm text-foreground cursor-grab active:cursor-grabbing select-none transition-opacity"

const findDraggedCard = (
    columns: ReadonlyArray<DemoColumn>,
    maybeItemId: Option.Option<string>
): Option.Option<DemoCard> =>
    pipe(
        maybeItemId,
        Option.flatMap((itemId) =>
            pipe(
                columns,
                Array.flatMap(({ cards }) => cards),
                Array.findFirst(({ id }) => id === itemId)
            )
        )
    )

const cardView = <ParentMessage>(
    card: DemoCard,
    index: number,
    containerId: string,
    dragAndDropModel: Ui.DragAndDrop.Model,
    toDragAndDropMessage: (message: Ui.DragAndDrop.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const maybeItemId = Ui.DragAndDrop.maybeDraggedItemId(dragAndDropModel)
    const isBeingDragged = Option.exists(maybeItemId, (id) => id === card.id)

    const isKeyboardDragged =
        isBeingDragged && dragAndDropModel.dragState._tag === "KeyboardDragging"
    const isPointerDragged =
        isBeingDragged && dragAndDropModel.dragState._tag === "Dragging"

    return h.keyed("div")(
        card.id,
        [
            h.Class(
                clsx(cardClassName, {
                    "opacity-40": isPointerDragged,
                    "ring-2 ring-primary": isKeyboardDragged,
                })
            ),
            ...Ui.DragAndDrop.draggable<ParentMessage>(
                {
                    model: dragAndDropModel,
                    toParentMessage: toDragAndDropMessage,
                    itemId: card.id,
                    containerId,
                    index,
                },
                h
            ),
            ...Ui.DragAndDrop.sortable(card.id),
        ],
        [card.label]
    )
}

const dropPlaceholder = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("div")(
        "drop-placeholder",
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-2 border-dashed border-primary/50 h-9"
            ),
        ],
        []
    )
}

const renderColumn = <ParentMessage>(
    column: DemoColumn,
    dragAndDropModel: Ui.DragAndDrop.Model,
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const maybeTarget = Ui.DragAndDrop.maybeDropTarget(dragAndDropModel)
    const isDropTarget =
        Ui.DragAndDrop.isDragging(dragAndDropModel) &&
        Option.exists(
            maybeTarget,
            ({ containerId }) => containerId === column.id
        )

    return h.keyed("div")(
        column.id,
        [h.Class("flex flex-col gap-1")],
        [
            h.div(
                [
                    h.Class(
                        "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1"
                    ),
                ],
                [column.label]
            ),
            h.div(
                [
                    h.Class(
                        clsx(
                            "flex flex-col gap-1.5 rounded-[var(--radius-surface)] border-2 bg-muted p-2 min-h-[120px] transition-colors",
                            isDropTarget
                                ? "border-dashed border-primary/50"
                                : "border-transparent"
                        )
                    ),
                    ...Ui.DragAndDrop.droppable(column.id, column.label),
                ],
                [...children]
            ),
        ]
    )
}

const columnView = <ParentMessage>(
    columns: ReadonlyArray<DemoColumn>,
    column: DemoColumn,
    dragAndDropModel: Ui.DragAndDrop.Model,
    toDragAndDropMessage: (message: Ui.DragAndDrop.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const maybeItemId = Ui.DragAndDrop.maybeDraggedItemId(dragAndDropModel)
    const maybeTarget = Ui.DragAndDrop.maybeDropTarget(dragAndDropModel)
    const isDragging = Ui.DragAndDrop.isDragging(dragAndDropModel)
    const isPointerDragging = dragAndDropModel.dragState._tag === "Dragging"

    const isTargetColumn =
        isDragging &&
        Option.exists(
            maybeTarget,
            ({ containerId }) => containerId === column.id
        )

    const visibleCards = Option.match(maybeItemId, {
        onNone: () => column.cards,
        onSome: (draggedId) =>
            isDragging
                ? Array.filter(column.cards, ({ id }) => id !== draggedId)
                : column.cards,
    })

    const cardElements = Array.map(visibleCards, (card, index) =>
        cardView<ParentMessage>(
            card,
            index,
            column.id,
            dragAndDropModel,
            toDragAndDropMessage,
            h
        )
    )

    if (!isTargetColumn) {
        return renderColumn<ParentMessage>(
            column,
            dragAndDropModel,
            cardElements,
            h
        )
    }

    const targetIndex = Option.match(maybeTarget, {
        onNone: () => visibleCards.length,
        onSome: ({ index }) => Math.min(index, visibleCards.length),
    })

    const insertElement = isPointerDragging
        ? dropPlaceholder<ParentMessage>(h)
        : Option.match(findDraggedCard(columns, maybeItemId), {
              onNone: () => dropPlaceholder<ParentMessage>(h),
              onSome: (card) =>
                  cardView<ParentMessage>(
                      card,
                      targetIndex,
                      column.id,
                      dragAndDropModel,
                      toDragAndDropMessage,
                      h
                  ),
          })

    const withInsert: ReadonlyArray<Html> = pipe(
        cardElements,
        Array.insertAt(targetIndex, insertElement),
        Option.getOrElse(() => [...cardElements, insertElement])
    )

    return renderColumn<ParentMessage>(column, dragAndDropModel, withInsert, h)
}

const ghostView = <ParentMessage>(
    columns: ReadonlyArray<DemoColumn>,
    dragAndDropModel: Ui.DragAndDrop.Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const maybeItemId = Ui.DragAndDrop.maybeDraggedItemId(dragAndDropModel)

    return pipe(
        Ui.DragAndDrop.ghostStyle(dragAndDropModel),
        Option.flatMap((ghostStyle) =>
            Option.map(findDraggedCard(columns, maybeItemId), (card) => ({
                ghostStyle,
                card,
            }))
        ),
        Option.match({
            onNone: () => h.empty,
            onSome: ({ ghostStyle, card }) =>
                h.div(
                    [
                        h.Style(ghostStyle),
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-primary bg-card px-3 py-2 text-sm text-foreground [box-shadow:var(--shadow-overlay)]"
                        ),
                    ],
                    [card.label]
                ),
        })
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const { columns, dragAndDrop } = model
    const toDragAndDropMessage = (
        message: Ui.DragAndDrop.Message
    ): ParentMessage => toParentMessage(GotDragAndDropMessage({ message }))

    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Drag and Drop"]
            ),
            h.div(
                [h.Class("w-full max-w-md")],
                [
                    h.div(
                        [h.Class("grid grid-cols-2 gap-4")],
                        Array.map(columns, (column) =>
                            columnView<ParentMessage>(
                                columns,
                                column,
                                dragAndDrop,
                                toDragAndDropMessage,
                                h
                            )
                        )
                    ),
                    ghostView<ParentMessage>(columns, dragAndDrop, h),
                ]
            ),
        ]
    )
}
