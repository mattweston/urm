import { Effect, Option, Stream } from "effect"
import { Subscription } from "foldkit"

import {
    ClickedRedo,
    ClickedUndo,
    SelectedTool,
    ReleasedMouse,
    type PixelArtMessage,
} from "./message.ts"

// Returns an Option rather than dispatching: the stream filters the misses out,
// so a key the page does not use stays an ordinary keystroke.
export const handleKeyboardEvent = (
    event: KeyboardEvent
): Effect.Effect<Option.Option<PixelArtMessage>> =>
    Effect.sync(() => {
        const isCtrlOrMeta = event.ctrlKey || event.metaKey
        const key = event.key.toLowerCase()

        if (isCtrlOrMeta && key === "z") {
            event.preventDefault()
            return Option.some(event.shiftKey ? ClickedRedo() : ClickedUndo())
        }

        if (isCtrlOrMeta && key === "y") {
            event.preventDefault()
            return Option.some(ClickedRedo())
        }

        if (!isCtrlOrMeta) {
            if (key === "b") {
                return Option.some(SelectedTool({ tool: "Brush" }))
            }
            if (key === "f") {
                return Option.some(SelectedTool({ tool: "Fill" }))
            }
            if (key === "e") {
                return Option.some(SelectedTool({ tool: "Eraser" }))
            }
        }

        return Option.none()
    })

const keyboardStream = Stream.fromEventListener<KeyboardEvent>(
    document,
    "keydown"
).pipe(
    Stream.mapEffect(handleKeyboardEvent),
    Stream.filter(Option.isSome),
    Stream.map((message) => message.value)
)

const mouseUpStream = Stream.fromEventListener<MouseEvent>(
    document,
    "mouseup"
).pipe(Stream.map(() => ReleasedMouse()))

export const subscriptions = Subscription.make<unknown, PixelArtMessage>()(
    () => ({
        pixelArtKeyboard: Subscription.persistent(keyboardStream),
        pixelArtMouseUp: Subscription.persistent(mouseUpStream),
    })
)
