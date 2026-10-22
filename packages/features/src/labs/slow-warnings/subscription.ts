import { Effect, Option, Queue, Schema as S, Stream, pipe } from "effect"
import { Subscription } from "foldkit"
import type { Message } from "./message.ts"
import { Model, Workload, SlowWarningReport } from "./model.ts"
import { RecordedSlowWarning } from "./message.ts"
import { burnCpu } from "./burn-cpu.ts"
import {
    SLOW_WARNING_EVENT,
    slowWarningEventTarget,
} from "./slow-warning.event.ts"

const SUBSCRIPTION_DEPENDENCIES_WORK_MS = 8

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    slowWarnings: Subscription.persistentEntry(
        Stream.callback<typeof RecordedSlowWarning.Type>((queue) =>
            Effect.acquireRelease(
                Effect.sync(() => {
                    const handler = (event: Event) => {
                        if (event instanceof CustomEvent) {
                            pipe(
                                event.detail,
                                S.decodeUnknownOption(SlowWarningReport),
                                Option.match({
                                    onNone: () => undefined,
                                    onSome: (report) =>
                                        Queue.offerUnsafe(
                                            queue,
                                            RecordedSlowWarning({ report })
                                        ),
                                })
                            )
                        }
                    }

                    slowWarningEventTarget().addEventListener(
                        SLOW_WARNING_EVENT,
                        handler
                    )
                    return handler
                }),
                (handler) =>
                    Effect.sync(() =>
                        slowWarningEventTarget().removeEventListener(
                            SLOW_WARNING_EVENT,
                            handler
                        )
                    )
            ).pipe(Effect.flatMap(() => Effect.never))
        )
    ),
    burnCpuDuringDependencyExtraction: entry(
        {
            activeWorkload: Workload,
        },
        {
            modelToDependencies: (model) => {
                if (model.activeWorkload === "SubscriptionDependencies") {
                    burnCpu(SUBSCRIPTION_DEPENDENCIES_WORK_MS)
                }

                return {
                    activeWorkload: model.activeWorkload,
                }
            },
            dependenciesToStream: () => Stream.empty,
        }
    ),
}))
