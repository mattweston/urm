import { Effect, Function, Match as M, Option } from "effect"
import { Command } from "foldkit"
import abcjs from "abcjs"
import type { Model } from "./music-notation.model.ts"
import {
    type Message,
    CompletedPlayback,
    CompletedStopPlayback,
} from "./music-notation.message.ts"
import {
    cursorControl,
    getController,
    getRenderedTune,
    HOST_ID,
    setController,
} from "./music-notation.host.ts"

const DEFAULT_ABC = `X:1
M:4/4
L:1/8
K:C
|: C2 E2 G2 c2 | e2 d2 c2 B2 | A2 G2 F2 E2 | D4 C4 :|`

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

// AUDIO

const StartPlayback = Command.define("StartPlayback", {
    messages: [CompletedPlayback],
    execute: Effect.callback<typeof CompletedPlayback.Type>((resume) => {
        const container = document.querySelector(
            "#abc-synth-container"
        ) as HTMLElement | null
        if (container === null) {
            resume(Effect.succeed(CompletedPlayback()))
            return
        }
        const controller = Option.getOrElse(getController(HOST_ID), () => {
            const created = new abcjs.synth.SynthController()
            created.load(container, cursorControl(HOST_ID), {
                displayPlay: false,
                displayLoop: false,
                displayRestart: false,
                displayProgress: false,
                displayWarp: false,
            })
            setController(HOST_ID, created)

            return created
        })

        Option.match(getRenderedTune(HOST_ID), {
            onNone: () => resume(Effect.succeed(CompletedPlayback())),
            onSome: (tune) => {
                cursorControl(HOST_ID).onFinished = () => {
                    resume(Effect.succeed(CompletedPlayback()))
                }
                controller.setTune(tune, true).then(() => controller.play())
            },
        })
    }).pipe(Effect.catch(() => Effect.succeed(CompletedPlayback()))),
})

const startPlayback = () => StartPlayback()

const StopPlayback = Command.define("StopPlayback", {
    messages: [CompletedStopPlayback],
    execute: Effect.sync(() => {
        Option.match(getController(HOST_ID), {
            onNone: Function.constVoid,
            onSome: (controller) => controller.pause(),
        })
        return CompletedStopPlayback()
    }),
})

const stopPlayback = StopPlayback()

// UPDATE

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            CompletedRenderedAbc: () => [model, []],
            ClickedExample: ({ abcNotation }) => [
                { ...model, abcNotation },
                [],
            ],
            ClickedPlay: () => [
                { ...model, isPlaying: true },
                [startPlayback()],
            ],
            ClickedStop: () => [{ ...model, isPlaying: false }, [stopPlayback]],
            CompletedPlayback: () => [{ ...model, isPlaying: false }, []],
            CompletedStopPlayback: () => [model, []],
            ToggledTablature: () => [
                { ...model, showTablature: !model.showTablature },
                [],
            ],
        })
    )

export const init = (): UpdateReturn => [
    { abcNotation: DEFAULT_ABC, isPlaying: false, showTablature: false },
    [],
]
