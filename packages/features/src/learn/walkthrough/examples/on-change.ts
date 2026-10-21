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

const MIN_DICE = 1
const MAX_DICE = 10
const DEFAULT_DICE = 3
const DIE_FACES = 6

export const Rolls = AsyncData.Schema(S.Array(S.Number), S.String)
export const Model = S.Struct({
    dice_count: S.Number,
    rolls: Rolls.schema,
    timer: Timer.Timer,
})
export type Model = typeof Model.Type

export const ClickedDecreaseDice = taggedStruct("ClickedDecreaseDice")
export const ClickedResetDice = taggedStruct("ClickedResetDice")
export const ClickedIncreaseDice = taggedStruct("ClickedIncreaseDice")
export const CompletedRollDice = taggedStruct("CompletedRollDice", {
    rolls: S.Array(S.Number),
})
export const TickedDiceTimer = taggedStruct("TickedDiceTimer", {
    now_ms: S.Number,
})
export const Message = S.Union([
    Audio.CompletedPlayCue,
    Audio.FailedPlayCue,
    ClickedDecreaseDice,
    ClickedResetDice,
    ClickedIncreaseDice,
    CompletedRollDice,
    TickedDiceTimer,
])
export type Message = typeof Message.Type

const RollDice = Command.define("RollDice", {
    args: { dice_count: S.Number },
    messages: [CompletedRollDice],
    execute: ({ dice_count }) =>
        Effect.sleep(Duration.millis(800)).pipe(
            Effect.andThen(
                Effect.all(
                    Array.makeBy(dice_count, () =>
                        Random.nextIntBetween(1, DIE_FACES + 1)
                    )
                )
            ),
            Effect.map((rolls) => CompletedRollDice({ rolls }))
        ),
})

export const init: Model = Model.make({
    dice_count: DEFAULT_DICE,
    rolls: AsyncData.Idle(),
    timer: Timer.not_started,
})

type UpdateReturn = Update.Return<Model, Message, Audio.AudioService>
const reroll = (model: Model, dice_count: number): UpdateReturn => ({
    model: evo(model, {
        dice_count: () => dice_count,
        rolls: (rolls) =>
            Option.getOrElse(AsyncData.revalidateOrLoad(rolls), () => rolls),
        timer: Timer.start,
    }),
    commands: [RollDice({ dice_count }), Audio.play(Audio.Running())],
})

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ClickedDecreaseDice: () =>
                reroll(model, Math.max(MIN_DICE, model.dice_count - 1)),
            ClickedResetDice: () => reroll(model, DEFAULT_DICE),
            ClickedIncreaseDice: () =>
                reroll(model, Math.min(MAX_DICE, model.dice_count + 1)),
            CompletedRollDice: ({ rolls }) => ({
                model: evo(model, {
                    rolls: () => AsyncData.Success({ data: rolls }),
                    timer: Timer.settle,
                }),
                commands: [Audio.play(Audio.DiceLanded())],
            }),
            TickedDiceTimer: ({ now_ms }) => ({
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
    diceTimer: entry(
        { is_ticking: S.Boolean },
        {
            modelToDependencies: (model) => ({
                is_ticking: Timer.is_ticking(model.timer),
            }),
            dependenciesToStream: ({ is_ticking }) =>
                Timer.tick_stream(is_ticking, (now_ms) =>
                    TickedDiceTimer({ now_ms })
                ),
        }
    ),
}))

export const total = (model: Model): AsyncData.AsyncData<number, string> =>
    AsyncData.map(model.rolls, (rolls) =>
        Array.reduce(rolls, 0, (sum, roll) => sum + roll)
    )
export const is_at_min = (model: Model): boolean => model.dice_count <= MIN_DICE
export const is_at_max = (model: Model): boolean => model.dice_count >= MAX_DICE
