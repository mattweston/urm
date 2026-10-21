import { Match as M, Number } from "effect"
import { Command } from "foldkit"
import {
    NotValidated,
    Valid,
    Validating,
    allValid,
    makeRules,
    validate,
} from "foldkit/fieldValidation"
import { Rule } from "foldkit/fieldValidation"
import { modifyFields } from "foldkit/struct"
import { submitForm, validateEmail } from "./form.command.ts"
import { type Message } from "./form.message.ts"
import type { Model } from "./form.model.ts"
import {
    NotSubmitted,
    SubmitError,
    SubmitSuccess,
    Submitting,
} from "./form.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const nameRules = makeRules({
    rules: [Rule.minLength(2, "Name must be at least 2 characters")],
})

const emailRules = makeRules({
    required: "Email is required",
    rules: [Rule.email("Please enter a valid email address")],
})

const validateName = validate(nameRules)
const validateEmailField = validate(emailRules)

const isFormValid = (model: Model): boolean =>
    allValid([
        [model.name, nameRules],
        [model.email, emailRules],
    ])

export const initialModel: Model = {
    name: NotValidated({ value: "" }),
    email: NotValidated({ value: "" }),
    emailValidationId: 0,
    message: NotValidated({ value: "" }),
    submission: NotSubmitted(),
}

export const init = (): UpdateReturn => [initialModel, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedName: ({ value }) => [
                modifyFields(model, {
                    name: () => validateName(value),
                }),
                [],
            ],
            UpdatedEmail: ({ value }) => {
                const field = validateEmailField(value)
                const validationId = Number.increment(model.emailValidationId)

                return M.value(field).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        NotValidated: () => [
                            modifyFields(model, {
                                email: () => field,
                                emailValidationId: () => validationId,
                            }),
                            [],
                        ],
                        Invalid: () => [
                            modifyFields(model, {
                                email: () => field,
                                emailValidationId: () => validationId,
                            }),
                            [],
                        ],
                        Validating: () => [
                            modifyFields(model, {
                                email: () => field,
                                emailValidationId: () => validationId,
                            }),
                            [],
                        ],
                        Valid: () => [
                            modifyFields(model, {
                                email: () => Validating({ value }),
                                emailValidationId: () => validationId,
                            }),
                            [validateEmail(value, validationId)],
                        ],
                    })
                )
            },
            ValidatedEmail: ({ validationId, field }) => {
                if (validationId !== model.emailValidationId) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        email: () => field,
                    }),
                    [],
                ]
            },
            UpdatedMessage: ({ value }) => [
                modifyFields(model, {
                    message: () => Valid({ value }),
                }),
                [],
            ],
            ClickedFormSubmit: () => {
                if (!isFormValid(model)) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        submission: () => Submitting(),
                    }),
                    [
                        submitForm(
                            model.name.value,
                            model.email.value,
                            model.message.value
                        ),
                    ],
                ]
            },
            SubmittedForm: ({ success, name }) =>
                success
                    ? [
                          modifyFields(model, {
                              submission: () =>
                                  SubmitSuccess({
                                      message: `Welcome to the waitlist, ${name}! We'll be in touch soon.`,
                                  }),
                          }),
                          [],
                      ]
                    : [
                          modifyFields(model, {
                              submission: () =>
                                  SubmitError({
                                      error: "Sorry, there was an error adding you to the waitlist. Please try again.",
                                  }),
                          }),
                          [],
                      ],
        })
    )
