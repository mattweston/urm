import { Match as M, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import {
    Field,
    NotValidated,
    allValid,
    anyInvalid,
    makeRules,
    validate,
} from "foldkit/fieldValidation"
import type { Rules } from "foldkit/fieldValidation"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

const GraduationYearListbox = Ui.Listbox.create<string>()

// FIELD VALIDATION

export const schoolRules: Rules<string> = makeRules({
    required: "School is required",
})

export const degreeRules: Rules<string> = makeRules({
    required: "Degree is required",
})

export const fieldOfStudyRules: Rules<string> = makeRules({
    required: "Field of study is required",
})

const validateSchool = validate(schoolRules)
const validateDegree = validate(degreeRules)
const validateFieldOfStudy = validate(fieldOfStudyRules)

// MODEL

export const Model = S.Struct({
    id: S.String,
    school: Field(S.String),
    degree: Field(S.String),
    fieldOfStudy: Field(S.String),
    graduationYear: S.String,
    graduationYearListbox: Ui.Listbox.Model,
    isCurrentlyEnrolled: S.Boolean,
    gpa: S.String,
})

export type Model = typeof Model.Type

// MESSAGE

export const UpdatedSchool = taggedStruct("UpdatedSchool", { value: S.String })
export const UpdatedDegree = taggedStruct("UpdatedDegree", { value: S.String })
export const UpdatedFieldOfStudy = taggedStruct("UpdatedFieldOfStudy", {
    value: S.String,
})
export const UpdatedGraduationYear = taggedStruct("UpdatedGraduationYear", {
    value: S.String,
})
export const GotGraduationYearListboxMessage = taggedStruct(
    "GotGraduationYearListboxMessage",
    {
        message: Ui.Listbox.Message,
    }
)
export const ToggledIsCurrentlyEnrolled = taggedStruct(
    "ToggledIsCurrentlyEnrolled",
    {
        isChecked: S.Boolean,
    }
)
export const UpdatedGpa = taggedStruct("UpdatedGpa", { value: S.String })

export const Message = S.Union([
    UpdatedSchool,
    UpdatedDegree,
    UpdatedFieldOfStudy,
    UpdatedGraduationYear,
    GotGraduationYearListboxMessage,
    ToggledIsCurrentlyEnrolled,
    UpdatedGpa,
])

export type Message = typeof Message.Type

// INIT

export const init = (entryId: string): Model => ({
    id: entryId,
    school: NotValidated({ value: "" }),
    degree: NotValidated({ value: "" }),
    fieldOfStudy: NotValidated({ value: "" }),
    graduationYear: "",
    graduationYearListbox: Ui.Listbox.init({
        id: `${entryId}-graduation-year`,
    }),
    isCurrentlyEnrolled: false,
    gpa: "",
})

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const mapGraduationYearListboxCommands = (
    commands: ReadonlyArray<Command.Command<Ui.Listbox.Message>>
): ReadonlyArray<Command.Command<Message>> =>
    Command.mapMessages(commands, (message) =>
        GotGraduationYearListboxMessage({ message })
    )

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            UpdatedSchool: ({ value }) => [
                modifyFields(model, { school: () => validateSchool(value) }),
                [],
            ],

            UpdatedDegree: ({ value }) => [
                modifyFields(model, { degree: () => validateDegree(value) }),
                [],
            ],

            UpdatedFieldOfStudy: ({ value }) => [
                modifyFields(model, {
                    fieldOfStudy: () => validateFieldOfStudy(value),
                }),
                [],
            ],

            UpdatedGraduationYear: ({ value }) => [
                modifyFields(model, { graduationYear: () => value }),
                [],
            ],

            GotGraduationYearListboxMessage: ({ message: listboxMessage }) => {
                const {
                    model: nextListbox,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = GraduationYearListbox.update(
                    model.graduationYearListbox,
                    listboxMessage
                )
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                return [
                    modifyFields(model, {
                        graduationYear: () =>
                            Option.match(maybeOutMessage, {
                                onNone: () => model.graduationYear,
                                onSome: ({ value }) => value,
                            }),
                        graduationYearListbox: () => nextListbox,
                    }),
                    mapGraduationYearListboxCommands(commands),
                ]
            },

            ToggledIsCurrentlyEnrolled: ({ isChecked }) => [
                modifyFields(model, { isCurrentlyEnrolled: () => isChecked }),
                [],
            ],

            UpdatedGpa: ({ value }) => [
                modifyFields(model, { gpa: () => value }),
                [],
            ],
        })
    )

// VALIDATION SUMMARY

export const hasErrors = (entry: Model): boolean =>
    anyInvalid([entry.school, entry.degree, entry.fieldOfStudy])

export const isComplete = (entry: Model): boolean =>
    allValid([
        [entry.school, schoolRules],
        [entry.degree, degreeRules],
        [entry.fieldOfStudy, fieldOfStudyRules],
    ])
