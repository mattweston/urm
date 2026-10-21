import { Match as M } from "effect"
import { Command } from "foldkit"
import type { Model } from "./otp-field.model.ts"
import { type Message } from "./otp-field.message.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const OTP_LENGTH = 6

const normalizeValue = (value: string) => value.slice(0, OTP_LENGTH)

export const init = (): UpdateReturn => [
    {
        value: "",
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedOtpFieldValue: ({ value }) => [
                {
                    ...model,
                    value: normalizeValue(value),
                },
                [],
            ],
        })
    )
