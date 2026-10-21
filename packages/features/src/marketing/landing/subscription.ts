import { Schema as S, Stream } from "effect"
import { DragAndDrop } from "@foldkit/ui"
import { Subscription } from "foldkit"
import { RichTextEditorModel } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"
import { richTextEditorSubscriptions } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.subscriptions.ts"

import {
    GotLandingDragAndDropMessage,
    GotLandingRichTextEditorMessage,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"

const landing_block_subscriptions = Subscription.lift({
    landingBlockPointer: DragAndDrop.subscriptions.documentPointer,
    landingBlockEscape: DragAndDrop.subscriptions.documentEscape,
    landingBlockKeyboard: DragAndDrop.subscriptions.documentKeyboard,
    landingBlockAutoScroll: DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
    toChildModel: (model) => model.drag_and_drop,
    toParentMessage: (message) => GotLandingDragAndDropMessage({ message }),
})

const rich_text_editor_subscriptions = Subscription.make<Model, Message>()(
    (entry) => ({
        landingRichTextEditor: entry(
            {
                id: S.String,
                model: RichTextEditorModel,
                isDisabled: S.Boolean,
            },
            {
                modelToDependencies: (model) => ({
                    id: "landing-rich-text-editor",
                    model: model.rich_text_editor,
                    isDisabled: model.editor_state._tag !== "Editing",
                }),
                dependenciesToStream: ({ id, model, isDisabled }) =>
                    richTextEditorSubscriptions({
                        id,
                        model,
                        isDisabled,
                    }).pipe(
                        Stream.map((message) =>
                            GotLandingRichTextEditorMessage({ message })
                        )
                    ),
            }
        ),
    })
)

const rich_text_drag_and_drop_subscriptions = Subscription.lift({
    richTextPointer: DragAndDrop.subscriptions.documentPointer,
    richTextEscape: DragAndDrop.subscriptions.documentEscape,
    richTextKeyboard: DragAndDrop.subscriptions.documentKeyboard,
    richTextAutoScroll: DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
    toChildModel: (model) => model.rich_text_editor.dragAndDrop,
    toParentMessage: (message) =>
        GotLandingRichTextEditorMessage({
            message: {
                _tag: "GotRichTextDragAndDropMessage",
                message,
            },
        }),
})

export const subscriptions = Subscription.aggregate<Model, Message>()(
    landing_block_subscriptions,
    rich_text_editor_subscriptions,
    rich_text_drag_and_drop_subscriptions
)
