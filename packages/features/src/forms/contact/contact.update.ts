import { Match as M } from "effect"
import { type Command } from "foldkit"
import { NotValidated } from "foldkit/fieldValidation"
import { modifyFields } from "foldkit/struct"
import type { Message } from "./contact.message.ts"
import type { Model } from "./contact.model.ts"
import {
    is_contact_form_valid,
    validate_email,
    validate_message,
    validate_name,
} from "./contact.validation.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const initialModel: Model = {
    name: NotValidated({ value: "" }),
    email: NotValidated({ value: "" }),
    message: NotValidated({ value: "" }),
    ready_for_backend: false,
}

export const init = (): UpdateReturn => [initialModel, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ChangedName: ({ value }) => [
                modifyFields(model, {
                    name: () => validate_name(value),
                    ready_for_backend: () => false,
                }),
                [],
            ],
            ChangedEmail: ({ value }) => [
                modifyFields(model, {
                    email: () => validate_email(value),
                    ready_for_backend: () => false,
                }),
                [],
            ],
            ChangedMessage: ({ value }) => [
                modifyFields(model, {
                    message: () => validate_message(value),
                    ready_for_backend: () => false,
                }),
                [],
            ],
            SubmittedContactForm: () => {
                const validated_model = modifyFields(model, {
                    name: (name) => validate_name(name.value),
                    email: (email) => validate_email(email.value),
                    message: (message) => validate_message(message.value),
                })

                return [
                    modifyFields(validated_model, {
                        ready_for_backend: () =>
                            is_contact_form_valid(validated_model),
                    }),
                    [],
                ]
            },
        })
    )
