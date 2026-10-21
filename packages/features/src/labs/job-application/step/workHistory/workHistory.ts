import { Array, Effect, Match as M, Option, Schema as S, pipe } from "effect"
import { Calendar, Command } from "foldkit"
import { type CalendarDate } from "foldkit/calendar"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

import * as Entry from "./entry.ts"

// MODEL

export const Model = S.Struct({
    entries: S.Array(Entry.Model),
    today: Calendar.CalendarDate,
})

export type Model = typeof Model.Type

// MESSAGE

export const ClickedAddEntry = taggedStruct("ClickedAddEntry")
export const AddedEntry = taggedStruct("AddedEntry", { entryId: S.String })
export const RemovedEntry = taggedStruct("RemovedEntry", { entryId: S.String })
export const GotEntryMessage = taggedStruct("GotEntryMessage", {
    entryId: S.String,
    message: Entry.Message,
})

export const Message = S.Union([
    ClickedAddEntry,
    AddedEntry,
    RemovedEntry,
    GotEntryMessage,
])

export type Message = typeof Message.Type

// INIT

export const init = (today: CalendarDate, initialEntryId: string): Model => ({
    entries: [Entry.init(initialEntryId, today)],
    today,
})

// COMMAND

export const AddEntry = Command.define("AddEntry", {
    messages: [AddedEntry],
    execute: Effect.gen(function* () {
        const entryId = yield* Effect.sync(() => crypto.randomUUID())
        return AddedEntry({ entryId })
    }),
})

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const mapEntryCommands = (
    entryId: string,
    commands: ReadonlyArray<Command.Command<Entry.Message>>
): ReadonlyArray<Command.Command<Message>> =>
    commands.map(
        Command.mapEffect(
            Effect.map((message) => GotEntryMessage({ entryId, message }))
        )
    )

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ClickedAddEntry: () => [model, [AddEntry()]],

            AddedEntry: ({ entryId }) => [
                modifyFields(model, {
                    entries: () => [
                        ...model.entries,
                        Entry.init(entryId, model.today),
                    ],
                }),
                [],
            ],

            RemovedEntry: ({ entryId }) => [
                modifyFields(model, {
                    entries: () =>
                        Array.filter(
                            model.entries,
                            (entry) => entry.id !== entryId
                        ),
                }),
                [],
            ],

            GotEntryMessage: ({ entryId, message: entryMessage }) =>
                pipe(
                    model.entries,
                    Array.findFirst((entry) => entry.id === entryId),
                    Option.match({
                        onNone: () => [model, []],
                        onSome: (matchedEntry) => {
                            const [nextEntry, entryCommands] = Entry.update(
                                matchedEntry,
                                entryMessage
                            )

                            return [
                                modifyFields(model, {
                                    entries: () =>
                                        Array.map(model.entries, (entry) =>
                                            entry.id === entryId
                                                ? nextEntry
                                                : entry
                                        ),
                                }),
                                mapEntryCommands(entryId, entryCommands),
                            ]
                        },
                    })
                ),
        })
    )

// VALIDATION SUMMARY

export const hasErrors = (model: Model): boolean =>
    Array.some(model.entries, Entry.hasErrors)

export const isComplete = (model: Model): boolean =>
    Array.isReadonlyArrayNonEmpty(model.entries) &&
    Array.every(model.entries, Entry.isComplete)
