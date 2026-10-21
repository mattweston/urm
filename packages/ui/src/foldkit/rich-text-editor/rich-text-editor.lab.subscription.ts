import { Equivalence, Schema as S, Stream } from "effect"
import { Subscription } from "foldkit"
import { DragAndDrop } from "@foldkit/ui"
import {
    GotRichTextDragAndDropMessage,
    RichTextEditorModel,
} from "./rich-text-editor.schema.ts"
import { richTextEditorSubscriptions } from "./rich-text-editor.subscriptions.ts"
import type { Message } from "./rich-text-editor.lab.message.ts"
import type { Model } from "./rich-text-editor.lab.model.ts"

const dragAndDropSubscriptions = DragAndDrop.subscriptions
const documentPointerDependencies = {
    dragActivity: S.Literals(["Idle", "Active"]),
    orientation: S.Literals(["Horizontal", "Vertical"]),
}
const documentEscapeDependencies = {
    dragActivity: S.Literals(["Idle", "Active"]),
}
const documentKeyboardDependencies = {
    dragActivity: S.Literals(["Idle", "Active"]),
}
const autoScrollDependencies = {
    isDragging: S.Boolean,
    clientY: S.Number,
}

export const SubscriptionDependencies = S.Struct({
    model: RichTextEditorModel,
    dragPointer: S.Struct(documentPointerDependencies),
    dragEscape: S.Struct(documentEscapeDependencies),
    dragKeyboard: S.Struct(documentKeyboardDependencies),
    autoScroll: S.Struct(autoScrollDependencies),
})

const mapDndMsg = (message: DragAndDrop.Message): Message =>
    GotRichTextDragAndDropMessage({ message })

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    model: entry(RichTextEditorModel.fields, {
        modelToDependencies: (model) => model,
        dependenciesToStream: (model) =>
            richTextEditorSubscriptions({
                id: "lab-rich-text-editor",
                model,
                isDisabled: false,
            }),
    }),
    dragPointer: entry(documentPointerDependencies, {
        modelToDependencies: (model) =>
            dragAndDropSubscriptions.documentPointer.modelToDependencies(
                model.dragAndDrop
            ),
        dependenciesToStream: (dependencies) =>
            dragAndDropSubscriptions.documentPointer
                .dependenciesToStream(dependencies)
                .pipe(Stream.map(mapDndMsg)),
    }),
    dragEscape: entry(documentEscapeDependencies, {
        modelToDependencies: (model) =>
            dragAndDropSubscriptions.documentEscape.modelToDependencies(
                model.dragAndDrop
            ),
        dependenciesToStream: (dependencies) =>
            dragAndDropSubscriptions.documentEscape
                .dependenciesToStream(dependencies)
                .pipe(Stream.map(mapDndMsg)),
    }),
    dragKeyboard: entry(documentKeyboardDependencies, {
        modelToDependencies: (model) =>
            dragAndDropSubscriptions.documentKeyboard.modelToDependencies(
                model.dragAndDrop
            ),
        dependenciesToStream: (dependencies) =>
            dragAndDropSubscriptions.documentKeyboard
                .dependenciesToStream(dependencies)
                .pipe(Stream.map(mapDndMsg)),
    }),
    autoScroll: entry(autoScrollDependencies, {
        modelToDependencies: (model) =>
            dragAndDropSubscriptions.autoScroll.modelToDependencies(
                model.dragAndDrop
            ),
        keepAliveEquivalence: Equivalence.Struct({
            isDragging: Equivalence.Boolean,
        }),
        dependenciesToStream: (dependencies, readDependencies) =>
            dragAndDropSubscriptions.autoScroll
                .dependenciesToStream(dependencies, readDependencies)
                .pipe(Stream.map(mapDndMsg)),
    }),
}))
