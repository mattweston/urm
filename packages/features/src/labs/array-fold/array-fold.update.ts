import { Effect, Match as M, Schema as S } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"

import { notes, total_through, values } from "./array-fold.data.ts"
import { play_note } from "./array-fold.audio.ts"
import { CompletedPlayNote } from "./array-fold.message.ts"
import type { Message } from "./array-fold.message.ts"
import type { Model } from "./array-fold.model.ts"

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
            ClickedFoldNext: () => {
                const next_step = Math.min(model.step + 1, values.length)
                const note = notes[model.step]

                return [
                    evo(model, {
                        step: () => next_step,
                        total: () => total_through(next_step),
                    }),
                    note === undefined
                        ? []
                        : [PlayNote({ frequency: note.frequency })],
                ]
            },
            ClickedReset: () => [
                evo(model, { step: () => 0, total: () => 0 }),
                [],
            ],
            CompletedPlayNote: () => [model, []],
        })
    )

export const init = (): UpdateReturn => [{ step: 0, total: 0 }, []]
