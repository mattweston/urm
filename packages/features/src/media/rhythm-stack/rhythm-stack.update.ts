import { Match as M, Option } from "effect"
import { Command } from "foldkit"

import type { AudioService } from "./rhythm-stack.audio.ts"
import { PlayRhythmSounds } from "./rhythm-stack.command.ts"
import type { RhythmId } from "./rhythm-stack.data.ts"
import type { Message } from "./rhythm-stack.message.ts"
import type { EnabledRhythms, Model } from "./rhythm-stack.model.ts"

type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, AudioService>>,
]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const MIN_TEMPO = 40
const MAX_TEMPO = 180
const TEMPO_STEP = 5

const toggleRhythm = (
    enabledRhythms: EnabledRhythms,
    rhythmId: RhythmId
): EnabledRhythms => ({
    ...enabledRhythms,
    [rhythmId]: !enabledRhythms[rhythmId],
})

export const init = (): Model => ({
    tempo: 90,

    transport: {
        _tag: "Stopped",
        step: 0,
    },

    enabledRhythms: {
        sixEight: false,
        fiveFour: false,
        sevenFour: false,
        twoFour: false,
        threeFour: false,
    },

    maybeAudioError: Option.none(),
})

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,

        M.tagsExhaustive({
            ClickedPlay: () => [
                {
                    ...model,

                    transport: {
                        _tag: "Playing",
                        step: model.transport.step,
                    },
                },

                [
                    PlayRhythmSounds({
                        step: model.transport.step,

                        enabledRhythms: model.enabledRhythms,
                    }),
                ],
            ],

            ClickedStop: () => [
                {
                    ...model,

                    transport: {
                        _tag: "Stopped",
                        step: model.transport.step,
                    },
                },

                [],
            ],

            ClickedReset: () => [
                {
                    ...model,

                    transport: {
                        ...model.transport,
                        step: 0,
                    },
                },

                [],
            ],

            ClickedTempoDown: () => [
                {
                    ...model,

                    tempo: Math.max(MIN_TEMPO, model.tempo - TEMPO_STEP),
                },

                [],
            ],

            ClickedTempoUp: () => [
                {
                    ...model,

                    tempo: Math.min(MAX_TEMPO, model.tempo + TEMPO_STEP),
                },

                [],
            ],

            ToggledRhythm: ({ rhythmId }) => [
                {
                    ...model,

                    enabledRhythms: toggleRhythm(
                        model.enabledRhythms,
                        rhythmId
                    ),
                },

                [],
            ],

            AdvancedPulse: () => {
                if (model.transport._tag !== "Playing") {
                    return [model, []]
                }

                const nextStep = model.transport.step + 1

                return [
                    {
                        ...model,

                        transport: {
                            _tag: "Playing",
                            step: nextStep,
                        },
                    },

                    [
                        PlayRhythmSounds({
                            step: nextStep,

                            enabledRhythms: model.enabledRhythms,
                        }),
                    ],
                ]
            },

            CompletedPlayRhythmSounds: () => [model, []],

            // The pulse never drives the transport that gates its own
            // resource; it only records what went wrong.
            FailedPlayRhythmSounds: ({ reason }) => [
                {
                    ...model,
                    maybeAudioError: Option.some(reason),
                },
                [],
            ],

            StartedAudio: () => [
                {
                    ...model,
                    maybeAudioError: Option.none(),
                },
                [],
            ],

            StoppedAudio: () => [model, []],

            FailedStartAudio: ({ reason }) => [
                {
                    ...model,
                    maybeAudioError: Option.some(reason),
                },
                [],
            ],
        })
    )
