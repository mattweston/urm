import { Duration, Effect, Schema as S, Stream } from "effect"
import { Subscription } from "foldkit"
import type { Message } from "./stopwatch.message.ts"
import { Ticked } from "./stopwatch.message.ts"
import type { Model } from "./stopwatch.model.ts"

const TICK_INTERVAL_MS = 10

export const SubscriptionDependencies = S.Struct({
    tick: S.Struct({
        isRunning: S.Boolean,
    }),
})

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    tick: entry(
        { isRunning: S.Boolean },
        {
            modelToDependencies: (model) => ({ isRunning: model.isRunning }),
            dependenciesToStream: ({ isRunning }) =>
                Stream.when(
                    Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
                        Stream.map(() => Ticked())
                    ),
                    Effect.sync(() => isRunning)
                ),
        }
    ),
}))
