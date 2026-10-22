import { Option, Schema as S, Stream } from "effect"
import { Subscription } from "foldkit"
import { streamFromEvent } from "foldkit/dom"
import * as Ui from "@foldkit/ui"
import { GotDragAndDropMessage, ViewportChanged } from "./app.message.ts"
import type { AppMessage } from "./app.message.ts"
import type { Model } from "./app.model.ts"

// Four 230px columns plus gaps, page padding, and the application sidebar need
// an xl-sized viewport. Below this the app uses the list instead of forcing a
// horizontally scrolling board.
export const COMPACT_VIEWPORT_QUERY = "(max-width: 1279px)"

export const isCompactViewport = (): boolean =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(COMPACT_VIEWPORT_QUERY).matches

const dragSubscriptions = Subscription.lift({
    dragPointer: Ui.DragAndDrop.subscriptions.documentPointer,
    dragEscape: Ui.DragAndDrop.subscriptions.documentEscape,
    dragKeyboard: Ui.DragAndDrop.subscriptions.documentKeyboard,
    autoScroll: Ui.DragAndDrop.subscriptions.autoScroll,
})<Model, AppMessage>({
    read: (model) => Option.some(model.dragAndDrop),
    toParentMessage: (message) => GotDragAndDropMessage({ message }),
})

// The MediaQueryList is built inside `dependenciesToStream`, which only runs
// once the subscription starts, so `matchMedia` is never touched during a
// server render.
const viewportSubscriptions = Subscription.make<Model, AppMessage>()(
    (entry) => ({
        compactViewport: entry(
            { query: S.String },
            {
                modelToDependencies: () => ({
                    query: COMPACT_VIEWPORT_QUERY,
                }),
                dependenciesToStream: ({ query }) => {
                    const media_query = window.matchMedia(query)

                    return Stream.make(
                        ViewportChanged({ isCompact: media_query.matches })
                    ).pipe(
                        Stream.concat(
                            streamFromEvent({
                                target: media_query,
                                type: "change",
                                mapEvent: (event) =>
                                    ViewportChanged({
                                        isCompact: event.matches,
                                    }),
                            })
                        )
                    )
                },
            }
        ),
    })
)

export const subscriptions = Subscription.aggregate<Model, AppMessage>()(
    dragSubscriptions,
    viewportSubscriptions
)
