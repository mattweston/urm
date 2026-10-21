import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"
import { SavedBoard } from "./kanban.model.ts"

export const GotDragAndDropMessage = taggedStruct("GotDragAndDropMessage", {
    message: Ui.DragAndDrop.Message,
})
export const ClickedAddCard = taggedStruct("ClickedAddCard", {
    columnId: S.String,
})
export const ChangedNewCardTitle = taggedStruct("ChangedNewCardTitle", {
    value: S.String,
})
export const SubmittedNewCard = taggedStruct("SubmittedNewCard")
export const CancelledNewCard = taggedStruct("CancelledNewCard")
export const GeneratedCardId = taggedStruct("GeneratedCardId", {
    cardId: S.String,
    columnId: S.String,
    title: S.String,
})
export const LoadedBoard = taggedStruct("LoadedBoard", {
    maybeSavedBoard: S.Option(SavedBoard),
})
export const CompletedSaveBoard = taggedStruct("CompletedSaveBoard")
export const CompletedFocusAddCardInput = taggedStruct(
    "CompletedFocusAddCardInput"
)

export const Message = S.Union([
    GotDragAndDropMessage,
    ClickedAddCard,
    ChangedNewCardTitle,
    SubmittedNewCard,
    CancelledNewCard,
    GeneratedCardId,
    LoadedBoard,
    CompletedSaveBoard,
    CompletedFocusAddCardInput,
])

export type Message = typeof Message.Type
