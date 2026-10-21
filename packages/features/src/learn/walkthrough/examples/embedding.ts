import { Array, Match as M, Option, Schema as S } from "effect"
import { Command, type Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

import * as Composer from "./composer.ts"

export const Post = S.Struct({
    post_id: S.Number,
    text: S.String,
})
export type Post = typeof Post.Type

export const Thread = S.Struct({
    thread_id: S.Number,
    title: S.String,
    placeholder: S.String,
    composer: Composer.Model,
    next_post_id: S.Number,
    posts: S.Array(Post),
})
export type Thread = typeof Thread.Type

export const Model = S.Struct({
    threads: S.Array(Thread),
})
export type Model = typeof Model.Type

// The routing key is `id` rather than `thread_id`: a Got wrapper carries the
// child Message plus routing context, and that is the shape the lint rule
// recognizes.
export const GotComposerMessage = taggedStruct("GotComposerMessage", {
    id: S.Number,
    message: Composer.Message,
})
export const Message = S.Union([GotComposerMessage])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    threads: [
        Thread.make({
            thread_id: 1,
            title: "Release notes",
            placeholder: "Say something about the release",
            composer: Composer.init,
            next_post_id: 2,
            posts: [
                Post.make({ post_id: 1, text: "Shipped the router rewrite." }),
            ],
        }),
        Thread.make({
            thread_id: 2,
            title: "Support",
            placeholder: "Describe what went wrong",
            composer: Composer.init,
            next_post_id: 1,
            posts: [],
        }),
    ],
})

type UpdateReturn = Update.Return<Model, Message>
type ThreadUpdate = Update.Return<Thread, Message>

const apply_out_message = (
    thread: Thread,
    maybe_out_message: Option.Option<Composer.OutMessage>
): Thread =>
    Option.match(maybe_out_message, {
        onNone: () => thread,
        onSome: (out_message) =>
            M.value(out_message).pipe(
                M.withReturnType<Thread>(),
                M.tagsExhaustive({
                    PostedComment: ({ text }) =>
                        modifyFields(thread, {
                            posts: (posts) =>
                                Array.append(
                                    posts,
                                    Post.make({
                                        post_id: thread.next_post_id,
                                        text,
                                    })
                                ),
                            next_post_id: (post_id) => post_id + 1,
                        }),
                })
            ),
    })

// The child dispatches in its own Message type; this is where those become
// Messages this module knows about. The two composers on the page are the same
// module twice over, told apart only by the id travelling in the wrapper.
const lift_composer_commands = (
    thread_id: number,
    commands: Update.Commands<Composer.Message>
): Update.Commands<Message> =>
    Command.mapMessages(
        commands,
        (message): Message => GotComposerMessage({ id: thread_id, message })
    )

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotComposerMessage: ({
                id: thread_id,
                message: composer_message,
            }) => {
                const results = Array.map(
                    model.threads,
                    (thread): ThreadUpdate => {
                        if (thread.thread_id !== thread_id) {
                            return { model: thread, commands: [] }
                        }
                        const {
                            model: composer,
                            commands = [],
                            outMessage: maybe_out_message_value,
                        } = Composer.update(thread.composer, composer_message)
                        const maybe_out_message = Option.fromUndefinedOr(
                            maybe_out_message_value
                        )

                        return {
                            model: apply_out_message(
                                modifyFields(thread, {
                                    composer: () => composer,
                                }),
                                maybe_out_message
                            ),
                            commands: lift_composer_commands(
                                thread_id,
                                commands
                            ),
                        }
                    }
                )
                return {
                    model: modifyFields(model, {
                        threads: () =>
                            Array.map(results, ({ model: thread }) => thread),
                    }),
                    commands: Array.flatMap(
                        results,
                        ({ commands = [] }) => commands
                    ),
                }
            },
        })
    )
