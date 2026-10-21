import { Match as M, Option } from "effect"
import { Command } from "foldkit"

import { GotToastDemoMessage, type ToastDemoMessage } from "./message.ts"
import type { Model } from "./model.ts"
import { Toast } from "./toast.ts"

type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<ToastDemoMessage>>,
]

const mapCommands = (
    commands: ReadonlyArray<Command.Command<typeof Toast.Message.Type>>
) =>
    Command.mapMessages(commands, (message) => GotToastDemoMessage({ message }))

export const init = (): UpdateReturn => [
    Toast.init({ id: "labs-toast-demo" }),
    [],
]

export const update = (model: Model, message: ToastDemoMessage): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotToastDemoMessage: ({ message }) => {
                const { model: next, commands = [] } = Toast.update(
                    model,
                    message
                )
                return [next, mapCommands(commands)]
            },
            ClickedShowInfoToast: () => {
                const { model: next, commands = [] } = Toast.show(model, {
                    variant: "Info",
                    payload: {
                        title: "Changes saved",
                        maybeDescription: Option.some(
                            "Your preferences have been updated."
                        ),
                    },
                })
                return [next, mapCommands(commands)]
            },
            ClickedShowSuccessToast: () => {
                const { model: next, commands = [] } = Toast.show(model, {
                    variant: "Success",
                    payload: {
                        title: "Uploaded successfully",
                        maybeDescription: Option.some(
                            "kit-manual.pdf is now available."
                        ),
                    },
                })
                return [next, mapCommands(commands)]
            },
            ClickedShowWarningToast: () => {
                const { model: next, commands = [] } = Toast.show(model, {
                    variant: "Warning",
                    payload: {
                        title: "Network slow",
                        maybeDescription: Option.some(
                            "Some assets are loading over a weak connection."
                        ),
                    },
                })
                return [next, mapCommands(commands)]
            },
            ClickedShowErrorToast: () => {
                const { model: next, commands = [] } = Toast.show(model, {
                    variant: "Error",
                    payload: {
                        title: "Failed to save",
                        maybeDescription: Option.some(
                            "Check your connection and try again."
                        ),
                    },
                })
                return [next, mapCommands(commands)]
            },
            ClickedShowStickyToast: () => {
                const { model: next, commands = [] } = Toast.show(model, {
                    variant: "Info",
                    payload: {
                        title: "Review pending",
                        maybeDescription: Option.some(
                            "Action required — this stays until dismissed."
                        ),
                    },
                    sticky: true,
                })
                return [next, mapCommands(commands)]
            },
            ClickedDismissAllToasts: () => {
                const { model: next, commands = [] } = Toast.dismissAll(model)
                return [next, mapCommands(commands)]
            },
        })
    )
