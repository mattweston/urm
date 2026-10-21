import { Duration, Effect, Stream } from "effect"
import { Schema as S } from "effect"
import { Subscription } from "foldkit"

import { GAME_SPEED } from "./constants.ts"
import { PressedKey, TickedClock, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const movementKeys = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "w",
    "a",
    "s",
    "d",
    "W",
    "A",
    "S",
    "D",
    " ",
    "r",
    "R",
])

const isEditableTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) {
        return false
    }

    return target.matches('input, textarea, select, [contenteditable="true"]')
}

export const SubscriptionDependencies = S.Struct({
    gameClock: S.Struct({
        isPlaying: S.Boolean,
        interval: S.Number,
    }),
})

export const snakeKeyboardStream = () =>
    Stream.fromEventListener<KeyboardEvent>(document, "keydown").pipe(
        Stream.mapEffect((keyboardEvent) =>
            Effect.sync(() => {
                if (
                    movementKeys.has(keyboardEvent.key) &&
                    !isEditableTarget(keyboardEvent.target)
                ) {
                    keyboardEvent.preventDefault()
                }

                return PressedKey({ key: keyboardEvent.key })
            })
        )
    )

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    gameClock: entry(
        { isPlaying: S.Boolean, interval: S.Number },
        {
            modelToDependencies: (model) => ({
                isPlaying: model.gameState === "Playing",
                interval: Math.max(
                    GAME_SPEED.MIN_INTERVAL,
                    GAME_SPEED.BASE_INTERVAL - model.points
                ),
            }),
            dependenciesToStream: ({ isPlaying, interval }) =>
                Stream.when(
                    Stream.tick(Duration.millis(interval)).pipe(
                        Stream.map(TickedClock)
                    ),
                    Effect.sync(() => isPlaying)
                ),
        }
    ),
}))
