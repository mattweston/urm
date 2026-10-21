import { Clock, Effect, Random, Schema as S } from "effect"
import { Command } from "foldkit"

import { Comment } from "./comment.ts"
import { CompletedGenerateComment } from "./comments.message.ts"

export const GenerateComment = Command.define("GenerateComment", {
    args: { author: S.String, content: S.String },
    messages: [CompletedGenerateComment],
    execute: ({ author, content }) =>
        Effect.gen(function* () {
            const id = yield* Random.nextIntBetween(0, Number.MAX_SAFE_INTEGER)
            const timestamp = yield* Clock.currentTimeMillis
            return CompletedGenerateComment({
                comment: Comment.make({
                    id: id.toString(36),
                    author,
                    content,
                    created_at: timestamp,
                    updated_at: timestamp,
                }),
            })
        }),
})
