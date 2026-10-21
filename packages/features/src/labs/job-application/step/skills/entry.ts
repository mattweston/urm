import { Match as M, Schema as S } from "effect"
import { Command } from "foldkit"
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
import { evo } from "foldkit/struct"

import * as ProficiencyLevel from "../../domain/proficiencyLevel.ts"

// FIELD VALIDATION

export const nameRules: Rules<string> = makeRules({
    required: "Skill name is required",
})

const validateName = validate(nameRules)

// MODEL

export const Model = S.Struct({
    id: S.String,
    name: Field(S.String),
    proficiency: ProficiencyLevel.ProficiencyLevel,
})

export type Model = typeof Model.Type

// MESSAGE

export const UpdatedName = taggedStruct("UpdatedName", { value: S.String })
export const SelectedProficiency = taggedStruct("SelectedProficiency", {
    value: ProficiencyLevel.ProficiencyLevel,
})

export const Message = S.Union([UpdatedName, SelectedProficiency])

export type Message = typeof Message.Type

// INIT

export const init = (entryId: string): Model => ({
    id: entryId,
    name: NotValidated({ value: "" }),
    proficiency: "Intermediate",
})

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            UpdatedName: ({ value }) => [
                evo(model, { name: () => validateName(value) }),
                [],
            ],

            SelectedProficiency: ({ value }) => [
                evo(model, { proficiency: () => value }),
                [],
            ],
        })
    )

// VALIDATION SUMMARY

export const hasErrors = (entry: Model): boolean => anyInvalid([entry.name])

export const isComplete = (entry: Model): boolean =>
    allValid([[entry.name, nameRules]])
