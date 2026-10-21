import * as Ui from "@foldkit/ui"
import { Array, Match as M, Option } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import {
    GotBasicMessage,
    GotGroupedMessage,
    GotMultiMessage,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"
import type { ListboxItem } from "./item.ts"

const ItemListbox = Ui.Listbox.create<ListboxItem>()
const ItemListboxMulti = Ui.Listbox.Multi.create<ListboxItem>()
const StringListbox = Ui.Listbox.create<string>()

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [
    {
        basic: Ui.Listbox.init({ id: "labs-listbox-basic" }),
        maybeSelectedItem: Option.none(),
        multi: Ui.Listbox.Multi.init({ id: "labs-listbox-multi" }),
        selectedMultiItems: [],
        grouped: Ui.Listbox.init({ id: "labs-listbox-grouped" }),
        maybeSelectedGroupedItem: Option.none(),
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotBasicMessage: ({ message: childMessage }) => {
                const {
                    model: basic,
                    commands = [],
                    outMessage: maybeOut_value,
                } = ItemListbox.update(model.basic, childMessage)
                const maybeOut = Option.fromUndefinedOr(maybeOut_value)

                return [
                    modifyFields(model, {
                        basic: () => basic,
                        maybeSelectedItem: () =>
                            Option.match(maybeOut, {
                                onNone: () => model.maybeSelectedItem,
                                onSome: ({ value }) => Option.some(value),
                            }),
                    }),
                    Command.mapMessages(commands, (message) =>
                        GotBasicMessage({ message })
                    ),
                ]
            },
            GotMultiMessage: ({ message: childMessage }) => {
                const {
                    model: multi,
                    commands = [],
                    outMessage: maybeOut_value,
                } = ItemListboxMulti.update(model.multi, childMessage)
                const maybeOut = Option.fromUndefinedOr(maybeOut_value)

                const selectedMultiItems = Option.match(maybeOut, {
                    onNone: () => model.selectedMultiItems,
                    onSome: ({ value }) =>
                        Array.contains(model.selectedMultiItems, value)
                            ? Array.filter(
                                  model.selectedMultiItems,
                                  (selected) => selected !== value
                              )
                            : Array.append(model.selectedMultiItems, value),
                })
                return [
                    modifyFields(model, {
                        multi: () => multi,
                        selectedMultiItems: () => selectedMultiItems,
                    }),
                    Command.mapMessages(commands, (message) =>
                        GotMultiMessage({ message })
                    ),
                ]
            },
            GotGroupedMessage: ({ message: childMessage }) => {
                const {
                    model: grouped,
                    commands = [],
                    outMessage: maybeOut_value,
                } = StringListbox.update(model.grouped, childMessage)
                const maybeOut = Option.fromUndefinedOr(maybeOut_value)

                return [
                    modifyFields(model, {
                        grouped: () => grouped,
                        maybeSelectedGroupedItem: () =>
                            Option.match(maybeOut, {
                                onNone: () => model.maybeSelectedGroupedItem,
                                onSome: ({ value }) => Option.some(value),
                            }),
                    }),
                    Command.mapMessages(commands, (message) =>
                        GotGroupedMessage({ message })
                    ),
                ]
            },
        })
    )
