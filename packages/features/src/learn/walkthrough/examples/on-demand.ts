import {
    Array,
    Duration,
    Effect,
    Match as M,
    Option,
    Random,
    Schema as S,
} from "effect"
import { AsyncData, Command, Subscription, type Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

import * as Audio from "../audio.ts"
import * as Timer from "./timer.ts"

const DICE_COUNT = 3
const DIE_FACES = 6

export const Rolls = AsyncData.Schema(S.Array(S.Number), S.String)
export const Model = S.Struct({ rolls: Rolls.schema, timer: Timer.Timer })
export type Model = typeof Model.Type

export const ClickedRollDice = taggedStruct("ClickedRollDice")
export const CompletedRollTriggeredDice = taggedStruct(
    "CompletedRollTriggeredDice",
    {
        rolls: S.Array(S.Number),
    }
)
export const TickedRollTimer = taggedStruct("TickedRollTimer", {
    now_ms: S.Number,
})
export const Message = S.Union([
    Audio.CompletedPlayCue,
    Audio.FailedPlayCue,
    ClickedRollDice,
    CompletedRollTriggeredDice,
    TickedRollTimer,
])
export type Message = typeof Message.Type

const RollTriggeredDice = Command.define("RollTriggeredDice", {
    messages: [CompletedRollTriggeredDice],
    execute: Effect.sleep(Duration.millis(800)).pipe(
        Effect.andThen(
            Effect.all(
                Array.makeBy(DICE_COUNT, () =>
                    Random.nextIntBetween(1, DIE_FACES + 1)
                )
            )
        ),
        Effect.map((rolls) => CompletedRollTriggeredDice({ rolls }))
    ),
})

export const init: Model = Model.make({
    rolls: AsyncData.Idle(),
    timer: Timer.not_started,
})
type UpdateReturn = Update.Return<Model, Message, Audio.AudioService>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ClickedRollDice: () =>
                AsyncData.isPending(model.rolls)
                    ? { model, commands: [] }
                    : {
                          model: evo(model, {
                              rolls: (rolls) =>
                                  Option.getOrElse(
                                      AsyncData.revalidateOrLoad(rolls),
                                      () => rolls
                                  ),
                              timer: Timer.start,
                          }),
                          commands: [
                              RollTriggeredDice(),
                              Audio.play(Audio.RollStarted()),
                          ],
                      },
            CompletedRollTriggeredDice: ({ rolls }) => ({
                model: evo(model, {
                    rolls: () => AsyncData.Success({ data: rolls }),
                    timer: Timer.settle,
                }),
                commands: [Audio.play(Audio.RollLanded())],
            }),
            TickedRollTimer: ({ now_ms }) => ({
                model: evo(model, {
                    timer: (timer) => Timer.tick(timer, now_ms),
                }),
                commands: [],
            }),
            CompletedPlayCue: () => ({ model, commands: [] }),
            FailedPlayCue: () => ({ model, commands: [] }),
        })
    )

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    rollTimer: entry(
        { is_ticking: S.Boolean },
        {
            modelToDependencies: (model) => ({
                is_ticking: Timer.is_ticking(model.timer),
            }),
            dependenciesToStream: ({ is_ticking }) =>
                Timer.tick_stream(is_ticking, (now_ms) =>
                    TickedRollTimer({ now_ms })
                ),
        }
    ),
}))

export const total = (model: Model): AsyncData.AsyncData<number, string> =>
    AsyncData.map(model.rolls, (rolls) =>
        Array.reduce(rolls, 0, (sum, roll) => sum + roll)
    )
export const is_rolling = (model: Model): boolean =>
    AsyncData.isPending(model.rolls)
