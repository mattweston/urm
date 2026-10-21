import { Effect, Option, Queue, Schema as S, Stream } from "effect"
import { Subscription } from "foldkit"
import { clearChapterHandler, setChapterHandler } from "./storymap.host.ts"
import { EnteredChapter, type Message } from "./storymap.message.ts"
import { type Model } from "./storymap.model.ts"

export const SubscriptionDependencies = S.Struct({
    storymapChapters: S.Option(S.String),
})

// The IntersectionObserver is installed by the story Mount; this is where what
// it sees becomes Messages.
export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    storymapChapters: entry(SubscriptionDependencies.fields, {
        modelToDependencies: (model) => ({
            storymapChapters: model.maybeMapHostId,
        }),
        dependenciesToStream: ({ storymapChapters: maybeHostId }) =>
            Option.match(maybeHostId, {
                onNone: () => Stream.empty,
                onSome: (hostId) =>
                    Stream.callback<Message>((queue) =>
                        Effect.acquireRelease(
                            Effect.sync(() =>
                                setChapterHandler(hostId, (chapterId) => {
                                    Queue.offerUnsafe(
                                        queue,
                                        EnteredChapter({ chapterId })
                                    )
                                })
                            ),
                            () => Effect.sync(() => clearChapterHandler(hostId))
                        ).pipe(Effect.flatMap(() => Effect.never))
                    ),
            }),
    }),
}))
