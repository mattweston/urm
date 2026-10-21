import { Array, Match as M, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { CalendarDate } from "foldkit/calendar"
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

// FIELD VALIDATION

export const companyRules: Rules<string> = makeRules({
    required: "Company is required",
})

export const titleRules: Rules<string> = makeRules({
    required: "Job title is required",
})

const validateCompany = validate(companyRules)
const validateTitle = validate(titleRules)

// MODEL

export const Model = S.Struct({
    id: S.String,
    company: Field(S.String),
    title: Field(S.String),
    startDate: Ui.DatePicker.Model,
    maybeStartDate: S.Option(CalendarDate),
    endDate: Ui.DatePicker.Model,
    maybeEndDate: S.Option(CalendarDate),
    isCurrentlyEmployed: S.Boolean,
    description: S.String,
})

export type Model = typeof Model.Type

// MESSAGE

export const UpdatedCompany = taggedStruct("UpdatedCompany", {
    value: S.String,
})
export const UpdatedTitle = taggedStruct("UpdatedTitle", { value: S.String })
export const GotStartDateMessage = taggedStruct("GotStartDateMessage", {
    message: Ui.DatePicker.Message,
})
export const GotEndDateMessage = taggedStruct("GotEndDateMessage", {
    message: Ui.DatePicker.Message,
})
export const ToggledIsCurrentlyEmployed = taggedStruct(
    "ToggledIsCurrentlyEmployed",
    {
        isChecked: S.Boolean,
    }
)
export const UpdatedDescription = taggedStruct("UpdatedDescription", {
    value: S.String,
})

export const Message = S.Union([
    UpdatedCompany,
    UpdatedTitle,
    GotStartDateMessage,
    GotEndDateMessage,
    ToggledIsCurrentlyEmployed,
    UpdatedDescription,
])

export type Message = typeof Message.Type

// INIT

export const init = (entryId: string, today: CalendarDate): Model => ({
    id: entryId,
    company: NotValidated({ value: "" }),
    title: NotValidated({ value: "" }),
    startDate: Ui.DatePicker.init({ id: `${entryId}-start`, today }),
    maybeStartDate: Option.none(),
    endDate: Ui.DatePicker.init({ id: `${entryId}-end`, today }),
    maybeEndDate: Option.none(),
    isCurrentlyEmployed: false,
    description: "",
})

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            UpdatedCompany: ({ value }) => [
                modifyFields(model, { company: () => validateCompany(value) }),
                [],
            ],

            UpdatedTitle: ({ value }) => [
                modifyFields(model, { title: () => validateTitle(value) }),
                [],
            ],

            GotStartDateMessage: ({ message: dateMessage }) => {
                const {
                    model: nextStartDate,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.DatePicker.update(model.startDate, dateMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const mappedCommands = Command.mapMessages(
                    commands,
                    (message) => GotStartDateMessage({ message })
                )

                // The picker no longer stores the selection, so the entry keeps
                // maybeStartDate and mirrors it onto the end picker's minimum.
                const nextModel = Option.match(maybeOutMessage, {
                    onNone: () =>
                        modifyFields(model, { startDate: () => nextStartDate }),
                    onSome: M.type<Ui.DatePicker.OutMessage>().pipe(
                        M.tagsExhaustive({
                            ChangedViewMonth: () =>
                                modifyFields(model, {
                                    startDate: () => nextStartDate,
                                }),
                            SelectedDate: ({ date }) =>
                                modifyFields(model, {
                                    startDate: () => nextStartDate,
                                    maybeStartDate: () => Option.some(date),
                                    endDate: () =>
                                        Ui.DatePicker.reflectMinDate(
                                            model.endDate,
                                            Option.some(date)
                                        ),
                                }),
                            ClearedDate: () =>
                                modifyFields(model, {
                                    startDate: () => nextStartDate,
                                    maybeStartDate: () => Option.none(),
                                    endDate: () =>
                                        Ui.DatePicker.reflectMinDate(
                                            model.endDate,
                                            Option.none()
                                        ),
                                }),
                        })
                    ),
                })

                return [nextModel, mappedCommands]
            },

            GotEndDateMessage: ({ message: dateMessage }) => {
                const {
                    model: nextEndDate,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.DatePicker.update(model.endDate, dateMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const mappedCommands = Command.mapMessages(
                    commands,
                    (message) => GotEndDateMessage({ message })
                )

                const nextModel = Option.match(maybeOutMessage, {
                    onNone: () =>
                        modifyFields(model, { endDate: () => nextEndDate }),
                    onSome: M.type<Ui.DatePicker.OutMessage>().pipe(
                        M.tagsExhaustive({
                            ChangedViewMonth: () =>
                                modifyFields(model, {
                                    endDate: () => nextEndDate,
                                }),
                            SelectedDate: ({ date }) =>
                                modifyFields(model, {
                                    endDate: () => nextEndDate,
                                    maybeEndDate: () => Option.some(date),
                                    startDate: () =>
                                        Ui.DatePicker.reflectMaxDate(
                                            model.startDate,
                                            Option.some(date)
                                        ),
                                }),
                            ClearedDate: () =>
                                modifyFields(model, {
                                    endDate: () => nextEndDate,
                                    maybeEndDate: () => Option.none(),
                                    startDate: () =>
                                        Ui.DatePicker.reflectMaxDate(
                                            model.startDate,
                                            Option.none()
                                        ),
                                }),
                        })
                    ),
                })

                return [nextModel, mappedCommands]
            },

            ToggledIsCurrentlyEmployed: ({ isChecked }) => [
                modifyFields(model, { isCurrentlyEmployed: () => isChecked }),
                [],
            ],

            UpdatedDescription: ({ value }) => [
                modifyFields(model, { description: () => value }),
                [],
            ],
        })
    )

// VALIDATION SUMMARY

export const hasErrors = (entry: Model): boolean =>
    anyInvalid([entry.company, entry.title])

export const isComplete = (entry: Model): boolean =>
    allValid([
        [entry.company, companyRules],
        [entry.title, titleRules],
    ])
