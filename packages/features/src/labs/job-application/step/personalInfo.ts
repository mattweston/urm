import {
    Array,
    Duration,
    Effect,
    Match as M,
    Number,
    Option,
    Schema as S,
} from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { CalendarDate } from "foldkit/calendar"
import {
    Field,
    Invalid,
    NotValidated,
    Valid,
    Validating,
    allValid,
    anyInvalid,
    makeRules,
    validate,
} from "foldkit/fieldValidation"
import { Rule } from "foldkit/fieldValidation"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

const PronounsListbox = Ui.Listbox.create<string>()

// MODEL

export const Model = S.Struct({
    firstName: Field(S.String),
    lastName: Field(S.String),
    email: Field(S.String),
    emailValidationId: S.Number,
    phone: Field(S.String),
    pronouns: Ui.Listbox.Model,
    maybeSelectedPronouns: S.Option(S.String),
    customPronouns: S.String,
    portfolioUrl: Field(S.String),
    availableDate: Ui.DatePicker.Model,
    maybeAvailableDate: S.Option(CalendarDate),
})

export type Model = typeof Model.Type

// MESSAGE

export const UpdatedFirstName = taggedStruct("UpdatedFirstName", {
    value: S.String,
})
export const UpdatedLastName = taggedStruct("UpdatedLastName", {
    value: S.String,
})
export const UpdatedEmail = taggedStruct("UpdatedEmail", { value: S.String })
export const ValidatedEmail = taggedStruct("ValidatedEmail", {
    validationId: S.Number,
    field: Field(S.String),
})
export const UpdatedPhone = taggedStruct("UpdatedPhone", { value: S.String })
export const GotPronounsMessage = taggedStruct("GotPronounsMessage", {
    message: Ui.Listbox.Message,
})
export const UpdatedCustomPronouns = taggedStruct("UpdatedCustomPronouns", {
    value: S.String,
})
export const UpdatedPortfolioUrl = taggedStruct("UpdatedPortfolioUrl", {
    value: S.String,
})
export const GotAvailableDateMessage = taggedStruct("GotAvailableDateMessage", {
    message: Ui.DatePicker.Message,
})

export const Message = S.Union([
    UpdatedFirstName,
    UpdatedLastName,
    UpdatedEmail,
    ValidatedEmail,
    UpdatedPhone,
    GotPronounsMessage,
    UpdatedCustomPronouns,
    UpdatedPortfolioUrl,
    GotAvailableDateMessage,
])

export type Message = typeof Message.Type

// INIT

export const init = (today: CalendarDate): Model => ({
    firstName: NotValidated({ value: "" }),
    lastName: NotValidated({ value: "" }),
    email: NotValidated({ value: "" }),
    emailValidationId: 0,
    phone: NotValidated({ value: "" }),
    pronouns: Ui.Listbox.init({ id: "pronouns" }),
    maybeSelectedPronouns: Option.none(),
    customPronouns: "",
    portfolioUrl: NotValidated({ value: "" }),
    availableDate: Ui.DatePicker.init({
        id: "available-date",
        today,
        minDate: today,
    }),
    maybeAvailableDate: Option.none(),
})

// FIELD VALIDATION

const firstNameRules = makeRules({
    required: "First name is required",
    rules: [Rule.minLength(2, "First name must be at least 2 characters")],
})

const lastNameRules = makeRules({
    required: "Last name is required",
})

const emailRules = makeRules({
    required: "Email is required",
    rules: [Rule.email("Please enter a valid email address")],
})

const PHONE_PATTERN = /^\+?[\d\s()-]{7,}$/

const phoneRules = makeRules({
    rules: [Rule.pattern(PHONE_PATTERN, "Please enter a valid phone number")],
})

const portfolioUrlRules = makeRules({
    rules: [
        Rule.url({
            message: "Please enter a valid URL",
            requireProtocol: false,
        }),
    ],
})

const validateFirstName = validate(firstNameRules)
const validateLastName = validate(lastNameRules)
const validateEmail = validate(emailRules)
const validatePhone = validate(phoneRules)
const validatePortfolioUrl = validate(portfolioUrlRules)

// COMMAND

const FAKE_API_DELAY_MS = 600

const TAKEN_EMAILS = [
    "admin@foldkit.dev",
    "test@example.com",
    "demo@foldkit.dev",
]

const isEmailTaken = (emailInput: string): Effect.Effect<boolean> =>
    Effect.gen(function* () {
        yield* Effect.sleep(Duration.millis(FAKE_API_DELAY_MS))
        return Array.contains(TAKEN_EMAILS, emailInput.toLowerCase())
    })

export const ValidateEmailAsync = Command.define("ValidateEmailAsync", {
    args: { emailInput: S.String, validationId: S.Number },
    messages: [ValidatedEmail],
    execute: ({ emailInput, validationId }) =>
        Effect.gen(function* () {
            if (yield* isEmailTaken(emailInput)) {
                return ValidatedEmail({
                    validationId,
                    field: Invalid({
                        value: emailInput,
                        errors: ["This email is already in use"],
                    }),
                })
            }

            return ValidatedEmail({
                validationId,
                field: Valid({ value: emailInput }),
            })
        }),
})

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            UpdatedFirstName: ({ value }) => [
                modifyFields(model, { firstName: () => validateFirstName(value) }),
                [],
            ],

            UpdatedLastName: ({ value }) => [
                modifyFields(model, { lastName: () => validateLastName(value) }),
                [],
            ],

            UpdatedEmail: ({ value }) => {
                const validationId = Number.increment(model.emailValidationId)

                return M.value(validateEmail(value)).pipe(
                    M.withReturnType<UpdateReturn>(),
                    M.tag("Valid", () => [
                        modifyFields(model, {
                            email: () => Validating({ value }),
                            emailValidationId: () => validationId,
                        }),
                        [
                            ValidateEmailAsync({
                                emailInput: value,
                                validationId,
                            }),
                        ],
                    ]),
                    M.orElse((syncResult) => [
                        modifyFields(model, {
                            email: () => syncResult,
                            emailValidationId: () => validationId,
                        }),
                        [],
                    ])
                )
            },

            ValidatedEmail: ({ validationId, field }) => {
                if (validationId === model.emailValidationId) {
                    return [modifyFields(model, { email: () => field }), []]
                }

                return [model, []]
            },

            UpdatedPhone: ({ value }) => [
                modifyFields(model, { phone: () => validatePhone(value) }),
                [],
            ],

            GotPronounsMessage: ({ message: listboxMessage }) => {
                const {
                    model: nextPronouns,
                    commands: listboxCommands = [],
                    outMessage: maybeOutMessage_value,
                } = PronounsListbox.update(model.pronouns, listboxMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                return [
                    modifyFields(model, {
                        pronouns: () => nextPronouns,
                        maybeSelectedPronouns: () =>
                            Option.match(maybeOutMessage, {
                                onNone: () => model.maybeSelectedPronouns,
                                onSome: ({ value }) => Option.some(value),
                            }),
                    }),
                    listboxCommands.map(
                        Command.mapEffect(
                            Effect.map((innerMessage) =>
                                GotPronounsMessage({ message: innerMessage })
                            )
                        )
                    ),
                ]
            },

            UpdatedCustomPronouns: ({ value }) => [
                modifyFields(model, { customPronouns: () => value }),
                [],
            ],

            UpdatedPortfolioUrl: ({ value }) => [
                modifyFields(model, {
                    portfolioUrl: () => validatePortfolioUrl(value),
                }),
                [],
            ],

            GotAvailableDateMessage: ({ message: dateMessage }) => {
                const {
                    model: nextDate,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.DatePicker.update(model.availableDate, dateMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                // The picker is stateless about its selection now; the step
                // model holds it.
                const nextMaybeAvailableDate = Option.match(maybeOutMessage, {
                    onNone: () => model.maybeAvailableDate,
                    onSome: M.type<Ui.DatePicker.OutMessage>().pipe(
                        M.tagsExhaustive({
                            SelectedDate: ({ date }) => Option.some(date),
                            ClearedDate: () => Option.none(),
                            ChangedViewMonth: () => model.maybeAvailableDate,
                        })
                    ),
                })

                return [
                    modifyFields(model, {
                        availableDate: () => nextDate,
                        maybeAvailableDate: () => nextMaybeAvailableDate,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((innerMessage) =>
                                GotAvailableDateMessage({
                                    message: innerMessage,
                                })
                            )
                        )
                    ),
                ]
            },
        })
    )

// VALIDATION SUMMARY

const validatedFields = (model: Model): ReadonlyArray<Field<string>> => [
    model.firstName,
    model.lastName,
    model.email,
    model.phone,
    model.portfolioUrl,
]

export const hasErrors = (model: Model): boolean =>
    anyInvalid(validatedFields(model))

export const isComplete = (model: Model): boolean =>
    allValid([
        [model.firstName, firstNameRules],
        [model.lastName, lastNameRules],
        [model.email, emailRules],
        [model.phone, phoneRules],
        [model.portfolioUrl, portfolioUrlRules],
    ])
