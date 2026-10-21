import { Effect, Match as M, Schema as S } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"

import { play_note } from "./fold.audio.ts"
import { CompletedPlayNote } from "./fold.message.ts"
import type { Message } from "./fold.message.ts"
import type { Model } from "./fold.model.ts"

const LAST_STEP = 4
const note_frequencies: ReadonlyArray<number> = [392, 440, 493.88, 523.25]

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const PlayNote = Command.define("PlayNote", {
    args: { frequency: S.Number },
    messages: [CompletedPlayNote],
    execute: ({ frequency }) =>
        Effect.sync(() => play_note(frequency)).pipe(
            Effect.as(CompletedPlayNote())
        ),
})

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ClickedNext: () => {
                const frequency = note_frequencies[model.step]

                return [
                    evo(model, {
                        step: (step) => Math.min(step + 1, LAST_STEP),
                    }),
                    frequency === undefined ? [] : [PlayNote({ frequency })],
                ]
            },
            ClickedPrevious: () => [
                evo(model, { step: (step) => Math.max(step - 1, 0) }),
                [],
            ],
            ClickedRestart: () => [evo(model, { step: () => 0 }), []],
            CompletedPlayNote: () => [model, []],
        })
    )

export const init = (): UpdateReturn => [{ step: 0 }, []]
