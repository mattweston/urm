import { Effect, Schema as S } from "effect"
import { Command } from "foldkit"
import { CompletedSave } from "./draftboard.message.ts"
import { Document } from "./draftboard.model.ts"

export const SaveBoard = Command.define("SaveBoard", {
    args: { revision: S.Number, document: Document },
    messages: [CompletedSave],
    execute: ({ revision, document }) =>
        Effect.try(() => {
            globalThis.localStorage?.setItem(
                `draftboard.document.v1.${document.id}`,
                JSON.stringify(document)
            )
            return CompletedSave({ revision, document, is_success: true })
        }).pipe(
            Effect.delay("300 millis"),
            Effect.catch(() =>
                Effect.succeed(
                    CompletedSave({ revision, document, is_success: false })
                )
            )
        ),
})
