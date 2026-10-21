import { Match as M } from "effect"
import { Command } from "foldkit"
import {
    makeRules,
    NotValidated,
    validate,
    Rule,
} from "foldkit/fieldValidation"
import { evo } from "foldkit/struct"
import type { Message } from "./register.message.ts"
import type { Model } from "./register.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const emailRules = makeRules({
    required: "Email is required",
    rules: [Rule.email("Please enter a valid email")],
})

const passwordRules = makeRules({
    required: "Password is required",
})

const validateEmail = validate(emailRules)
const validatePassword = validate(passwordRules)

export const init = (): UpdateReturn => [
    {
        email: NotValidated({ value: "" }),
        password: NotValidated({ value: "" }),
        isSubmitting: false,
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ChangedEmail: ({ value }) => [
                evo(model, {
                    email: () => validateEmail(value),
                }),
                [],
            ],
            ChangedPassword: ({ value }) => [
                evo(model, {
                    password: () => validatePassword(value),
                }),
                [],
            ],
            SubmittedRegister: () => [model, []],
        })
    )
