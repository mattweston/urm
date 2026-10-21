import { Array, Equal, Option, flow, pipe } from "effect"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"
import { ADD_CARD_INPUT_ID } from "./kanban.constant.ts"
import type { Card } from "./kanban.card.ts"
import type { Column } from "./kanban.column.ts"
import {
    CancelledNewCard,
    ChangedNewCardTitle,
    ClickedAddCard,
    GotDragAndDropMessage,
    type Message,
    SubmittedNewCard,
} from "./kanban.message.ts"
import type { Model } from "./kanban.model.ts"
import { cardView } from "./kanban.view.card.ts"

const addCardForm = <ParentMessage>(
    model: Model,
    columnId: string,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isAddingToThisColumn = Option.exists(
        model.maybeNewCardColumnId,
        (id) => id === columnId
    )

    if (!isAddingToThisColumn) {
        return h.keyed("div")(
            "idle",
            [],
            [
                Ui.Button.view(
                    {
                        onClick: toParentMessage(ClickedAddCard({ columnId })),
                        toView: (attributes) =>
                            h.button(
                                [
                                    ...attributes.button,
                                    h.Class(
                                        "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors cursor-pointer"
                                    ),
                                ],
                                ["+ Add card"]
                            ),
                    },
                    h
                ),
            ]
        )
    }

    return h.keyed("div")(
        "adding",
        [],
        [
            h.form(
                [
                    h.Class("flex flex-col gap-2"),
                    h.OnSubmit(toParentMessage(SubmittedNewCard())),
                ],
                [
                    h.label(
                        [h.For(ADD_CARD_INPUT_ID), h.Class("sr-only")],
                        ["New card title"]
                    ),
                    Ui.Input.view(
                        {
                            id: ADD_CARD_INPUT_ID,
                            onInput: (value) =>
                                toParentMessage(ChangedNewCardTitle({ value })),
                            value: model.newCardTitle,
                            placeholder: "Card title...",
                            toView: (attributes) =>
                                h.input([
                                    ...attributes.input,
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                    ),
                                    h.OnKeyDownPreventDefault(
                                        flow(
                                            Option.liftPredicate(
                                                Equal.equals("Escape")
                                            ),
                                            Option.map(() =>
                                                toParentMessage(
                                                    CancelledNewCard()
                                                )
                                            )
                                        )
                                    ),
                                ]),
                        },
                        h
                    ),
                    h.div(
                        [h.Class("flex gap-2 justify-end")],
                        [
                            Ui.Button.view(
                                {
                                    onClick:
                                        toParentMessage(CancelledNewCard()),
                                    toView: (attributes) =>
                                        h.button(
                                            [
                                                ...attributes.button,
                                                h.Class(
                                                    "rounded-[var(--radius-control)] px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                                ),
                                            ],
                                            ["Cancel"]
                                        ),
                                },
                                h
                            ),
                            Ui.Button.view(
                                {
                                    type: "submit",
                                    toView: (attributes) =>
                                        h.button(
                                            [
                                                ...attributes.button,
                                                h.Class(
                                                    "rounded-[var(--radius-control)] bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                                ),
                                            ],
                                            ["Add"]
                                        ),
                                },
                                h
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const dropPlaceholder = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("li")(
        "drop-placeholder",
        [
            h.Class(
                "rounded-lg border-2 border-dashed border-primary/40 bg-primary/10 h-12"
            ),
            h.AriaHidden(true),
        ],
        []
    )
}

const findDraggedCard = (
    model: Model,
    draggedId: string
): Option.Option<Card> =>
    pipe(
        model.columns,
        Array.flatMap(({ cards }) => cards),
        Array.findFirst(({ id }) => id === draggedId)
    )

const defaultCardElements = <ParentMessage>(
    model: Model,
    column: Column,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    Array.map(column.cards, (card, index) =>
        cardView<ParentMessage>(
            model,
            card,
            column.id,
            index,
            (message) => toParentMessage(GotDragAndDropMessage({ message })),
            h
        )
    )

const previewCardElements = <ParentMessage>(
    model: Model,
    column: Column,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> => {
    if (!Ui.DragAndDrop.isDragging(model.dragAndDrop)) {
        return defaultCardElements<ParentMessage>(
            model,
            column,
            toParentMessage,
            h
        )
    }

    return Option.match(Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop), {
        onNone: () =>
            defaultCardElements<ParentMessage>(
                model,
                column,
                toParentMessage,
                h
            ),
        onSome: (draggedId) => {
            const maybeTarget = Ui.DragAndDrop.maybeDropTarget(
                model.dragAndDrop
            )
            const visibleCards = Array.filter(
                column.cards,
                ({ id }) => id !== draggedId
            )
            const cardElements = Array.map(visibleCards, (card, index) =>
                cardView<ParentMessage>(
                    model,
                    card,
                    column.id,
                    index,
                    (message) =>
                        toParentMessage(GotDragAndDropMessage({ message })),
                    h
                )
            )

            const isTargetColumn = Option.exists(
                maybeTarget,
                (target) => target.containerId === column.id
            )

            if (!isTargetColumn) {
                return cardElements
            }

            const targetIndex = Option.match(maybeTarget, {
                onNone: () => visibleCards.length,
                onSome: (target) => Math.min(target.index, visibleCards.length),
            })

            const isPointerDrag =
                model.dragAndDrop.dragState._tag === "Dragging"
            const insertElement = isPointerDrag
                ? dropPlaceholder<ParentMessage>(h)
                : Option.match(findDraggedCard(model, draggedId), {
                      onNone: () => dropPlaceholder<ParentMessage>(h),
                      onSome: (card) =>
                          cardView<ParentMessage>(
                              model,
                              card,
                              column.id,
                              targetIndex,
                              (message) =>
                                  toParentMessage(
                                      GotDragAndDropMessage({ message })
                                  ),
                              h
                          ),
                  })

            return pipe(
                cardElements,
                Array.insertAt(targetIndex, insertElement),
                Option.getOrElse(() => [...cardElements, insertElement])
            )
        },
    })
}

// The column is the recessed surface and the card is the raised one, so they
// must not share a token: `--card` and `--background` are both pure white in
// the light theme, which would leave the cards with nothing but a shadow to
// separate them from the column.
const columnClassName = (isDropTarget: boolean) =>
    isDropTarget
        ? "bg-muted rounded-[var(--radius-surface)] p-3 flex flex-col min-h-0 border-2 border-dashed border-primary"
        : "bg-muted rounded-[var(--radius-surface)] p-3 flex flex-col min-h-0 border-2 border-transparent"

export const columnView = <ParentMessage>(
    model: Model,
    column: Column,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const maybeCurrentDropTarget = Ui.DragAndDrop.maybeDropTarget(
        model.dragAndDrop
    )
    const isDropTarget =
        Ui.DragAndDrop.isDragging(model.dragAndDrop) &&
        Option.exists(
            maybeCurrentDropTarget,
            (target) => target.containerId === column.id
        )

    return h.keyed("div")(
        column.id,
        [
            h.Role("region"),
            h.AriaLabel(column.name),
            h.Class(columnClassName(isDropTarget)),
        ],
        [
            h.div(
                [
                    h.Class(
                        "flex items-center justify-between border-b-(length:--surface-border-width) border-border pb-2 mb-3"
                    ),
                ],
                [
                    h.h2(
                        [
                            h.Class(
                                "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                            ),
                        ],
                        [column.name]
                    ),
                    h.span(
                        [h.Class("text-xs text-muted-foreground")],
                        [`${column.cards.length}`]
                    ),
                ]
            ),
            h.ul(
                [
                    h.Class(
                        "flex flex-col gap-2 flex-1 overflow-y-auto min-h-0"
                    ),
                    ...Ui.DragAndDrop.droppable(column.id, column.name),
                ],
                previewCardElements<ParentMessage>(
                    model,
                    column,
                    toParentMessage,
                    h
                )
            ),
            h.div(
                [
                    h.Class(
                        "mt-3 pt-2 border-t-(length:--surface-border-width) border-border"
                    ),
                ],
                [
                    addCardForm<ParentMessage>(
                        model,
                        column.id,
                        toParentMessage,
                        h
                    ),
                ]
            ),
        ]
    )
}
