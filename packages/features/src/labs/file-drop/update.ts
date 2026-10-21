import * as Ui from "@foldkit/ui"
import { Array, Effect, Match as M, Option } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import { GotFileDropMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [
    { fileDrop: Ui.FileDrop.init({ id: "labs-file-drop" }), files: [] },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotFileDropMessage: ({ message: childMessage }) => {
                const {
                    model: fileDrop,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.FileDrop.update(model.fileDrop, childMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const files = Option.match(maybeOutMessage, {
                    onNone: () => model.files,
                    onSome: M.type<Ui.FileDrop.OutMessage>().pipe(
                        M.tagsExhaustive({
                            ReceivedFiles: ({ files }) => [
                                ...model.files,
                                ...files,
                            ],
                            RejectedNonFiles: () => model.files,
                        })
                    ),
                })
                return [
                    modifyFields(model, {
                        fileDrop: () => fileDrop,
                        files: () => files,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotFileDropMessage({ message })
                            )
                        )
                    ),
                ]
            },
            ClickedRemoveFile: ({ fileIndex }) => [
                modifyFields(model, {
                    files: () => Array.remove(model.files, fileIndex),
                }),
                [],
            ],
        })
    )
