import { Duration, Effect, Match as M, Option, Schema as S } from "effect"
import { Command, Subscription, type Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

import * as Audio from "../audio.ts"
import * as Timer from "./timer.ts"

export const Model = S.Struct({
    liked_on_server: S.Boolean,
    maybe_pending_liked: S.Option(S.Boolean),
    is_failure_simulated: S.Boolean,
    maybe_error: S.Option(S.String),
    timer: Timer.Timer,
})
export type Model = typeof Model.Type
export const ClickedLike = taggedStruct("ClickedLike")
export const SucceededSaveLike = taggedStruct("SucceededSaveLike", {
    liked: S.Boolean,
})
export const FailedSaveLike = taggedStruct("FailedSaveLike", {
    error: S.String,
})
export const ToggledFailureSimulation = taggedStruct("ToggledFailureSimulation")
export const TickedLikeTimer = taggedStruct("TickedLikeTimer", {
    now_ms: S.Number,
})
export const Message = S.Union([
    Audio.CompletedPlayCue,
    Audio.FailedPlayCue,
    ClickedLike,
    SucceededSaveLike,
    FailedSaveLike,
    ToggledFailureSimulation,
    TickedLikeTimer,
])
export type Message = typeof Message.Type

const SaveLike = Command.define("SaveLike", {
    args: { liked: S.Boolean, is_failure_simulated: S.Boolean },
    messages: [SucceededSaveLike, FailedSaveLike],
    execute: ({ liked, is_failure_simulated }) =>
        Effect.sleep(Duration.millis(1200)).pipe(
            Effect.as(
                is_failure_simulated
                    ? FailedSaveLike({ error: "Network error" })
                    : SucceededSaveLike({ liked })
            )
        ),
})
export const init: Model = Model.make({
    liked_on_server: false,
    maybe_pending_liked: Option.none(),
    is_failure_simulated: false,
    maybe_error: Option.none(),
    timer: Timer.not_started,
})
export const displayed_liked = (model: Model): boolean =>
    Option.getOrElse(model.maybe_pending_liked, () => model.liked_on_server)
export const displayed_count = (model: Model): number =>
    41 + (displayed_liked(model) ? 1 : 0)
export const server_count = (model: Model): number =>
    41 + (model.liked_on_server ? 1 : 0)
export const is_saving = (model: Model): boolean =>
    Option.isSome(model.maybe_pending_liked)
type UpdateReturn = Update.Return<Model, Message, Audio.AudioService>
export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ClickedLike: () =>
                is_saving(model)
                    ? { model, commands: [] }
                    : {
                          model: modifyFields(model, {
                              maybe_pending_liked: () =>
                                  Option.some(!displayed_liked(model)),
                              maybe_error: () => Option.none(),
                              timer: Timer.start,
                          }),
                          commands: [
                              SaveLike({
                                  liked: !displayed_liked(model),
                                  is_failure_simulated:
                                      model.is_failure_simulated,
                              }),
                              Audio.play(
                                  Audio.LikeToggled({
                                      is_liked: !displayed_liked(model),
                                  })
                              ),
                          ],
                      },
            SucceededSaveLike: ({ liked }) => ({
                model: modifyFields(model, {
                    liked_on_server: () => liked,
                    maybe_pending_liked: () => Option.none(),
                    timer: Timer.settle,
                }),
                commands: [Audio.play(Audio.LikeConfirmed())],
            }),
            FailedSaveLike: ({ error }) => ({
                model: modifyFields(model, {
                    maybe_pending_liked: () => Option.none(),
                    maybe_error: () => Option.some(error),
                    timer: Timer.settle,
                }),
                commands: [],
            }),
            ToggledFailureSimulation: () => ({
                model: modifyFields(model, { is_failure_simulated: (value) => !value }),
                commands: [Audio.play(Audio.SwitchFlipped())],
            }),
            TickedLikeTimer: ({ now_ms }) => ({
                model: modifyFields(model, {
                    timer: (timer) => Timer.tick(timer, now_ms),
                }),
                commands: [],
            }),
            CompletedPlayCue: () => ({ model, commands: [] }),
            FailedPlayCue: () => ({ model, commands: [] }),
        })
    )
export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    likeTimer: entry(
        { is_ticking: S.Boolean },
        {
            modelToDependencies: (model) => ({
                is_ticking: Timer.is_ticking(model.timer),
            }),
            dependenciesToStream: ({ is_ticking }) =>
                Timer.tick_stream(is_ticking, (now_ms) =>
                    TickedLikeTimer({ now_ms })
                ),
        }
    ),
}))
