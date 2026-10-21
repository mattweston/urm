import { Effect, Schema as S } from "effect"
import { Command } from "foldkit"
import { CompletedLike, CompletedPost } from "./threadline.message.ts"

export const PublishThreadlinePost = Command.define("PublishThreadlinePost", {
    args: { id: S.String, body: S.String, online: S.Boolean },
    messages: [CompletedPost],
    execute: ({ id, body, online }) =>
        Effect.succeed(CompletedPost({ id, body, is_success: online })).pipe(
            Effect.delay("260 millis")
        ),
})
export const SaveThreadlineLike = Command.define("SaveThreadlineLike", {
    args: { id: S.String, operation: S.Number, online: S.Boolean },
    messages: [CompletedLike],
    execute: ({ id, operation, online }) =>
        Effect.succeed(
            CompletedLike({ id, operation, is_success: online })
        ).pipe(Effect.delay("220 millis")),
})
